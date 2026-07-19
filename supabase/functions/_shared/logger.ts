// supabase/functions/_shared/logger.ts
//
// Sends structured logs from any Edge Function to Grafana Cloud via the
// OTLP/HTTP JSON endpoint. Deliberately dependency-free (no OTel SDK) since
// Edge Functions are stateless, one-shot invocations.
//
// Required secrets (set once via `supabase secrets set`):
//   GRAFANA_OTLP_ENDPOINT  e.g. https://otlp-gateway-prod-ap-south-1.grafana.net/otlp/v1/logs
//   GRAFANA_OTLP_AUTH      the full header value, e.g. "Basic <base64token>"
//
// Usage:
//   import { logToGrafana } from '../_shared/logger.ts'
//   await logToGrafana('error', 'invite-member', 'Invitation not found', { inviteId })

type LogLevel = 'info' | 'warn' | 'error'

export async function logToGrafana(
  level: LogLevel,
  fn: string,
  message: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const endpoint = Deno.env.get('GRAFANA_OTLP_ENDPOINT')
  const authHeader = Deno.env.get('GRAFANA_OTLP_AUTH')

  // Never let missing config break the caller — just skip logging.
  if (!endpoint || !authHeader) {
    console.log(`[${level}] ${fn}: ${message}`, meta)
    return
  }

  const body = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'orbitboard-functions' } },
          ],
        },
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: (Date.now() * 1_000_000).toString(),
                severityText: level.toUpperCase(),
                body: { stringValue: message },
                attributes: [
                  { key: 'function', value: { stringValue: fn } },
                  ...Object.entries(meta).map(([k, v]) => ({
                    key: k,
                    value: { stringValue: safeStringify(v) },
                  })),
                ],
              },
            ],
          },
        ],
      },
    ],
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (_err) {
    // Swallow errors — a logging outage must never fail the actual request.
    // Falls back to Supabase's own function logs so it's not silent.
    console.error(`[logToGrafana] failed to ship log: ${message}`)
  }
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

// Redacts an email before it leaves your infra for a third-party log sink.
// "jane.doe@company.com" -> "j***@company.com"
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return 'unknown'
  const [local, domain] = email.split('@')
  return `${local[0] ?? ''}***@${domain}`
}
