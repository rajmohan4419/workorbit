from unittest.mock import MagicMock, patch
import pandas as pd
import pytest

from api.common import (
    RateLimiter,
    contains_recommendation,
    filter_analysis_data,
    validate_query,
    validate_symbol,
)
from api.market.search import handle_search
from api.market.stock import fetch_stock_data


def test_validate_symbol():
    assert validate_symbol("INFY.NS") is True
    assert validate_symbol("AAPL") is True
    assert validate_symbol("RELIANCE.BO") is True
    assert validate_symbol("^NSEI") is True
    assert validate_symbol("") is False
    assert validate_symbol(None) is False
    assert validate_symbol("INVALID SYMBOL WITH SPACES!") is False


def test_validate_query():
    assert validate_query("INFY") == "INFY"
    assert validate_query("  Infosys  ") == "Infosys"
    assert validate_query(None) is None
    assert validate_query("") is None
    assert validate_query("a" * 61) is None


def test_rate_limiter():
    limiter = RateLimiter()
    ip = "192.168.1.1"
    endpoint = "search"

    # Allow up to 3 requests in test
    for _ in range(3):
        assert limiter.is_rate_limited(ip, endpoint, limit=3, window_seconds=60) is False

    # 4th request should be rate limited
    assert limiter.is_rate_limited(ip, endpoint, limit=3, window_seconds=60) is True


def test_contains_recommendation():
    # Prohibited phrases
    assert contains_recommendation("You should buy INFY, target Rs 2000") is True
    assert contains_recommendation("We give a strong buy rating") is True
    assert contains_recommendation("Set a stop loss at 1500") is True
    assert contains_recommendation("This is our price target for AAPL") is True
    assert contains_recommendation("We recommend holding this stock") is True

    # Safe research text
    assert contains_recommendation("Infosys announced quarterly revenue growth of 4.5%.") is False
    assert contains_recommendation("1-year price drawdown was -12.3%.") is False


def test_filter_analysis_data():
    valid_data = {
        "summary": "Infosys reported Q3 earnings.",
        "timeline": [{"date": "2024-01-10", "event": "Quarterly earnings release", "source_url": "https://example.com"}],
        "news_takeaways": [{"point": "Revenue increased YoY", "source_url": "https://example.com"}],
        "things_to_watch": ["Upcoming annual shareholder meeting"],
        "data_gaps": ["No ESG report included"],
    }
    is_valid, rejections = filter_analysis_data(valid_data)
    assert is_valid is True
    assert len(rejections) == 0

    prohibited_data = {
        "summary": "You should buy INFY now with target price of Rs 2000.",
        "news_takeaways": [],
    }
    is_valid, rejections = filter_analysis_data(prohibited_data)
    assert is_valid is False
    assert len(rejections) > 0


@patch("api.market.search.yf.Search")
def test_handle_search(mock_search):
    mock_instance = MagicMock()
    mock_instance.quotes = [
        {"symbol": "INFY.NS", "longname": "Infosys Limited", "exchange": "NSE"},
        {"symbol": "INFY", "shortname": "Infosys Ltd ADR", "exchDisp": "NYSE"},
    ]
    mock_search.return_value = mock_instance

    results = handle_search("INFY")
    assert len(results) == 2
    # Check Indian symbol priority when query doesn't specify dot extension
    assert results[0]["symbol"] == "INFY.NS"
    assert results[1]["symbol"] == "INFY"


@patch("api.market.stock.yf.Ticker")
def test_fetch_stock_data(mock_ticker_cls):
    mock_ticker = MagicMock()
    mock_ticker.info = {
        "currentPrice": 1500.0,
        "previousClose": 1480.0,
        "currency": "INR",
        "longName": "Infosys Limited",
        "marketState": "REGULAR",
        "dayLow": 1475.0,
        "dayHigh": 1510.0,
        "fiftyTwoWeekLow": 1200.0,
        "fiftyTwoWeekHigh": 1700.0,
        "volume": 5000000,
        "marketCap": 6000000000000,
    }

    # Mock historical dataframe
    df_data = {
        "Date": [pd.Timestamp("2024-01-01"), pd.Timestamp("2024-01-02")],
        "Open": [1480.0, 1490.0],
        "High": [1500.0, 1510.0],
        "Low": [1475.0, 1485.0],
        "Close": [1490.0, 1500.0],
        "Volume": [2000000, 2500000],
    }
    mock_ticker.history.return_value = pd.DataFrame(df_data)
    mock_ticker.news = [
        {
            "title": "Infosys Q3 Results",
            "publisher": "Reuters",
            "link": "https://reuters.com/article/1",
            "providerPublishTime": 1704067200,
        }
    ]
    mock_ticker.calendar = {"Earnings Date": ["2024-04-15"]}
    mock_ticker.dividends = pd.Series([18.0], index=[pd.Timestamp("2024-01-15")])
    mock_ticker.splits = pd.Series([], dtype=object)

    mock_ticker_cls.return_value = mock_ticker

    data = fetch_stock_data("INFY.NS", "1y")

    assert data["quote"]["symbol"] == "INFY.NS"
    assert data["quote"]["price"] == 1500.0
    assert data["quote"]["change"] == 20.0
    assert len(data["history"]) == 2
    assert len(data["news"]) == 1
    assert data["news"][0]["title"] == "Infosys Q3 Results"
    assert len(data["events"]["earnings"]) == 1
    assert len(data["events"]["dividends"]) == 1
