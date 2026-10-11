import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import yfinance as yf

from api.common import (
    get_client_ip,
    get_cors_headers,
    rate_limiter,
    validate_query,
)


def handle_search(q: str) -> list:
    cleaned = validate_query(q)
    if not cleaned:
        return []

    try:
        search_res = yf.Search(cleaned)
        raw_quotes = getattr(search_res, "quotes", []) or []

        results = []
        for quote in raw_quotes:
            if not isinstance(quote, dict):
                continue
            symbol = quote.get("symbol")
            if not symbol:
                continue

            name = (
                quote.get("longname")
                or quote.get("shortname")
                or symbol
            )
            exchange = quote.get("exchDisp") or quote.get("exchange") or ""

            results.append({
                "symbol": str(symbol),
                "name": str(name),
                "exchange": str(exchange),
            })

        # Prioritize Indian listings (.NS, .BO) if query does not explicitly specify an extension
        if "." not in cleaned:
            indian_results = [
                r
                for r in results
                if r["symbol"].endswith(".NS") or r["symbol"].endswith(".BO")
            ]
            other_results = [
                r
                for r in results
                if not (
                    r["symbol"].endswith(".NS") or r["symbol"].endswith(".BO")
                )
            ]
            results = indian_results + other_results

        return results[:10]
    except Exception as e:
        print(f"[SEARCH ERROR] {e}")
        return []


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
            client_ip, "search", limit=20, window_seconds=60
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
        q_val = params.get("q", [""])[0]

        results = handle_search(q_val)

        headers = get_cors_headers(self.headers.get("origin"))
        self.send_response(200)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(results).encode("utf-8"))
