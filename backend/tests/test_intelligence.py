"""M2 company-intelligence API tests: market, fundamentals, filings.

Discovery runs on the deterministic fixtures (primary provider forced
to fail, exactly like test_companies). Live provider behaviour is
exercised with stubs — no network, fully reproducible. The SEC parse
pipeline is additionally validated against synthetic companyfacts and
submissions payloads so the XBRL contract is pinned without network.
"""

from __future__ import annotations

import asyncio

import pytest

from app.providers import filings_sec_edgar, fundamentals_sec_edgar
from app.providers.base import Filing, FiscalYear, Quote
from app.services.company_service import company_service
from app.services.intelligence_service import IntelligenceService, intelligence_service
from app.services.market_service import MarketService


class _PrimaryFailure:
    name = "stub-failure"
    label = "Stub (failing)"

    async def load_universe(self):
        raise RuntimeError("upstream unavailable")


@pytest.fixture(autouse=True)
def _force_fixture_universe(monkeypatch: pytest.MonkeyPatch):
    company_service._cache = None
    monkeypatch.setattr(company_service, "_primary", _PrimaryFailure())
    intelligence_service._fundamentals_cache.clear()
    intelligence_service._filings_cache.clear()
    yield
    company_service._cache = None
    intelligence_service._fundamentals_cache.clear()
    intelligence_service._filings_cache.clear()


BASE = "/api/v1/companies"


def _run(coro):
    return asyncio.run(coro)


def _quote(ticker: str = "NVDA", **overrides) -> Quote:
    fields = dict(
        ticker=ticker,
        price=180.25,
        previous_close=177.5,
        change=2.75,
        change_percent=1.55,
        currency="USD",
        market_capitalization=None,
        as_of=1_700_000_000.0,
        data_delay="delayed",
    )
    fields.update(overrides)
    return Quote(**fields)


class _StubQuoteProvider:
    name = "stub-quotes"
    label = "Stub Quotes"

    def __init__(self, quote=None, error: Exception | None = None):
        self._quote = quote
        self._error = error

    async def get_quote(self, ticker: str):
        if self._error:
            raise self._error
        return self._quote


class _StubFundamentals:
    name = "stub-fundamentals"
    label = "Stub Fundamentals"

    def __init__(self, years=None, error: Exception | None = None):
        self._years = years or []
        self._error = error

    async def get_annual(self, cik: str):
        if self._error:
            raise self._error
        return self._years


class _StubFilings:
    name = "stub-filings"
    label = "Stub Filings"

    def __init__(self, filings=None, error: Exception | None = None):
        self._filings = filings or []
        self._error = error

    async def get_recent(self, cik: str, limit: int = 10):
        if self._error:
            raise self._error
        return self._filings[:limit]


def _fiscal(year: int, **overrides) -> FiscalYear:
    fields = dict(
        fiscal_year=year,
        period_end=f"{year}-01-28",
        currency="USD",
        revenue=100_000_000_000.0 + year,
        net_income=25_000_000_000.0,
        operating_income=30_000_000_000.0,
        total_assets=350_000_000_000.0,
        stockholders_equity=70_000_000_000.0,
        diluted_eps=6.08,
    )
    fields.update(overrides)
    return FiscalYear(**fields)


def _service_with(stub) -> IntelligenceService:
    return IntelligenceService(
        company_service,
        fundamentals_provider=stub,
        filings_provider=stub,
    )


# --- Market -----------------------------------------------------------


def test_market_without_provider_reports_unconfigured():
    service = MarketService(quote_provider=None)
    payload = _run(service.quote_payload("NVDA"))
    assert payload["quote"] is None
    assert payload["data_source"]["provider"] == "none"
    assert payload["data_source"]["label"] == "No market data provider configured"
    assert payload["data_source"]["degraded"] is False


def test_market_with_provider_serves_full_quote():
    service = MarketService(quote_provider=_StubQuoteProvider(quote=_quote()))
    payload = _run(service.quote_payload("nvda"))
    quote = payload["quote"]
    assert quote is not None
    assert quote["price"] == 180.25
    assert quote["change_percent"] == 1.55
    assert quote["data_delay"] == "delayed"
    assert payload["ticker"] == "NVDA"
    assert payload["data_source"] == {
        "provider": "stub-quotes",
        "label": "Stub Quotes",
        "degraded": False,
    }


