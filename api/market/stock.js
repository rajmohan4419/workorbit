import {
  getCorsHeaders,
  getClientIp,
  validateSymbol,
} from '../_lib/common.js';
import { computeStatistics } from '../_lib/stats.js';
import {
  checkRateLimit,
  getMarketCache,
  setMarketCache,
} from '../_lib/supabaseClient.js';

const VALID_RANGES = ['1mo', '6mo', '1y', '5y'];

const PROVIDER_KEY = globalThis.process?.env?.FINNHUB_API_KEY; // set in Vercel environment

async function fetchQuote(symbol) {
  const r = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${PROVIDER_KEY}`
  );
  if (!r.ok) throw new Error(`Finnhub quote ${r.status}`);
  const q = await r.json();
  if (!q.c) return null; // Finnhub returns zeros for unknown symbols
  return { price: q.c, change: q.d, changePct: q.dp, high: q.h, low: q.l, open: q.o, prevClose: q.pc };
}

export async function fetchStockData(symbol, rangePeriod = '1y') {
  const sym = symbol.toUpperCase();
  const cacheKey = `stock:${sym}:${rangePeriod}`;
  const cached = await getMarketCache(cacheKey);
  if (cached) return cached;

  if (!PROVIDER_KEY) {
    return {
      error: 'Market data provider is not configured.',
      code: 'PROVIDER_UNAVAILABLE',
      symbol: sym,
      quote: null, history: [], news: [],
      events: { earnings: [], dividends: [], splits: [] },
      stats: computeStatistics(null, []),
      asOf: new Date().toISOString(),
      delayed: true,
      data_availability: { quote: false, history: false, news: false, events: false },
    };
  }

  const quote = await fetchQuote(sym);
  const responseData = {
    symbol: sym,
    quote,
    history: [],          // add a history call here later
    news: [],
    events: { earnings: [], dividends: [], splits: [] },
    stats: computeStatistics(null, []),
    asOf: new Date().toISOString(),
    delayed: true,
    data_availability: { quote: !!quote, history: false, news: false, events: false },
  };

  await setMarketCache(cacheKey, responseData, 60); // 60s TTL
  return responseData;
}

export default async function handler(req, res) {
  const origin = req.headers?.origin;
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const clientIp = getClientIp(req);
  const isLimited = await checkRateLimit(clientIp, 'stock', 20, 60, { failClosed: true });
  if (isLimited) {
    res.writeHead(429, corsHeaders);
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const symbolVal = url.searchParams.get('symbol') || '';
  let rangeVal = url.searchParams.get('range') || '1y';

  if (!validateSymbol(symbolVal)) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ error: 'Invalid or missing symbol' }));
    return;
  }

  if (!VALID_RANGES.includes(rangeVal)) {
    rangeVal = '1y';
  }

  try {
    const data = await fetchStockData(symbolVal, rangeVal);
    const statusCode = data.code === 'PROVIDER_UNAVAILABLE' ? 503 : 200;

    res.writeHead(statusCode, corsHeaders);
    res.end(JSON.stringify(data));
  } catch (e) {
    console.error(`[STOCK ENDPOINT ERROR] ${symbolVal}:`, e);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: 'Failed to retrieve stock data' }));
  }
}
