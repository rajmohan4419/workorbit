import {
  getCorsHeaders,
  getClientIp,
  validateSymbol,
} from '../_lib/common.js';
import { computeStatistics } from '../_lib/stats.js';
import { checkRateLimit, getMarketCache } from '../_lib/supabaseClient.js';

const VALID_RANGES = ['1mo', '6mo', '1y', '5y'];

export async function fetchStockData(symbol, rangePeriod = '1y') {
  const cacheKey = `stock:${symbol.toUpperCase()}:${rangePeriod}`;
  const cachedData = await getMarketCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Currently no live provider is configured (Yahoo Finance excluded).
  // Per requirements: Return explicit unavailable-data response indicating provider is unconfigured.
  const responseData = {
    error: 'Market data provider is currently unavailable.',
    code: 'PROVIDER_UNAVAILABLE',
    symbol: symbol.toUpperCase(),
    quote: null,
    history: [],
    news: [],
    events: { earnings: [], dividends: [], splits: [] },
    stats: computeStatistics(null, []),
    asOf: new Date().toISOString(),
    delayed: true,
    data_availability: {
      quote: false,
      history: false,
      news: false,
      events: false,
    },
  };

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
  const isLimited = await checkRateLimit(clientIp, 'stock', 20, 60);
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