def test_market_provider_failure_is_flagged_degraded():
    service = MarketService(
        quote_provider=_StubQuoteProvider(error=RuntimeError("quota"))
    )
    payload = _run(service.quote_payload("NVDA"))
    assert payload["quote"] is None
    assert payload["data_source"]["degraded"] is True
    assert "unavailable" in payload["data_source"]["label"]


def test_market_unknown_ticker_is_not_degraded():
    service = MarketService(quote_provider=_StubQuoteProvider(quote=None))
    payload = _run(service.quote_payload("ZZZZ"))
    assert payload["quote"] is None
    assert payload["data_source"]["degraded"] is False
    assert "no quote" in payload["data_source"]["label"]


def test_market_route_serves_unconfigured_state(client):
    response = client.get(f"{BASE}/NVDA/market")
    assert response.status_code == 200
    body = response.json()
    assert body["quote"] is None
    assert body["ticker"] == "NVDA"


# --- Fundamentals -----------------------------------------------------


def test_fundamentals_route_serves_stub_years(client, monkeypatch):
    monkeypatch.setattr(
        intelligence_service,
        "_fundamentals",
        _StubFundamentals(years=[_fiscal(2024), _fiscal(2023)]),
    )
    response = client.get(f"{BASE}/NVDA/fundamentals")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["ticker"] == "NVDA"
    assert len(body["fiscal_years"]) == 2
    latest = body["fiscal_years"][0]
    assert latest["fiscal_year"] == 2024
    assert latest["revenue"] == 100_000_000_000.0 + 2024
    assert latest["diluted_eps"] == 6.08


def test_fundamentals_failure_is_honest(client, monkeypatch):
    monkeypatch.setattr(
        intelligence_service,
        "_fundamentals",
        _StubFundamentals(error=RuntimeError("EDGAR down")),
    )
    response = client.get(f"{BASE}/NVDA/fundamentals")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert body["fiscal_years"] == []
    assert body["data_source"]["degraded"] is True


def test_fundamentals_unknown_ticker_is_404(client, monkeypatch):
    monkeypatch.setattr(
        intelligence_service, "_fundamentals", _StubFundamentals()
    )
    response = client.get(f"{BASE}/NOPE/fundamentals")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "company_not_found"


def test_fundamentals_results_are_cached_per_cik(monkeypatch):
    stub = _StubFundamentals(years=[_fiscal(2024)])
    service = _service_with(stub)
    first = _run(service.fundamentals_payload("NVDA"))
    second = _run(service.fundamentals_payload("NVDA"))
    assert first["available"] is True
    assert second["available"] is True
    assert "0001045810" in service._fundamentals_cache


# --- Filings ----------------------------------------------------------


def _filing(form: str = "10-K", **overrides) -> Filing:
    fields = dict(
        form=form,
        filed_at="2026-02-25",
        accession_no="0001045810-26-000012",
        report_period="2026-01-25",
        primary_document="nvda-20260125.htm",
    )
    fields.update(overrides)
    return Filing(**fields)


def test_filings_route_serves_stub_filings(client, monkeypatch):
    monkeypatch.setattr(
        intelligence_service,
        "_filings",
        _StubFilings(filings=[_filing(), _filing(form="8-K")]),
    )
    response = client.get(f"{BASE}/NVDA/filings")
    assert response.status_code == 200
    body = response.json()
    assert len(body["filings"]) == 2
    first = body["filings"][0]
    assert first["form"] == "10-K"
    assert first["url"].startswith(
        "https://www.sec.gov/Archives/edgar/data/1045810/"
    )
    assert first["url"].endswith("nvda-20260125.htm")


def test_filings_failure_is_honest(client, monkeypatch):
    monkeypatch.setattr(
        intelligence_service,
        "_filings",
        _StubFilings(error=RuntimeError("EDGAR down")),
    )
    response = client.get(f"{BASE}/NVDA/filings")
    assert response.status_code == 200
    body = response.json()
    assert body["filings"] == []
    assert body["data_source"]["degraded"] is True


