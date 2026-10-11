import json
import logging
import os
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, List, Optional
import google.genai as genai
from google.genai import types

from api.common import (
    cache_manager,
    filter_analysis_data,
    get_client_ip,
    get_cors_headers,
    rate_limiter,
    validate_symbol,
)
from api.market.stock import fetch_stock_data

logger = logging.getLogger("market_api")


def compute_1y_summary(history: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not history or len(history) < 2:
        return {
            "return_pct": "not available",
            "volatility": "not available",
            "max_drawdown": "not available",
            "notable_moves": [],
        }

    closes = [h["close"] for h in history if h.get("close") is not None]
    if len(closes) < 2:
        return {
            "return_pct": "not available",
            "volatility": "not available",
            "max_drawdown": "not available",
            "notable_moves": [],
        }

    start_price = closes[0]
    end_price = closes[-1]
    return_pct = (
        ((end_price - start_price) / start_price) * 100 if start_price > 0 else 0
    )

    # Max Drawdown
    peak = closes[0]
    max_dd = 0.0
    for price in closes:
        if price > peak:
            peak = price
        dd = (peak - price) / peak if peak > 0 else 0.0
        if dd > max_dd:
            max_dd = dd

    # Daily returns & notable moves
    daily_changes = []
    for i in range(1, len(history)):
        prev = history[i - 1].get("close")
        curr = history[i].get("close")
        dt = history[i].get("date")
        if prev and curr and prev > 0:
            pct = ((curr - prev) / prev) * 100
            daily_changes.append((dt, pct))

    # Volatility (standard deviation of daily returns)
    vol_str = "not available"
    if daily_changes:
        pct_vals = [c[1] for c in daily_changes]
        mean_pct = sum(pct_vals) / len(pct_vals)
        variance = sum((x - mean_pct) ** 2 for x in pct_vals) / len(pct_vals)
        vol_str = f"{(variance ** 0.5):.2f}% daily std dev"

    # Top moves
    daily_changes.sort(key=lambda x: abs(x[1]), reverse=True)
    top_moves = [
        f"{dt}: {pct:+.2f}%" for dt, pct in daily_changes[:3] if dt
    ]

    return {
        "return_pct": f"{return_pct:+.2f}%",
        "volatility": vol_str,
        "max_drawdown": f"-{max_dd * 100:.2f}%",
        "notable_moves": top_moves,
    }


def build_prompt(symbol: str, stock_data: Dict[str, Any]) -> str:
    quote = stock_data.get("quote", {})
    history = stock_data.get("history", [])
    news = stock_data.get("news", [])
    events = stock_data.get("events", {})

    one_yr = compute_1y_summary(history)

    prompt_context = f"""
SYMBOL: {symbol}
COMPANY NAME: {quote.get('name', symbol)}
CURRENCY: {quote.get('currency', 'USD')}
CURRENT PRICE: {quote.get('price', 'not available')}
DAY CHANGE: {quote.get('change', 'not available')} ({quote.get('change_percent', 'not available')}%)
52-WEEK RANGE: Low {quote.get('fifty_two_week_range', {}).get('low', 'not available')}, High {quote.get('fifty_two_week_range', {}).get('high', 'not available')}
MARKET CAP: {quote.get('market_cap', 'not available')}

1-YEAR HISTORICAL PRICE SUMMARY:
- 1Y Return: {one_yr['return_pct']}
- Volatility: {one_yr['volatility']}
- Max Drawdown: {one_yr['max_drawdown']}
- Top Single-Day Moves: {', '.join(one_yr['notable_moves']) if one_yr['notable_moves'] else 'not available'}

RECENT NEWS (Last ~10 items):
"""
    if news:
        for item in news:
            prompt_context += f"- Date: {item.get('published_at', '')} | Title: {item.get('title')} | Source: {item.get('publisher')} | URL: {item.get('link')}\n"
    else:
        prompt_context += "No recent news items available in record.\n"

    prompt_context += "\nCOMPANY EVENTS & CALENDAR:\n"
    earnings = events.get("earnings", [])
    divs = events.get("dividends", [])
    splits = events.get("splits", [])

    if earnings:
        for e in earnings:
            prompt_context += f"- Earnings Date: {e.get('date')} | Event: {e.get('event')}\n"
    if divs:
        for d in divs:
            prompt_context += f"- Dividend Date: {d.get('date')} | Amount: {d.get('amount')}\n"
    if splits:
        for s in splits:
            prompt_context += f"- Stock Split Date: {s.get('date')} | Ratio: {s.get('ratio')}\n"

    if not (earnings or divs or splits):
        prompt_context += "No specific corporate event calendar records found.\n"

    instructions = """
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
"""
    return prompt_context + "\n" + instructions


def generate_gemini_analysis(symbol: str, stock_data: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing")

    client = genai.Client(api_key=api_key)
    prompt = build_prompt(symbol, stock_data)

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.2,
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config,
    )

    text_resp = response.text or "{}"
    try:
        parsed = json.loads(text_resp)
    except Exception as parse_err:
        logger.error("[GEMINI JSON PARSE ERROR] %s: %s", symbol, parse_err)
        raise ValueError("Gemini returned invalid JSON") from parse_err

    # Apply recommendation post-filter
    valid, rejections = filter_analysis_data(parsed)
    if not valid:
        logger.warning("[GEMINI ANALYSIS REJECTED] %s: %s", symbol, rejections)
        # Attempt one retry with explicit correction instruction
        retry_prompt = prompt + f"\n\nCRITICAL CORRECTION REQUIRED: Your previous response was rejected for containing prohibited recommendation language: {rejections}. Re-generate strictly without any buy/sell/hold/target price or advisory words."
        retry_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=retry_prompt,
            config=config,
        )
        retry_text = retry_response.text or "{}"
        parsed = json.loads(retry_text)
        valid_again, second_rejections = filter_analysis_data(parsed)
        if not valid_again:
            logger.error("[GEMINI RETRY REJECTED] %s: %s", symbol, second_rejections)
            raise ValueError("Generated analysis contained prohibited recommendation language")

    # Ensure required keys exist
    schema_defaults = {
        "summary": "Educational summary generated from public market records.",
        "timeline": [],
        "news_takeaways": [],
        "things_to_watch": [],
        "data_gaps": ["No additional data gaps noted."],
    }
    for k, v in schema_defaults.items():
        if k not in parsed or parsed[k] is None:
            parsed[k] = v

    return parsed


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        headers = get_cors_headers(self.headers.get("origin"))
        self.send_response(204)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        client_ip = get_client_ip(self.headers, self.client_address)
        if rate_limiter.is_rate_limited(
            client_ip, "analyze", limit=5, window_seconds=60
        ):
            self.send_response(429)
            headers = get_cors_headers(self.headers.get("origin"))
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": "Rate limit exceeded"}).encode("utf-8")
            )
            return

        headers = get_cors_headers(self.headers.get("origin"))

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""

        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body = {}

        symbol = body.get("symbol")
        if not validate_symbol(symbol):
            self.send_response(400)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": "Invalid or missing symbol"}).encode(
                    "utf-8"
                )
            )
            return

        cache_key = f"analysis:{symbol}"
        cached_analysis = cache_manager.get(cache_key)
        if cached_analysis:
            self.send_response(200)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps(cached_analysis).encode("utf-8"))
            return

        try:
            stock_data = fetch_stock_data(symbol, range_period="1y")
            analysis = generate_gemini_analysis(symbol, stock_data)

            cache_manager.set(cache_key, analysis, ttl_seconds=21600)  # 6h cache

            self.send_response(200)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps(analysis).encode("utf-8"))
        except Exception as e:
            logger.error("[ANALYZE ENDPOINT ERROR] %s: %s", symbol, e)
            self.send_response(500)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(
                json.dumps({
                    "error": str(e) or "Failed to generate stock analysis"
                }).encode("utf-8")
            )
