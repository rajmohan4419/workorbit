import {
  getCorsHeaders,
  getClientIp,
  validateQuery,
} from '../_lib/common.js';
import { checkRateLimit } from '../_lib/supabaseClient.js';

export async function handleSearch(q) {
  const cleaned = validateQuery(q);
  if (!cleaned) {
    return {
      status: 200,
      data: [],
    };
  }

  // Currently no external live search provider is configured after Yahoo Finance exclusion.
  // Per requirements: Return a documented JSON error indicating that stock search is unavailable.
  // Do not create fake production search results.
  return {
    status: 503,
    data: {
      error: 'Stock search provider is currently unavailable.',
      code: 'PROVIDER_UNAVAILABLE',
      message: 'No live market-data search provider is configured in Phase 1.',
    },
  };
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
  const isLimited = await checkRateLimit(clientIp, 'search', 20, 60);
  if (isLimited) {
    res.writeHead(429, corsHeaders);
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const qVal = url.searchParams.get('q') || '';

  const { status, data } = await handleSearch(qVal);

  const headers = {
    ...corsHeaders,
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  };

  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}
