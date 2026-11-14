"""Tests for the Massive free-tier (end-of-day) quote provider.

All requests are served by a fake httpx client — no network, no real
API key, fully reproducible. The provider's live behaviour was
validated once against the real API with a real free-tier key; these
tests pin the contract so refactors cannot silently change it.
"""

from __future__ import annotations

import asyncio

import pytest

from app.providers import market_massive
from app.providers.market_alpha_vantage import (
    AlphaVantageMarketProvider,
    provider_from_env,
)
from app.providers.market_massive import MassiveMarketProvider


def _run(coro):
    return asyncio.run(coro)


def _fake_client(payload):
    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return payload

    class _Client:
        def __init__(self, *args, **kwargs):
            self.payload = payload

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url):
            return _Resp()

    return _Client


def _bars_payload(*bars):
    return {"ticker": "NVDA", "resultsCount": len(bars), "results": list(bars)}


def _patch(monkeypatch, payload):
    monkeypatch.setattr(
        market_massive.httpx, "AsyncClient", _fake_client(payload)
    )


def test_quote_built_from_last_two_daily_bars(monkeypatch):
    _patch(
        monkeypatch,
        _bars_payload(
            {"c": 173.73, "t": 1794373200000, "v": 3.4e8},
            {"c": 166.19, "t": 1794459600000, "v": 7.5e8},
            {"c": 162.85, "t": 1794546000000, "v": 3.7e8},
        ),
    )
    provider = MassiveMarketProvider(api_key="test-key")
    quote = _run(provider.get_quote("nvda"))
    assert quote is not None
    assert quote.ticker == "NVDA"
    assert quote.price == 162.85
    assert quote.previous_close == 166.19
    assert quote.change == pytest.approx(162.85 - 166.19)
    assert quote.change_percent == pytest.approx(
        (162.85 - 166.19) / 166.19 * 100.0
    )
    assert quote.as_of == pytest.approx(1794546000.0)
    assert quote.data_delay == "eod"
    assert quote.currency == "USD"
    assert quote.market_capitalization is None


def test_single_bar_shows_price_without_known_previous_close(monkeypatch):
    _patch(monkeypatch, _bars_payload({"c": 25.5, "t": 1794546000000}))
    provider = MassiveMarketProvider(api_key="test-key")
    quote = _run(provider.get_quote("IPOX"))
    assert quote is not None
    assert quote.price == 25.5
    assert quote.previous_close == 25.5
    assert quote.change == 0.0
    assert quote.change_percent == 0.0


def test_unknown_ticker_returns_none_never_an_error(monkeypatch):
    _patch(monkeypatch, _bars_payload())
    provider = MassiveMarketProvider(api_key="test-key")
    assert _run(provider.get_quote("ZZZZZ")) is None


def test_market_service_serves_massive_quote(monkeypatch):
    """The service layer accepts the Massive provider unchanged."""
    from app.services.market_service import MarketService

    _patch(
        monkeypatch,
        _bars_payload(
            {"c": 100.0, "t": 1794459600000, "v": 1.0e6},
            {"c": 102.5, "t": 1794546000000, "v": 1.2e6},
        ),
    )
    service = MarketService(
        quote_provider=MassiveMarketProvider(api_key="test-key")
    )
    payload = _run(service.quote_payload("AAPL"))
    assert payload["quote"]["price"] == 102.5
    assert payload["quote"]["previous_close"] == 100.0
    assert payload["data_source"] == {
        "provider": "massive",
        "label": "Massive (end-of-day)",
        "degraded": False,
    }


# --- Provider selection (env gating) ---------------------------------


def test_provider_from_env_selects_massive(monkeypatch):
    monkeypatch.setenv("CURVIN_MARKET_PROVIDER", "massive")
    monkeypatch.setenv("CURVIN_MARKET_API_KEY", "test-key")
    provider = provider_from_env()
    assert isinstance(provider, MassiveMarketProvider)
    assert provider.name == "massive"


def test_provider_from_env_still_supports_alphavantage(monkeypatch):
    monkeypatch.setenv("CURVIN_MARKET_PROVIDER", "alphavantage")
    monkeypatch.setenv("CURVIN_MARKET_API_KEY", "test-key")
    assert isinstance(provider_from_env(), AlphaVantageMarketProvider)


def test_provider_from_env_requires_the_key(monkeypatch):
    monkeypatch.setenv("CURVIN_MARKET_PROVIDER", "massive")
    monkeypatch.delenv("CURVIN_MARKET_API_KEY", raising=False)
    assert provider_from_env() is None


def test_provider_from_env_unconfigured_by_default(monkeypatch):
    monkeypatch.delenv("CURVIN_MARKET_PROVIDER", raising=False)
    monkeypatch.delenv("CURVIN_MARKET_API_KEY", raising=False)
    assert provider_from_env() is None
