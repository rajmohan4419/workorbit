const INFOSYS_EXCHANGE_FILINGS = 'https://www.infosys.com/investors/reports-filings/exchange-filings.html'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function clean(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

function parseInfosysFilings(html: string) {
  const records: Array<Record<string, string>> = []
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]
    const title = clean(match[2])
    if (!title || !href || /^(Read More|More)$/i.test(title)) continue

    const start = Math.max(0, (match.index ?? 0) - 900)
    const end = Math.min(html.length, (match.index ?? 0) + match[0].length + 1600)
    const context = clean(html.slice(start, end))
    const dateMatch = context.match(datePattern)
    if (!dateMatch) continue

    const url = new URL(href, INFOSYS_EXCHANGE_FILINGS).toString()
    const publishedAt = new Date(dateMatch[0]).toISOString()

    records.push({
      issuer: 'Infosys Limited',
      identifiers: [{ value: 'INFY', type: 'SYMBOL', exchange: 'NSE', issuer: 'Infosys Limited' }],
      type: /board meeting/i.test(title) ? 'board' : /financial results|auditor|quarterly|annual report/i.test(title) ? 'results' : /shareholding/i.test(title) ? 'shareholding' : /allotment|transfer|liquidat|appointment|retirement|regulation 30/i.test(title) ? 'corporate_action' : 'other',
      status: 'PUBLISHED',
      title,
      publishedAt,
      url,
      provider: 'Infosys primary exchange-filings page'
    })
  }

  const unique = new Map(records.map(item => [item.url + '|' + item.publishedAt, item]))
  return Array.from(unique.values()).slice(0, 20)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const query = String(body?.query ?? '').trim().toUpperCase()
    if (!['INFY', 'INFOSYS', 'INFOSYS LIMITED'].includes(query)) {
      return new Response(JSON.stringify({ error: 'Unsupported research entity' }), { status: 400, headers: corsHeaders })
    }

    const response = await fetch(INFOSYS_EXCHANGE_FILINGS, {
      headers: { 'User-Agent': 'OrbitBoard Market Lab research connector' }
    })
    if (!response.ok) throw new Error('Infosys filing source returned HTTP ' + response.status)

    const html = await response.text()
    const records = parseInfosysFilings(html)

    return new Response(JSON.stringify({
      entity: { issuer: 'Infosys Limited', symbol: 'INFY', exchange: 'NSE' },
      source: {
        id: 'infosys-primary-filings',
        provider: 'Infosys primary exchange-filings page',
        trust: 'PRIMARY',
        url: INFOSYS_EXCHANGE_FILINGS
      },
      records,
      retrievedAt: new Date().toISOString(),
      warnings: records.length ? [] : ['No dated filing records could be parsed from the source page.']
    }), { headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 502, headers: corsHeaders })
  }
})
