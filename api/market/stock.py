import datetime
import json
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse
import yfinance as yf

from api.common import (
    cache_manager,
    get_client_ip,
    get_cors_headers,
    rate_limiter,
    validate_symbol,
)

VALID_RANGES = ["1mo", "6mo", "1y", "5y"]


def safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        return f if not (f != f) else None  # handles NaN
    except (ValueError, TypeError):
        return None


def safe_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def fetch_stock_data(symbol: str, range_period: str = "1y") -> Dict[str, Any]:
    cache_key_quote = f"quote:{symbol}"
    cache_key_hist = f"hist:{symbol}:{range_period}"

    cached_quote = cache_manager.get(cache_key_quote)
    cached_hist = cache_manager.get(cache_key_hist)

    ticker = yf.Ticker(symbol)

    # 1. Fetch quote data
    if cached_quote:
        quote_data = cached_quote
    else:
        info = {}
        try:
            info = ticker.info or {}
        except Exception as e:
            print(f"[STOCK INFO WARNING] {symbol}: {e}")

        fast_info = {}
        try:
            fast_info = getattr(ticker, "fast_info", {}) or {}
        except Exception:
            pass

        # extract price metrics
        price = (
            safe_float(info.get("currentPrice"))
            or safe_float(info.get("regularMarketPrice"))
            or safe_float(fast_info.get("lastPrice"))
        )
        prev_close = (
            safe_float(info.get("previousClose"))
            or safe_float(info.get("regularMarketPreviousClose"))
            or safe_float(fast_info.get("previousClose"))
        )

        change = None
        change_pct = None
        if price is not None and prev_close is not None and prev_close > 0:
            change = price - prev_close
            change_pct = (change / prev_close) * 100

        currency = (
            info.get("currency")
            or fast_info.get("currency")
            or ("INR" if symbol.endswith((".NS", ".BO")) else "USD")
        )
        name = info.get("longName") or info.get("shortName") or symbol
        market_state = info.get("marketState") or "REGULAR"

        day_low = safe_float(info.get("dayLow")) or safe_float(
            fast_info.get("dayLow")
        )
        day_high = safe_float(info.get("dayHigh")) or safe_float(
            fast_info.get("dayHigh")
        )
        fifty_two_low = safe_float(info.get("fiftyTwoWeekLow")) or safe_float(
            fast_info.get("yearLow")
        )
        fifty_two_high = safe_float(info.get("fiftyTwoWeekHigh")) or safe_float(
            fast_info.get("yearHigh")
        )

        volume = safe_int(info.get("volume")) or safe_int(
            fast_info.get("lastVolume")
        )
        market_cap = safe_int(info.get("marketCap")) or safe_int(
            fast_info.get("marketCap")
        )

        quote_data = {
            "symbol": symbol,
            "name": name,
            "price": price,
            "change": round(change, 2) if change is not None else None,
            "change_percent": (
                round(change_pct, 2) if change_pct is not None else None
            ),
            "currency": currency,
            "market_state": market_state,
            "day_range": {"low": day_low, "high": day_high},
            "fifty_two_week_range": {
                "low": fifty_two_low,
                "high": fifty_two_high,
            },
            "volume": volume,
            "market_cap": market_cap,
        }
        cache_manager.set(cache_key_quote, quote_data, ttl_seconds=60)

    # 2. Fetch history
    if cached_hist:
        history_data = cached_hist
    else:
        history_data = []
        try:
            df = ticker.history(period=range_period)
            if not df.empty:
                df = df.reset_index()
                for _, row in df.iterrows():
                    date_val = row.get("Date")
                    if isinstance(date_val, (datetime.datetime, datetime.date)):
                        date_str = date_val.strftime("%Y-%m-%d")
                    else:
                        date_str = str(date_val)[:10]

                    c_val = safe_float(row.get("Close"))
                    if c_val is None:
                        continue

                    history_data.append({
                        "date": date_str,
                        "open": safe_float(row.get("Open")),
                        "high": safe_float(row.get("High")),
                        "low": safe_float(row.get("Low")),
                        "close": c_val,
                        "volume": safe_int(row.get("Volume")),
                    })
        except Exception as e:
            print(f"[STOCK HISTORY ERROR] {symbol}: {e}")

        cache_manager.set(cache_key_hist, history_data, ttl_seconds=900)

    # 3. Fetch news
    news_items: List[Dict[str, Any]] = []
    try:
        raw_news = getattr(ticker, "news", []) or []
        if not raw_news:
            # fallback to yf.Search news
            try:
                s = yf.Search(symbol)
                raw_news = getattr(s, "news", []) or []
            except Exception:
                pass

        for item in raw_news:
            if not isinstance(item, dict):
                continue
            title = item.get("title") or item.get("headline")
            if not title:
                continue
            publisher = item.get("publisher") or item.get("source") or "Yahoo Finance"
            link = item.get("link") or item.get("url") or f"https://finance.yahoo.com/quote/{symbol}"
            
            pub_time = item.get("providerPublishTime") or item.get("pubDate")
            if isinstance(pub_time, (int, float)):
                pub_str = datetime.datetime.fromtimestamp(pub_time, tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            elif pub_time:
                pub_str = str(pub_time)
            else:
                pub_str = ""

            news_items.append({
                "title": str(title),
                "publisher": str(publisher),
                "link": str(link),
                "published_at": pub_str,
            })
            if len(news_items) >= 10:
                break
    except Exception as e:
        print(f"[STOCK NEWS ERROR] {symbol}: {e}")

    # 4. Fetch events (earnings, dividends, splits)
    events_data: Dict[str, Any] = {"earnings": [], "dividends": [], "splits": []}
    try:
        cal = getattr(ticker, "calendar", None)
        if isinstance(cal, dict):
            earnings_dates = cal.get("Earnings Date") or []
            if isinstance(earnings_dates, list):
                for ed in earnings_dates:
                    events_data["earnings"].append({
                        "date": str(ed),
                        "event": "Earnings Release"
                    })
            elif earnings_dates:
                events_data["earnings"].append({
                    "date": str(earnings_dates),
                    "event": "Earnings Release"
                })

        divs = getattr(ticker, "dividends", None)
        if divs is not None and not divs.empty:
            recent_divs = divs.tail(5)
            for dt, val in recent_divs.items():
                dt_str = str(dt)[:10]
                events_data["dividends"].append({
                    "date": dt_str,
                    "amount": safe_float(val),
                    "event": f"Dividend ({val})"
                })

        splits = getattr(ticker, "splits", None)
        if splits is not None and not splits.empty:
            recent_splits = splits.tail(5)
            for dt, val in recent_splits.items():
                dt_str = str(dt)[:10]
                events_data["splits"].append({
                    "date": dt_str,
                    "ratio": str(val),
                    "event": f"Stock Split ({val})"
                })
    except Exception as e:
        print(f"[STOCK EVENTS ERROR] {symbol}: {e}")

    return {
        "quote": quote_data,
        "history": history_data,
        "news": news_items,
        "events": events_data,
    }


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        headers = get_cors_headers(self.headers.get("origin"))
        self.send_response(204)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        client_ip = get_client_ip(self.headers, self.client_address)
        if rate_limiter.is_rate_limited(
            client_ip, "stock", limit=20, window_seconds=60
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

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        symbol_val = params.get("symbol", [""])[0]
        range_val = params.get("range", ["1y"])[0]

        if not validate_symbol(symbol_val):
            self.send_response(400)
            headers = get_cors_headers(self.headers.get("origin"))
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": "Invalid or missing symbol"}).encode(
                    "utf-8"
                )
            )
            return

        if range_val not in VALID_RANGES:
            range_val = "1y"

        try:
            data = fetch_stock_data(symbol_val, range_val)
            self.send_response(200)
            headers = get_cors_headers(self.headers.get("origin"))
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        except Exception as e:
            print(f"[STOCK ENDPOINT ERROR] {symbol_val}: {e}")
            self.send_response(500)
            headers = get_cors_headers(self.headers.get("origin"))
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": "Failed to retrieve stock data"}).encode(
                    "utf-8"
                )
            )
