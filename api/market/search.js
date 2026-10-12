import yahooFinance from 'yahoo-finance2';
import {
  getCorsHeaders,
  getClientIp,
  rateLimiter,
  validateQuery,
} from '../_lib/common.js';

export async function handleSearch(q) {
  const cleaned = validateQuery(q);
  if (!cleaned) {
    return [];
  }

  try {
    const searchRes = await yahooFinance.search(cleaned);
    const rawQuotes = searchRes?.quotes || [];

    let results = [];
    for (const quote of rawQuotes) {
      if (!quote || typeof quote !== 'object') continue;
      const symbol = quote.symbol;
      if (!symbol) continue;

      const name = quote.longname || quote.shortname || symbol;
      const exchange = quote.exchDisp || quote.exchange || '';

      results.push({
        symbol: String(symbol),
        name: String(name),
        exchange: String(exchange),
      });
    }

    // Prioritize Indian listings (.NS, .BO) if query does not explicitly specify a dot extension
    if (!cleaned.includes('.')) {
      const indianResults = results.filter(
        (r) => r.symbol.endsWith('.NS') || r.symbol.endsWith('.BO')
      );
      const otherResults = results.filter(
        (r) => !(r.symbol.endsWith('.NS') || r.symbol.endsWith('.BO'))
      );
      results = [...indianResults, ...otherResults];
    }

    return results.slice(0, 10);
  } catch (err) {
    console.error('[SEARCH ERROR]', err);
    return [];
  }
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
  if (rateLimiter.isRateLimited(clientIp, 'search', 20, 60)) {
    res.writeHead(429, corsHeaders);
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const qVal = url.searchParams.get('q') || '';

  const results = await handleSearch(qVal);

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify(results));
}