def test_filings_limit_is_respected(client, monkeypatch):
    monkeypatch.setattr(
        intelligence_service,
        "_filings",
        _StubFilings(filings=[_filing() for _ in range(5)]),
    )
    response = client.get(f"{BASE}/NVDA/filings", params={"limit": 3})
    assert response.status_code == 200
    assert len(response.json()["filings"]) == 3


# --- SEC parse pipeline (synthetic payloads, no network) ---------------


def _companyfacts_payload() -> dict:
    def concept(unit: str, entries):
        return {"label": "x", "description": "x", "units": {unit: entries}}

    return {
        "cik": 1045810,
        "entityName": "NVIDIA CORPORATION",
        "facts": {
            "us-gaap": {
                "Revenues": concept(
                    "USD",
                    [
                        {
                            "end": "2024-01-28",
                            "val": 60922000000,
                            "fy": 2024,
                            "fp": "FY",
                            "form": "10-K",
                            "frame": "CY2023",
                        },
                        {
                            "end": "2025-01-26",
                            "val": 130497000000,
                            "fy": 2025,
                            "fp": "FY",
                            "form": "10-K",
                            "frame": "CY2024",
                        },
                    ],
                ),
                "NetIncomeLoss": concept(
                    "USD",
                    [
                        {
                            "end": "2025-01-26",
                            "val": 72880000000,
                            "fy": 2025,
                            "fp": "FY",
                            "form": "10-K",
                            "frame": "CY2024",
                        }
                    ],
                ),
                "EarningsPerShareDiluted": concept(
                    "USD/shares",
                    [
                        {
                            "end": "2025-01-26",
                            "val": 2.94,
                            "fy": 2025,
                            "fp": "FY",
                            "form": "10-K",
                            "frame": "CY2024",
                        }
                    ],
                ),
            }
        },
    }


def test_companyfacts_parse_extracts_annual_figures(monkeypatch):
    payload = _companyfacts_payload()

    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return payload

    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url):
            assert "CIK0001045810" in url
            return _Resp()

    monkeypatch.setattr(
        fundamentals_sec_edgar.httpx, "AsyncClient", lambda *a, **k: _Client()
    )
    provider = fundamentals_sec_edgar.SecEdgarFundamentalsProvider()
    years = _run(provider.get_annual("0001045810"))
    assert [y.fiscal_year for y in years] == [2025, 2024]
    assert years[0].revenue == 130497000000.0
    assert years[0].net_income == 72880000000.0
    assert years[0].diluted_eps == 2.94
    assert years[1].revenue == 60922000000.0
    assert years[1].net_income is None


def test_submissions_parse_extracts_recent_filings(monkeypatch):
    payload = {
        "filings": {
            "recent": {
                "form": ["8-K", "10-K", "4"],
                "filingDate": ["2026-11-12", "2026-02-25", "2026-11-06"],
                "accessionNumber": [
                    "0001045810-26-000082",
                    "0001045810-26-000012",
                    "0001197647-26-000013",
                ],
                "reportDate": ["2026-11-11", "2026-01-25", ""],
                "primaryDocument": [
                    "nvda-20261111.htm",
                    "nvda-20260125.htm",
                    "xslF345X06/wk-form4.xml",
                ],
            }
        }
    }

    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return payload

    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url):
            return _Resp()

    monkeypatch.setattr(
        filings_sec_edgar.httpx, "AsyncClient", lambda *a, **k: _Client()
    )
    provider = filings_sec_edgar.SecEdgarFilingsProvider()
    filings = _run(provider.get_recent("0001045810", limit=2))
    assert len(filings) == 2
    assert filings[0].form == "8-K"
    assert filings[0].report_period == "2026-11-11"
    assert filings[0].document_url("0001045810") == (
        "https://www.sec.gov/Archives/edgar/data/1045810/"
        "000104581026000082/nvda-20261111.htm"
    )
    assert filings[1].form == "10-K"
