const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const CATALOG = [
  { name: 'Infosys Limited', aliases: ['Infosys', 'INFY'], symbol: 'INFY', exchange: 'NSE', market: 'IN', assetType: 'STOCKS', currency: 'INR' },
  { name: 'Nifty 50', aliases: ['Nifty', 'Nifty 50', 'NIFTY50'], symbol: 'NIFTY50', exchange: 'NSE', market: 'IN', assetType: 'INDICES', currency: 'INDEX_POINTS' },
  { name: 'Nifty Bank', aliases: ['Bank Nifty', 'Nifty Bank', 'NIFTYBANK'], symbol: 'NIFTYBANK', exchange: 'NSE', market: 'IN', assetType: 'INDICES', currency: 'INDEX_POINTS' },
  { name: 'Nifty IT', aliases: ['Nifty IT', 'NIFTYIT'], symbol: 'NIFTYIT', exchange: 'NSE', market: 'IN', assetType: 'INDICES', currency: 'INDEX_POINTS' }
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405)

  try {
    const body = await request.json()
    const query = String(body?.query ?? '').trim()
    const market = String(body?.market ?? 'IN').toUpperCase()
    const exchange = String(body?.exchange ?? 'NSE').toUpperCase()
    const assetType = String(body?.assetType ?? 'STOCKS').toUpperCase()

    if (!query || query.length > 120) return json({ error: 'Enter a company name or ticker (maximum 120 characters).' }, 400)
    if (market !== 'IN' || exchange !== 'NSE' || !['STOCKS', 'INDICES'].includes(assetType)) {
      return json({ error: 'Only India / NSE stocks and supported indices are enabled in this pilot.' }, 400)
    }

    const exact = CATALOG.find(item =>
      item.market === market && item.exchange === exchange && item.assetType === assetType &&
      [item.name, item.symbol, ...item.aliases].some(alias => normalize(alias) === normalize(query))
    )
    if (exact) return json({ status: 'MATCHED', instrument: exact, resolution: 'CATALOG_EXACT' })

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return json({
      status: 'CONFIGURATION_REQUIRED',
      error: 'Name search is not configured yet. Add GEMINI_API_KEY as a Supabase Edge Function secret.',
      matches: []
    }, 503)

    const prompt = [
      'You resolve user queries into possible Indian listed instruments. You are not an authoritative exchange listing source.',
      'Return JSON only with shape {"candidates":[{"name":"...","symbol":"...","exchange":"NSE|BSE|UNKNOWN","assetType":"STOCKS|INDICES|UNKNOWN","reason":"short explanation"}]}.',
      'Return at most 3 candidates. Never invent certainty. If ambiguous, return multiple candidates. Do not provide investment advice.',
      'Selected market: India. Selected exchange: ' + exchange + '. Selected asset type: ' + assetType + '.',
      'User query: ' + query
    ].join('\n')

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(12000)
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('[resolve-market-instrument] Gemini request failed', response.status, detail.slice(0, 300))
      return json({ status: 'PROVIDER_ERROR', error: 'Instrument name search is temporarily unavailable.', matches: [] }, 502)
    }

    const payload = await response.json()
    const raw = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('')
    let parsed: { candidates?: Array<Record<string, unknown>> }
    try { parsed = JSON.parse(raw ?? '{}') } catch { return json({ status: 'INVALID_PROVIDER_RESPONSE', error: 'Name search returned an unreadable result.', matches: [] }, 502) }

    const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : [])
      .filter(candidate => candidate.name && candidate.symbol && String(candidate.exchange).toUpperCase() === exchange && String(candidate.assetType).toUpperCase() === assetType)
      .slice(0, 3)
      .map(candidate => ({
        name: String(candidate.name).slice(0, 120),
        symbol: String(candidate.symbol).toUpperCase().slice(0, 32),
        exchange,
        market,
        assetType,
        reason: String(candidate.reason ?? 'Suggested by Gemini; listing not yet verified.').slice(0, 240),
        verified: false
      }))

    return json({
      status: candidates.length ? 'CANDIDATES_UNVERIFIED' : 'NO_MATCH',
      message: candidates.length
        ? 'These are suggestions only. Confirm the exact listing against a trusted exchange instrument directory before research.'
        : 'No likely match was returned. Try the company’s full legal name or ticker.',
      matches: candidates
    })
  } catch (error) {
    console.error('[resolve-market-instrument] request failed', error)
    return json({ error: 'Name search failed safely. Please try again.' }, 500)
  }
})
