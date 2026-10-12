import { GoogleGenAI } from '@google/genai';
import {
  cacheManager,
  filterAnalysisData,
  getCorsHeaders,
  getClientIp,
  rateLimiter,
  validateSymbol,
} from '../_lib/common.js';
import { fetchStockData } from './stock.js';

export function compute1ySummary(history) {
  if (!history || !Array.isArray(history) || history.length < 2) {
    return {
      return_pct: 'not available',
      volatility: 'not available',
      max_drawdown: 'not available',
      notable_moves: [],
    };
  }

  const closes = history
    .map((h) => h.close)
    .filter((c) => c !== null && c !== undefined);

  if (closes.length < 2) {
    return {
      return_pct: 'not available',
      volatility: 'not available',
      max_drawdown: 'not available',
      notable_moves: [],
    };
  }

  const startPrice = closes[0];
  const endPrice = closes[closes.length - 1];
  const returnPct =
    startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  // Max Drawdown
  let peak = closes[0];
  let maxDd = 0.0;
  for (const price of closes) {
    if (price > peak) peak = price;
    const dd = peak > 0 ? (peak - price) / peak : 0.0;
    if (dd > maxDd) maxDd = dd;
  }

  // Daily returns & notable moves
  const dailyChanges = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].close;
    const curr = history[i].close;
    const dt = history[i].date;
    if (prev && curr && prev > 0) {
      const pct = ((curr - prev) / prev) * 100;
      dailyChanges.push({ date: dt, pct });
    }
  }

  // Volatility (standard deviation of daily returns)
  let volStr = 'not available';
  if (dailyChanges.length > 0) {
    const pctVals = dailyChanges.map((c) => c.pct);
    const meanPct = pctVals.reduce((a, b) => a + b, 0) / pctVals.length;
    const variance =
      pctVals.reduce((acc, x) => acc + (x - meanPct) ** 2, 0) / pctVals.length;
    volStr = `${Math.sqrt(variance).toFixed(2)}% daily std dev`;
  }

  // Top moves
  dailyChanges.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const topMoves = dailyChanges
    .slice(0, 3)
    .map((c) => `${c.date}: ${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(2)}%`);

  return {
    return_pct: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`,
    volatility: volStr,
    max_drawdown: `-${(maxDd * 100).toFixed(2)}%`,
    notable_moves: topMoves,
  };
}

export function buildPrompt(symbol, stockData) {
  const quote = stockData?.quote || {};
  const history = stockData?.history || [];
  const news = stockData?.news || [];
  const events = stockData?.events || {};

  const oneYr = compute1ySummary(history);

  let promptContext = `
SYMBOL: ${symbol}
COMPANY NAME: ${quote.name || symbol}
CURRENCY: ${quote.currency || 'USD'}
CURRENT PRICE: ${quote.price ?? 'not available'}
DAY CHANGE: ${quote.change ?? 'not available'} (${quote.change_percent ?? 'not available'}%)
52-WEEK RANGE: Low ${quote.fifty_two_week_range?.low ?? 'not available'}, High ${quote.fifty_two_week_range?.high ?? 'not available'}
MARKET CAP: ${quote.market_cap ?? 'not available'}

1-YEAR HISTORICAL PRICE SUMMARY:
- 1Y Return: ${oneYr.return_pct}
- Volatility: ${oneYr.volatility}
- Max Drawdown: ${oneYr.max_drawdown}
- Top Single-Day Moves: ${oneYr.notable_moves.length > 0 ? oneYr.notable_moves.join(', ') : 'not available'}

RECENT NEWS (Last ~10 items):
`;

  if (news.length > 0) {
    for (const item of news) {
      promptContext += `- Date: ${item.published_at || ''} | Title: ${item.title} | Source: ${item.publisher} | URL: ${item.link}\n`;
    }
  } else {
    promptContext += 'No recent news items available in record.\n';
  }

  promptContext += '\nCOMPANY EVENTS & CALENDAR:\n';
  const earnings = events.earnings || [];
  const divs = events.dividends || [];
  const splits = events.splits || [];

  if (earnings.length > 0) {
    for (const e of earnings) {
      promptContext += `- Earnings Date: ${e.date} | Event: ${e.event}\n`;
    }
  }
  if (divs.length > 0) {
    for (const d of divs) {
      promptContext += `- Dividend Date: ${d.date} | Amount: ${d.amount}\n`;
    }
  }
  if (splits.length > 0) {
    for (const s of splits) {
      promptContext += `- Stock Split Date: ${s.date} | Ratio: ${s.ratio}\n`;
    }
  }

  if (earnings.length === 0 && divs.length === 0 && splits.length === 0) {
    promptContext += 'No specific corporate event calendar records found.\n';
  }

  const instructions = `
SYSTEM INSTRUCTIONS & STRICT CONSTRAINTS:
1. You are an objective financial research assistant summarizing public market record data.
2. Use ONLY the supplied data above. Do NOT assume, extrapolate, or bring outside news or facts.
3. For every claim or news point, cite the specific source_url provided in the news or fallback to 'Public market record' if no URL.
4. If data is missing or incomplete, explicitly state 'not available' in summary or list it in data_gaps.
5. ABSOLUTELY NO RECOMMENDATIONS, ADVICE, OR PREDICTIONS:
   - NEVER suggest buying, selling, holding, investing, or allocating capital.
   - NEVER provide price targets, target prices, entry points, or stop-loss figures.
   - NEVER predict future stock performance or state whether a stock is cheap, expensive, or a good opportunity.
6. Output MUST be valid JSON conforming strictly to this JSON schema:
{
  "summary": "Objective executive summary of supplied quote, 1y metrics, news, and events.",
  "timeline": [
    {
      "date": "YYYY-MM-DD or date string",
      "event": "Description of event or corporate news",
      "source_url": "URL or 'Public market record'"
    }
  ],
  "news_takeaways": [
    {
      "point": "Factual point from news",
      "source_url": "URL or 'Public market record'"
    }
  ],
  "things_to_watch": [
    "Upcoming earnings, dividend date, or factual factor to observe"
  ],
  "data_gaps": [
    "List any missing data points or gaps in the supplied record"
  ]
}
`;

  return promptContext + '\n' + instructions;
}

export async function generateGeminiAnalysis(symbol, stockData) {
  const apiKey = globalThis.process?.env?.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(symbol, stockData);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const textResp = response?.text || '{}';
  let candidateObj = JSON.parse(textResp);

  // Apply recommendation post-filter
  const initialCheck = filterAnalysisData(candidateObj);
  if (!initialCheck.valid) {
    console.warn(`[GEMINI ANALYSIS REJECTED] ${symbol}:`, initialCheck.rejections);
    // Attempt one retry
    const retryPrompt = `${prompt}\n\nCRITICAL CORRECTION REQUIRED: Your previous response was rejected for containing prohibited recommendation language: ${initialCheck.rejections.join('; ')}. Re-generate strictly without any buy/sell/hold/target price or advisory words.`;
    const retryResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: retryPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const retryText = retryResponse?.text || '{}';
    candidateObj = JSON.parse(retryText);
    const checkAgain = filterAnalysisData(candidateObj);
    if (!checkAgain.valid) {
      console.error(`[GEMINI RETRY REJECTED] ${symbol}:`, checkAgain.rejections);
      throw new Error('Generated analysis contained prohibited recommendation language');
    }
  }

  const schemaDefaults = {
    summary: 'Educational summary generated from public market records.',
    timeline: [],
    news_takeaways: [],
    things_to_watch: [],
    data_gaps: ['No additional data gaps noted.'],
  };

  const output = { ...candidateObj };
  for (const [k, v] of Object.entries(schemaDefaults)) {
    if (output[k] === undefined || output[k] === null) {
      output[k] = v;
    }
  }

  return output;
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
  if (rateLimiter.isRateLimited(clientIp, 'analyze', 5, 60)) {
    res.writeHead(429, corsHeaders);
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, corsHeaders);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = {};

  // Check if req.body was pre-parsed by serverless runtime (e.g. Vercel)
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        body = {};
      }
    } else if (typeof req.body === 'object') {
      body = req.body;
    }
  } else {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const bodyStr = globalThis.Buffer.concat(buffers).toString('utf-8');
      if (bodyStr) body = JSON.parse(bodyStr);
    } catch {
      body = {};
    }
  }

  const symbol = body?.symbol;
  if (!validateSymbol(symbol)) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ error: 'Invalid or missing symbol' }));
    return;
  }

  const cacheKey = `analysis:${symbol}`;
  const cachedAnalysis = cacheManager.get(cacheKey);
  if (cachedAnalysis) {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(cachedAnalysis));
    return;
  }

  try {
    const stockData = await fetchStockData(symbol, '1y');
    const analysis = await generateGeminiAnalysis(symbol, stockData);

    cacheManager.set(cacheKey, analysis, 21600); // 6h cache

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(analysis));
  } catch (e) {
    console.error(`[ANALYZE ENDPOINT ERROR] ${symbol}:`, e);
    res.writeHead(500, corsHeaders);
    res.end(
      JSON.stringify({
        error: e?.message || 'Failed to generate stock analysis',
      })
    );
  }
}
