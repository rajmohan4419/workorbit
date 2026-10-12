import yahooFinance from 'yahoo-finance2';
import {
  cacheManager,
  getCorsHeaders,
  getClientIp,
  rateLimiter,
  validateSymbol,
} from '../_lib/common.js';

const VALID_RANGES = ['1mo', '6mo', '1y', '5y'];

function safeFloat(val) {
  if (val === null || val === undefined) return null;
  const f = parseFloat(val);
  return Number.isNaN(f) ? null : f;
}

function safeInt(val) {
  if (val === null || val === undefined) return null;
  const i = parseInt(val, 10);
  return Number.isNaN(i) ? null : i;
}

function getPeriod1ForRange(rangePeriod) {
  const now = new Date();
  const d = new Date(now);
  switch (rangePeriod) {
    case '1mo':
      d.setMonth(d.getMonth() - 1);
      break;
    case '6mo':
      d.setMonth(d.getMonth() - 6);
      break;
    case '5y':
      d.setFullYear(d.getFullYear() - 5);
      break;
    case '1y':
    default:
      d.setFullYear(d.getFullYear() - 1);
      break;
  }
  return d;
}

export async function fetchStockData(symbol, rangePeriod = '1y') {
  const cacheKeyQuote = `quote:${symbol}`;
  const cacheKeyHist = `hist:${symbol}:${rangePeriod}`;

  const cachedQuote = cacheManager.get(cacheKeyQuote);
  const cachedHist = cacheManager.get(cacheKeyHist);

  // 1. Fetch quote data
  let quoteData = cachedQuote;
  if (!quoteData) {
    let quoteRes = null;
    try {
      quoteRes = await yahooFinance.quote(symbol);
    } catch (e) {
      console.warn(`[STOCK QUOTE WARNING] ${symbol}:`, e?.message || e);
    }

    const price = safeFloat(
      quoteRes?.regularMarketPrice ?? quoteRes?.currentPrice
    );
    const prevClose = safeFloat(quoteRes?.regularMarketPreviousClose);

    let change = null;
    let changePct = null;
    if (price !== null && prevClose !== null && prevClose > 0) {
      change = price - prevClose;
      changePct = (change / prevClose) * 100;
    }

    const currency =
      quoteRes?.currency ||
      (symbol.endsWith('.NS') || symbol.endsWith('.BO') ? 'INR' : 'USD');
    const name =
      quoteRes?.longName || quoteRes?.shortName || quoteRes?.displayName || symbol;
    const marketState = quoteRes?.marketState || 'REGULAR';

    const dayLow = safeFloat(quoteRes?.regularMarketDayLow);
    const dayHigh = safeFloat(quoteRes?.regularMarketDayHigh);
    const fiftyTwoLow = safeFloat(quoteRes?.fiftyTwoWeekLow);
    const fiftyTwoHigh = safeFloat(quoteRes?.fiftyTwoWeekHigh);

    const volume = safeInt(quoteRes?.regularMarketVolume);
    const marketCap = safeInt(quoteRes?.marketCap);

    quoteData = {
      symbol,
      name,
      price,
      change: change !== null ? Math.round(change * 100) / 100 : null,
      change_percent:
        changePct !== null ? Math.round(changePct * 100) / 100 : null,
      currency,
      market_state: marketState,
      day_range: { low: dayLow, high: dayHigh },
      fifty_two_week_range: { low: fiftyTwoLow, high: fiftyTwoHigh },
      volume,
      market_cap: marketCap,
    };
    cacheManager.set(cacheKeyQuote, quoteData, 60);
  }

  // 2. Fetch history
  let historyData = cachedHist;
  if (!historyData) {
    historyData = [];
    try {
      const period1 = getPeriod1ForRange(rangePeriod);
      const chartRes = await yahooFinance.chart(symbol, {
        period1,
        interval: '1d',
      });

      const quotes = chartRes?.quotes || [];
      for (const q of quotes) {
        if (!q || q.close === null || q.close === undefined) continue;
        const dtStr =
          q.date instanceof Date
            ? q.date.toISOString().slice(0, 10)
            : String(q.date).slice(0, 10);

        historyData.push({
          date: dtStr,
          open: safeFloat(q.open),
          high: safeFloat(q.high),
          low: safeFloat(q.low),
          close: safeFloat(q.close),
          volume: safeInt(q.volume),
        });
      }
    } catch (e) {
      console.warn(`[STOCK CHART ERROR] ${symbol}:`, e?.message || e);
    }
    cacheManager.set(cacheKeyHist, historyData, 900);
  }

  // 3. Fetch news
  const newsItems = [];
  try {
    const searchNews = await yahooFinance.search(symbol, { newsCount: 10 });
    const rawNews = searchNews?.news || [];

    for (const item of rawNews) {
      if (!item || typeof item !== 'object') continue;
      const title = item.title || item.headline;
      if (!title) continue;

      const publisher = item.publisher || item.providerName || 'Yahoo Finance';
      const link = item.link || `https://finance.yahoo.com/quote/${symbol}`;

      let pubStr = '';
      if (item.providerPublishTime) {
        const pubDate =
          item.providerPublishTime instanceof Date
            ? item.providerPublishTime
            : new Date(item.providerPublishTime * 1000);
        pubStr = pubDate.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
      }

      newsItems.push({
        title: String(title),
        publisher: String(publisher),
        link: String(link),
        published_at: pubStr,
      });

      if (newsItems.length >= 10) break;
    }
  } catch (e) {
    console.warn(`[STOCK NEWS ERROR] ${symbol}:`, e?.message || e);
  }

  // 4. Fetch events (earnings, dividends, splits)
  const eventsData = { earnings: [], dividends: [], splits: [] };
  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['calendarEvents'],
    });

    const earningsDates =
      summary?.calendarEvents?.earnings?.earningsDate || [];
    for (const ed of earningsDates) {
      if (!ed) continue;
      const dtStr =
        ed instanceof Date
          ? ed.toISOString().slice(0, 10)
          : String(ed).slice(0, 10);
      eventsData.earnings.push({
        date: dtStr,
        event: 'Earnings Release',
      });
    }

    // Dividends & Splits from chart events
    const period1Events = getPeriod1ForRange('5y');
    const chartEventsRes = await yahooFinance.chart(symbol, {
      period1: period1Events,
      events: 'div,split',
    });

    const divObj = chartEventsRes?.events?.dividends || {};
    const divEntries = Object.values(divObj).sort(
      (a, b) => (b.date || 0) - (a.date || 0)
    );
    for (const div of divEntries.slice(0, 5)) {
      if (!div) continue;
      const dtStr =
        div.date instanceof Date
          ? div.date.toISOString().slice(0, 10)
          : new Date((div.date || 0) * 1000).toISOString().slice(0, 10);
      eventsData.dividends.push({
        date: dtStr,
        amount: safeFloat(div.amount),
        event: `Dividend (${div.amount})`,
      });
    }

    const splitObj = chartEventsRes?.events?.splits || {};
    const splitEntries = Object.values(splitObj).sort(
      (a, b) => (b.date || 0) - (a.date || 0)
    );
    for (const sp of splitEntries.slice(0, 5)) {
      if (!sp) continue;
      const dtStr =
        sp.date instanceof Date
          ? sp.date.toISOString().slice(0, 10)
          : new Date((sp.date || 0) * 1000).toISOString().slice(0, 10);
      const ratio = sp.splitRatio || `${sp.numerator}:${sp.denominator}`;
      eventsData.splits.push({
        date: dtStr,
        ratio: String(ratio),
        event: `Stock Split (${ratio})`,
      });
    }
  } catch (e) {
    console.warn(`[STOCK EVENTS ERROR] ${symbol}:`, e?.message || e);
  }

  return {
    quote: quoteData,
    history: historyData,
    news: newsItems,
    events: eventsData,
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
  if (rateLimiter.isRateLimited(clientIp, 'stock', 20, 60)) {
    res.writeHead(429, corsHeaders);
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
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
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(data));
  } catch (e) {
    console.error(`[STOCK ENDPOINT ERROR] ${symbolVal}:`, e);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: 'Failed to retrieve stock data' }));
  }
}
