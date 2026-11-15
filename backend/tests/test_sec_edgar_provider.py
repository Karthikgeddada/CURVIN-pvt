"""Tests for the live SEC EDGAR discovery provider.

All requests are served by a fake httpx client — no network, fully
reproducible. The dataset shape mirrors the real
``company_tickers_exchange.json``: {"fields": [...], "data": [[...]]}.
"""

from __future__ import annotations

import asyncio

import pytest

from app.providers import sec_edgar
from app.providers.sec_edgar import SecEdgarCompanyProvider


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
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url):
            return _Resp()

    return _Client


def _payload(*rows):
    return {
        "fields": ["cik", "name", "ticker", "exchange"],
        "data": list(rows),
    }


def _patch(monkeypatch, payload):
    monkeypatch.setattr(
        sec_edgar.httpx, "AsyncClient", _fake_client(payload)
    )


def test_parses_the_exchange_dataset(monkeypatch):
    _patch(
        monkeypatch,
        _payload(
            [320193, "Apple Inc.", "AAPL", "Nasdaq"],
            [1403161, "Visa Inc.", "V", "NYSE"],
            [1067983, "Berkshire Hathaway Inc.", "BRK.B", "NYSE"],
        ),
    )
    companies = _run(SecEdgarCompanyProvider().load_universe())
    assert len(companies) == 3
    by_ticker = {c.ticker: c for c in companies}
    apple = by_ticker["AAPL"]
    assert apple.name == "Apple Inc."
    assert apple.exchange == "NASDAQ"  # normalised casing
    assert apple.cik == "0000320193"  # zero-padded to 10 digits
    assert apple.status == "unknown"  # not part of the dataset
    assert by_ticker["V"].exchange == "NYSE"
    assert by_ticker["BRK.B"].ticker == "BRK.B"


def test_missing_exchange_is_honest_not_guessed(monkeypatch):
    _patch(
        monkeypatch,
        _payload(
            [1234, "Some Shell Corp", "SHELL", None],
            [5678, "Another One", "ANOT", ""],
        ),
    )
    companies = _run(SecEdgarCompanyProvider().load_universe())
    assert all(c.exchange == "US Composite" for c in companies)


def test_malformed_rows_are_skipped_not_fatal(monkeypatch):
    _patch(
        monkeypatch,
        _payload(
            [320193, "Apple Inc.", "AAPL", "Nasdaq"],
            "not-a-row",
            [42, "Incomplete Row", "INC"],  # shorter than fields
            [None, "No Ticker", None, "NYSE"],
            [9999, "", "EMPTYNAME", "NYSE"],
        ),
    )
    companies = _run(SecEdgarCompanyProvider().load_universe())
    assert [c.ticker for c in companies] == ["AAPL"]


def test_hyphen_share_class_ticker_is_dot_normalised(monkeypatch):
    _patch(
        monkeypatch,
        _payload(
            [1067983, "BERKSHIRE HATHAWAY INC", "BRK-B", "NYSE"],
            [1109354, "BRUKER CORP", "BRKR", "Nasdaq"],
        ),
    )
    companies = _run(SecEdgarCompanyProvider().load_universe())
    by_ticker = {c.ticker: c for c in companies}
    # SEC hyphen notation -> CURVIN/Massive dot notation.
    assert "BRK.B" in by_ticker and "BRK-B" not in by_ticker
    assert by_ticker["BRK.B"].cik == "0001067983"
    assert by_ticker["BRKR"].ticker == "BRKR"  # untouched


def test_duplicate_ticker_name_rows_dedupe(monkeypatch):
    _patch(
        monkeypatch,
        _payload(
            [320193, "Apple Inc.", "AAPL", "Nasdaq"],
            [320193, "Apple Inc.", "AAPL", "NYSE"],
        ),
    )
    companies = _run(SecEdgarCompanyProvider().load_universe())
    assert len(companies) == 1


def test_unexpected_shape_raises(monkeypatch):
    _patch(monkeypatch, {"unexpected": True})
    with pytest.raises(ValueError):
        _run(SecEdgarCompanyProvider().load_universe())


def test_empty_dataset_raises(monkeypatch):
    _patch(monkeypatch, _payload([]))
    with pytest.raises(ValueError):
        _run(SecEdgarCompanyProvider().load_universe())
