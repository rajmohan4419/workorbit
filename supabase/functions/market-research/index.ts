const INFOSYS_EXCHANGE_FILINGS = 'https://www.infosys.com/investors/reports-filings/exchange-filings.html'

const INDEX_SOURCES: Record<string, { name: string; url: string; type: string }> = {
  NIFTY50: { name: 'Nifty 50', url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY--50', type: 'BROAD_MARKET' },
  NIFTYNEXT50: { name: 'Nifty Next 50', url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-Next-50', type: 'BROAD_MARKET' },
  NIFTY100: { name: 'Nifty 100', url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-100', type: 'BROAD_MARKET' },
  NIFTY200: { name: 'Nifty 200', url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-200', type: 'BROAD_MARKET' },
  NIFTY500: { name: 'Nifty 500', url: 'https://www.niftyindices.com/indices/equity/broad-based-indices/nifty-500', type: 'BROAD_MARKET' },
  NIFTYBANK: { name: 'Nifty Bank', url: 'https://www.niftyindices.com/indices/equity/sectoral-indices/nifty-bank', type: 'SECTORAL' },
  NIFTYIT: { name: 'Nifty IT', url: 'https://www.niftyindices.com/indices/equity/sectoral-indices/nifty-it', type: 'SECTORAL' }
}

const LIVE_INDEX_FEED = 'https://iislliveblob.niftyindices.com/jsonfiles/LiveIndicesWatch.json'

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

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeIndexName(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/\\s+/g, ' ')
}

function parseLiveIndexFeed(payload: unknown, index: { name: string; url: string; type: string }, retrievedAt: string) {
  const rows = Array.isArray((payload as { data?: unknown[] })?.data)
    ? (payload as { data: unknown[] }).data
    : Array.isArray(payload) ? payload : []

  const wanted = normalizeIndexName(index.name)
  const row = rows.find(item => {
    const record = item as Record<string, unknown>
    return normalizeIndexName(record.indexName ?? record.indexSymbol ?? record.index) === wanted
  }) as Record<string, unknown> | undefined

  if (!row) return []

  const source = {
    id: 'nse-indices-live-feed',
    provider: 'NSE Indices live index feed',
    trust: 'PRIMARY',
    url: LIVE_INDEX_FEED
  }

  const period = { asOf: retrievedAt }
  const values: Array<{ metric: string; label: string; value: number | null; unit: string }> = [
    { metric: 'index_level', label: index.name + ' level', value: toNumber(row.last ?? row.lastPrice), unit: 'INDEX_POINTS' },
    { metric: 'daily_change', label: index.name + ' daily change', value: toNumber(row.variation ?? row.change), unit: 'INDEX_POINTS' },
    { metric: 'daily_return', label: index.name + ' daily change %', value: toNumber(row.percentChange ?? row.pChange), unit: '%' },
    { metric: 'open', label: index.name + ' open', value: toNumber(row.open), unit: 'INDEX_POINTS' },
    { metric: 'high', label: index.name + ' high', value: toNumber(row.high), unit: 'INDEX_POINTS' },
    { metric: 'low', label: index.name + ' low', value: toNumber(row.low), unit: 'INDEX_POINTS' },
    { metric: 'previous_close', label: index.name + ' previous close', value: toNumber(row.previousClose), unit: 'INDEX_POINTS' }
  ]

  return values
    .filter(item => item.value !== null)
    .map(item => ({
      metric: item.metric,
      label: item.label,
      value: item.value,
      unit: item.unit,
      period,
      source,
      retrievedAt,
      publishedAt: null,
      notes: 'Captured from the official NSE Indices live feed; verification remains explicit in Market Lab.'
    }))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const query = String(body?.query ?? '').trim().toUpperCase()

    if (['INFY', 'INFOSYS', 'INFOSYS LIMITED'].includes(query)) {
      const response = await fetch(INFOSYS_EXCHANGE_FILINGS, {
        headers: { 'User-Agent': 'OrbitBoard Market Lab research connector' }
      })
      if (!response.ok) throw new Error('Infosys filing source returned HTTP ' + response.status)

      const html = await response.text()
      const records = parseInfosysFilings(html)

      return new Response(JSON.stringify({
        entity: { issuer: 'Infosys Limited', symbol: 'INFY', exchange: 'NSE', entityType: 'SECURITY' },
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
    }

    const index = INDEX_SOURCES[query]
    if (!index) {
      return new Response(JSON.stringify({ error: 'Unsupported research entity' }), { status: 400, headers: corsHeaders })
    }

    const retrievedAt = new Date().toISOString()
    const response = await fetch(LIVE_INDEX_FEED, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OrbitBoard Market Lab)',
        'Referer': 'https://www.niftyindices.com/'
      }
    })
    if (!response.ok) throw new Error('NSE Indices live feed returned HTTP ' + response.status)

    const payload = await response.json()
    const records = parseLiveIndexFeed(payload, index, retrievedAt)
    if (!records.length) throw new Error(index.name + ' was not found in the official NSE Indices live feed')

    return new Response(JSON.stringify({
      entity: { issuer: index.name, symbol: query, exchange: 'NSE', entityType: 'INDEX', indexType: index.type },
      source: {
        id: 'nse-indices-live-feed',
        provider: 'NSE Indices live index feed',
        trust: 'PRIMARY',
        url: LIVE_INDEX_FEED
      },
      records,
      retrievedAt,
      warnings: []
    }), { headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 502, headers: corsHeaders })
  }
})
