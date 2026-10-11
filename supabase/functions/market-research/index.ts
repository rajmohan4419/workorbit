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
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '')
}

function indexQuoteRecords(row: Record<string, unknown>, index: { name: string; url: string; type: string }, retrievedAt: string, source: { id: string; provider: string; trust: string; url: string }) {
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
      notes: 'Captured from an official NSE index endpoint; verification remains explicit in Market Lab.'
    }))
}


function extractSetCookies(headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof extended.getSetCookie === 'function') return extended.getSetCookie()

  const raw = headers.get('set-cookie') ?? ''
  if (!raw) return []
  return raw.split(/,(?=[^;,=]+=[^;,]+)/).map(value => value.trim()).filter(Boolean)
}

function mergeCookies(existing: string[], headers: Headers) {
  const jar = new Map(existing.map(cookie => [cookie.split('=')[0], cookie]))
  for (const cookie of extractSetCookies(headers)) {
    const pair = cookie.split(';', 1)[0]
    const name = pair.split('=', 1)[0]
    if (name) jar.set(name, pair)
  }
  return Array.from(jar.values())
}

async function fetchNseAllIndices() {
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
  const browserHeaders = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1'
  }

  let cookies: string[] = []
  const homeResponse = await fetch('https://www.nseindia.com/', { headers: browserHeaders })
  cookies = mergeCookies(cookies, homeResponse.headers)
  await homeResponse.text()

  // NSE's public API commonly expects a warmed browser session, not only a User-Agent.
  // Visit the live-indices page with the same cookie jar before calling /api/allIndices.
  const pageResponse = await fetch('https://www.nseindia.com/market-data/live-market-indices/heatmap', {
    headers: {
      ...browserHeaders,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(cookies.length ? { Cookie: cookies.join('; ') } : {})
    }
  })
  cookies = mergeCookies(cookies, pageResponse.headers)
  await pageResponse.text()

  const apiResponse = await fetch('https://www.nseindia.com/api/allIndices', {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate',
      'Referer': 'https://www.nseindia.com/market-data/live-market-indices/heatmap',
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookies.length ? { Cookie: cookies.join('; ') } : {})
    }
  })

  return apiResponse
}

function parseNseAllIndices(payload: unknown, index: { name: string; url: string; type: string }, retrievedAt: string) {
  const rows = Array.isArray((payload as { data?: unknown[] })?.data) ? (payload as { data: unknown[] }).data : []
  const wanted = normalizeIndexName(index.name)
  const row = rows.find(item => {
    const record = item as Record<string, unknown>
    return normalizeIndexName(record.index) === wanted
  }) as Record<string, unknown> | undefined

  if (!row) return []

  return indexQuoteRecords(row, index, retrievedAt, {
    id: 'nse-all-indices',
    provider: 'NSE India all-indices endpoint',
    trust: 'PRIMARY',
    url: 'https://www.nseindia.com/api/allIndices'
  })
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

  return indexQuoteRecords(row, index, retrievedAt, {
    id: 'nse-indices-live-feed',
    provider: 'NSE Indices live index feed',
    trust: 'PRIMARY',
    url: LIVE_INDEX_FEED
  })
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
    let records: Array<Record<string, unknown>> = []
    let nseStatus = 0
    let sourceId = 'nse-all-indices'
    let sourceProvider = 'NSE India all-indices endpoint'
    let sourceUrl = 'https://www.nseindia.com/api/allIndices'

    try {
      const nseResponse = await fetchNseAllIndices()
      nseStatus = nseResponse.status
      if (nseResponse.ok) {
        const payload = await nseResponse.json()
        records = parseNseAllIndices(payload, index, retrievedAt)
      }
    } catch (error) {
      nseStatus = 599
    }

    if (!records.length) {
      const feedResponse = await fetch(LIVE_INDEX_FEED, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OrbitBoard Market Lab)',
          'Referer': 'https://www.niftyindices.com/'
        }
      })
      if (!feedResponse.ok) throw new Error('NSE index sources returned HTTP ' + nseStatus + ' and live feed HTTP ' + feedResponse.status)
      const payload = await feedResponse.json()
      records = parseLiveIndexFeed(payload, index, retrievedAt)
      sourceId = 'nse-indices-live-feed'
      sourceProvider = 'NSE Indices live index feed'
      sourceUrl = LIVE_INDEX_FEED
    }

    if (!records.length) throw new Error(index.name + ' was not found in the official NSE index sources')

    return new Response(JSON.stringify({
      entity: { issuer: index.name, symbol: query, exchange: 'NSE', entityType: 'INDEX', indexType: index.type },
      source: {
        id: sourceId,
        provider: sourceProvider,
        trust: 'PRIMARY',
        url: sourceUrl
      },
      records,
      retrievedAt,
      warnings: []
    }), { headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 502, headers: corsHeaders })
  }
})
