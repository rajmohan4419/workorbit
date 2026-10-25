// supabase/functions/client-logs/index.ts
//
// Proxies frontend log batches (Loki push-API shape) to Grafana Loki.
// The browser never sees LOKI_URL / LOKI_USER / LOKI_TOKEN — those live
// only as Edge Function secrets. This replaces the old approach of
// reading VITE_LOKI_* env vars directly in the client bundle, which
// shipped the Loki auth token to anyone who opened dev tools.
//
// Required secrets (set once via `supabase secrets set`):
//   LOKI_URL     e.g. https://logs-prod-xxx.grafana.net (no trailing /loki/...)
//   LOKI_USER    Grafana Cloud tenant/user id for basic auth (optional if LOKI_TOKEN is a bearer token)
//   LOKI_TOKEN   API token / password
//   LOKI_TENANT_ID  optional, sets X-Scope-OrgID for multi-tenant Loki
//
// The client calls this via supabase.functions.invoke('client-logs', { body: payload })
// (or a raw keepalive fetch on page unload — see loggerService.js).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hard caps so a runaway client (or a bad actor with just the anon key)
// can't use this endpoint to flood Loki or rack up ingestion cost.
const MAX_STREAMS = 10
const MAX_VALUES_PER_STREAM = 200
const MAX_LINE_LENGTH = 4000
const MAX_BODY_BYTES = 300_000

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// Inlined (rather than imported from ../_shared/logger.ts) because the
// deploy bundler resolves each function in isolation and can't reach
// outside its own source directory for a relative sibling import.
async function logToGrafana(
  level: 'info' | 'warn' | 'error',
  fn: string,
  message: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const endpoint = Deno.env.get('GRAFANA_OTLP_ENDPOINT')
  const authHeader = Deno.env.get('GRAFANA_OTLP_AUTH')
  if (!endpoint || !authHeader) {
    console.log(`[${level}] ${fn}: ${message}`, meta)
    return
  }
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceLogs: [{
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'orbitboard-functions' } }] },
          scopeLogs: [{
            logRecords: [{
              timeUnixNano: (Date.now() * 1_000_000).toString(),
              severityText: level.toUpperCase(),
              body: { stringValue: message },
              attributes: [
                { key: 'function', value: { stringValue: fn } },
                ...Object.entries(meta).map(([k, v]) => ({
                  key: k,
                  value: { stringValue: typeof v === 'string' ? v : JSON.stringify(v) },
                })),
              ],
            }],
          }],
        }],
      }),
    })
  } catch (_err) {
    console.error(`[logToGrafana] failed to ship log: ${message}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Reject oversized payloads before touching them.
    const contentLength = Number(req.headers.get('content-length') ?? '0')
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Payload too large' }, 413)
    }

    // We still want to know *who* is logging (or "anonymous" pre-login),
    // but we don't hard-fail unauthenticated requests — logging must work
    // from the public auth pages too. Supabase's function gateway already
    // requires a valid anon/user JWT via the apikey/Authorization headers
    // before the request reaches this code, so this is just for context.
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data } = await authClient.auth.getUser()
        userId = data?.user?.id ?? null
      } catch {
        // Non-fatal — proceed without a user id attached.
      }
    }

    const payload = await req.json().catch(() => null)
    const streams = payload?.streams
    if (!Array.isArray(streams) || streams.length === 0) {
      return jsonResponse({ error: 'Missing or empty "streams" array' }, 400)
    }
    if (streams.length > MAX_STREAMS) {
      return jsonResponse({ error: 'Too many streams in one batch' }, 400)
    }

    // Sanitize: cap values per stream, cap line length, and stamp a
    // server-verified user id onto each stream's labels (client-supplied
    // labels are otherwise untrusted).
    const sanitizedStreams = streams.slice(0, MAX_STREAMS).map((s: any) => ({
      stream: {
        app: 'orbitboard',
        source: 'frontend',
        level: typeof s?.stream?.level === 'string' ? s.stream.level : 'info',
        env: typeof s?.stream?.env === 'string' ? s.stream.env : 'production',
        user_id: userId ?? 'anonymous',
      },
      values: Array.isArray(s?.values)
        ? s.values
            .slice(0, MAX_VALUES_PER_STREAM)
            .filter((v: unknown) => Array.isArray(v) && v.length === 2)
            .map(([ts, line]: [string, string]) => [
              String(ts),
              String(line).slice(0, MAX_LINE_LENGTH),
            ])
        : [],
    })).filter((s) => s.values.length > 0)

    if (sanitizedStreams.length === 0) {
      return jsonResponse({ error: 'No valid log entries after sanitization' }, 400)
    }

    const LOKI_URL = Deno.env.get('LOKI_URL')
    const LOKI_USER = Deno.env.get('LOKI_USER')
    const LOKI_TOKEN = Deno.env.get('LOKI_TOKEN')
    const LOKI_TENANT_ID = Deno.env.get('LOKI_TENANT_ID')

    if (!LOKI_URL || !LOKI_TOKEN) {
      // Don't error the client over a missing/misconfigured log sink —
      // just drop the batch server-side and note it in our own logs.
      await logToGrafana('warn', 'client-logs', 'Loki not configured, dropping client log batch', {})
      return jsonResponse({ ok: true, shipped: false })
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (LOKI_USER) {
      headers['Authorization'] = `Basic ${btoa(`${LOKI_USER}:${LOKI_TOKEN}`)}`
    } else {
      headers['Authorization'] = LOKI_TOKEN.startsWith('Bearer ') || LOKI_TOKEN.startsWith('Basic ')
        ? LOKI_TOKEN
        : `Bearer ${LOKI_TOKEN}`
    }
    if (LOKI_TENANT_ID) {
      headers['X-Scope-OrgID'] = LOKI_TENANT_ID
    }

    const pushUrl = `${LOKI_URL.replace(/\/$/, '')}/loki/api/v1/push`
    const lokiResponse = await fetch(pushUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ streams: sanitizedStreams }),
    })

    if (!lokiResponse.ok) {
      const errorText = await lokiResponse.text().catch(() => '')
      await logToGrafana('error', 'client-logs', 'Loki push failed', {
        status: lokiResponse.status,
        errorText: errorText.slice(0, 500),
      })
      // Still 200 to the browser — a logging outage should never surface
      // as a user-facing error or trigger client-side retry storms.
      return jsonResponse({ ok: true, shipped: false })
    }

    return jsonResponse({ ok: true, shipped: true })
  } catch (error) {
    await logToGrafana('error', 'client-logs', 'Unhandled function error', { error: error.message })
    // Same principle: never fail hard on the logging pipe.
    return jsonResponse({ ok: true, shipped: false })
  }
})
