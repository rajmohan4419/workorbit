import re
import time
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("market_api")
logger.setLevel(logging.INFO)

SYMBOL_REGEX = re.compile(r"^[A-Za-z0-9\.\-\^]{1,20}$")

PROHIBITED_PATTERNS = [
    re.compile(r"\b(buy|sell|hold)\b", re.IGNORECASE),
    re.compile(r"\btarget\s+price\b", re.IGNORECASE),
    re.compile(r"\bprice\s+target\b", re.IGNORECASE),
    re.compile(r"\bshould\s+(invest|buy|sell|hold)\b", re.IGNORECASE),
    re.compile(r"\brecommend(ation|ed|s)?\b", re.IGNORECASE),
    re.compile(r"\b(investment|financial)\s+advice\b", re.IGNORECASE),
    re.compile(r"\b(outperform|underperform)\b", re.IGNORECASE),
    re.compile(r"\b(strong\s+buy|strong\s+sell)\b", re.IGNORECASE),
    re.compile(r"\b(entry\s+point|stop\s+loss)\b", re.IGNORECASE),
]


def validate_symbol(symbol: Optional[str]) -> bool:
    if not symbol or not isinstance(symbol, str):
        return False
    return bool(SYMBOL_REGEX.match(symbol.strip()))


def validate_query(q: Optional[str]) -> Optional[str]:
    if not q or not isinstance(q, str):
        return None
    cleaned = q.strip()
    if not cleaned or len(cleaned) > 60:
        return None
    return cleaned


class RateLimiter:

    def __init__(self):
        # key: (ip, endpoint) -> list of timestamp floats
        self.requests: Dict[Tuple[str, str], List[float]] = {}

    def is_rate_limited(
        self,
        ip: str,
        endpoint: str,
        limit: int = 20,
        window_seconds: int = 60,
    ) -> bool:
        now = time.time()
        key = (ip, endpoint)
        timestamps = self.requests.get(key, [])
        # filter out timestamps older than window_seconds
        timestamps = [ts for ts in timestamps if now - ts < window_seconds]
        if len(timestamps) >= limit:
            self.requests[key] = timestamps
            return True
        timestamps.append(now)
        self.requests[key] = timestamps
        return False


class CacheManager:

    def __init__(self):
        # key -> (value, expiry_timestamp)
        self.cache: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            value, expiry = self.cache[key]
            if time.time() < expiry:
                return value
            del self.cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        expiry = time.time() + ttl_seconds
        self.cache[key] = (value, expiry)


# Global instances
rate_limiter = RateLimiter()
cache_manager = CacheManager()


def contains_recommendation(text: str) -> bool:
    if not text or not isinstance(text, str):
        return False
    for pattern in PROHIBITED_PATTERNS:
        if pattern.search(text):
            return True
    return False


def filter_analysis_data(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    rejections = []

    def check_text(text: str, field_name: str):
        if contains_recommendation(text):
            msg = f"Recommendation language detected in field '{field_name}': {text}"
            rejections.append(msg)

    if "summary" in data and isinstance(data["summary"], str):
        check_text(data["summary"], "summary")

    if "timeline" in data and isinstance(data["timeline"], list):
        for idx, item in enumerate(data["timeline"]):
            if isinstance(item, dict) and "event" in item:
                check_text(str(item["event"]), f"timeline[{idx}].event")

    if "news_takeaways" in data and isinstance(data["news_takeaways"], list):
        for idx, item in enumerate(data["news_takeaways"]):
            if isinstance(item, dict) and "point" in item:
                check_text(str(item["point"]), f"news_takeaways[{idx}].point")

    if "things_to_watch" in data and isinstance(data["things_to_watch"], list):
        for idx, item in enumerate(data["things_to_watch"]):
            check_text(str(item), f"things_to_watch[{idx}]")

    if "data_gaps" in data and isinstance(data["data_gaps"], list):
        for idx, item in enumerate(data["data_gaps"]):
            check_text(str(item), f"data_gaps[{idx}]")

    if rejections:
        for rejection in rejections:
            logger.warning("[ANALYSIS REJECTED] %s", rejection)
        return False, rejections

    return True, []


def get_client_ip(headers: Any, client_address: Optional[Tuple[str, int]] = None) -> str:
    if headers:
        x_forwarded_for = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        x_real_ip = headers.get("x-real-ip") or headers.get("X-Real-IP")
        if x_real_ip:
            return x_real_ip.strip()
    if client_address:
        return client_address[0]
    return "127.0.0.1"


def get_cors_headers(origin: Optional[str] = None) -> Dict[str, str]:
    allowed_origin = "https://orbitboard.in"
    if origin and ("localhost" in origin or "orbitboard.in" in origin or "127.0.0.1" in origin):
        allowed_origin = origin

    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
    }
