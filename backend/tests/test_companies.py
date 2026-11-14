"""Company discovery API tests.

The primary provider is monkeypatched to fail for every test so the
suite runs entirely on the deterministic fixtures — no network, fully
reproducible. The live-success path is tested explicitly with a stub
provider."""

from __future__ import annotations

import httpx
import pytest

from app.providers.base import Company
from app.services.company_service import company_service


class _PrimaryFailure:
    """Stub primary provider that always fails, like a dead upstream."""

    name = "stub-failure"
    label = "Stub (failing)"

    async def load_universe(self) -> list[Company]:
        raise httpx.ConnectTimeout("upstream unavailable")


@pytest.fixture(autouse=True)
def _force_fallback(monkeypatch: pytest.MonkeyPatch):
    """Every test starts from an empty cache and a failing primary."""
    company_service._cache = None
    monkeypatch.setattr(
        company_service, "_primary", _PrimaryFailure(), raising=True
    )
    yield
    company_service._cache = None


BASE = "/api/v1/companies"


def test_search_by_ticker_fragment(client):
    response = client.get(f"{BASE}/search", params={"q": "AAPL"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["results"][0]["ticker"] == "AAPL"
    assert body["results"][0]["name"] == "Apple Inc."
    assert body["results"][0]["cik"] == "0000320193"


def test_search_by_partial_name_is_case_insensitive(client):
    response = client.get(f"{BASE}/search", params={"q": "nvidia"})
    assert response.status_code == 200
    results = response.json()["results"]
    assert any(r["ticker"] == "NVDA" for r in results)


def test_search_matches_multiple_companies(client):
    response = client.get(f"{BASE}/search", params={"q": "microsoft"})
    body = response.json()
    assert body["total"] >= 1
    assert all("MICROSOFT" in r["name"].upper() for r in body["results"])


def test_search_with_no_query_returns_full_universe(client):
    response = client.get(f"{BASE}/search")
    body = response.json()
    assert body["total"] > 30
    assert body["page"] == 1
    assert body["limit"] == 25
    assert len(body["results"]) == 25


def test_search_exchange_filter(client):
    response = client.get(f"{BASE}/search", params={"exchange": "NYSE"})
    body = response.json()
    assert body["total"] > 0
    assert all(r["exchange"] == "NYSE" for r in body["results"])


def test_search_status_filter_inactive(client):
    response = client.get(
        f"{BASE}/search", params={"status": "inactive"}
    )
    body = response.json()
    assert body["total"] == 2
    assert {r["ticker"] for r in body["results"]} == {"TWTR", "ATVI"}


def test_search_invalid_status_filter_rejected(client):
    response = client.get(
        f"{BASE}/search", params={"status": "delisted"}
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_status_filter"


def test_search_unknown_ticker_returns_empty(client):
    response = client.get(f"{BASE}/search", params={"q": "ZZZZZZ"})
    body = response.json()
    assert body["total"] == 0
    assert body["results"] == []


def test_search_pagination_slices_stably(client):
    first = client.get(
        f"{BASE}/search", params={"page": 1, "limit": 10}
    ).json()
    second = client.get(
        f"{BASE}/search", params={"page": 2, "limit": 10}
    ).json()
    assert first["total"] == second["total"]
    assert len(first["results"]) == 10
    assert len(second["results"]) == 10
    first_names = [r["name"] for r in first["results"]]
    second_names = [r["name"] for r in second["results"]]
    assert not set(first_names) & set(second_names)


def test_search_page_out_of_range_returns_empty(client):
    response = client.get(
        f"{BASE}/search", params={"page": 500, "limit": 25}
    )
    assert response.json()["results"] == []


def test_search_invalid_pagination_rejected(client):
    assert (
        client.get(f"{BASE}/search", params={"page": 0}).status_code == 422
    )
    assert (
        client.get(f"{BASE}/search", params={"limit": 500}).status_code == 422
    )


def test_fallback_is_flagged_degraded(client):
    body = client.get(f"{BASE}/search").json()
    assert body["data_source"]["provider"] == "fixtures"
    assert body["data_source"]["degraded"] is True


def test_exchanges_listed_with_counts(client):
    body = client.get(f"{BASE}/exchanges").json()
    exchanges = body["exchanges"]
    assert exchanges
    codes = {e["code"] for e in exchanges}
    assert {"NASDAQ", "NYSE"} <= codes
    counted = sum(e["company_count"] for e in exchanges)
    total = client.get(
        f"{BASE}/search", params={"limit": 100}
    ).json()["total"]
    assert counted == total


def test_profile_returns_identity_and_business(client):
    body = client.get(f"{BASE}/BRK.B").json()
    assert body["identity"]["name"] == "Berkshire Hathaway Inc."
    assert body["identity"]["ticker"] == "BRK.B"
    assert body["identity"]["exchange"] == "NYSE"
    assert body["identity"]["share_class"] == "B"
    assert body["identity"]["cik"] == "0001067983"
    assert body["identity"]["country"] == "United States"
    assert body["business"]["sector"] == "Financials"
    assert body["market"] is None
    assert body["fundamentals_available"] is False
    assert body["as_of"]


def test_profile_is_case_insensitive_on_ticker(client):
    response = client.get(f"{BASE}/nvda")
    assert response.status_code == 200
    assert response.json()["identity"]["ticker"] == "NVDA"


def test_profile_unknown_ticker_is_404_envelope(client):
    response = client.get(f"{BASE}/NOPE")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "company_not_found"


def test_live_provider_success_is_not_degraded(client, monkeypatch):
    class _PrimarySuccess:
        name = "stub-success"
        label = "Stub (success)"

        async def load_universe(self) -> list[Company]:
            return [
                Company(
                    name="Acme Corporation",
                    ticker="ACME",
                    exchange="NASDAQ",
                    cik="0000000001",
                    status="unknown",
                )
            ]

    company_service._cache = None
    monkeypatch.setattr(
        company_service, "_primary", _PrimarySuccess(), raising=True
    )
    body = client.get(f"{BASE}/search").json()
    assert body["data_source"]["provider"] == "stub-success"
    assert body["data_source"]["degraded"] is False
    assert body["total"] == 1


def test_provider_timeout_falls_back(client, monkeypatch):
    class _PrimaryTimeout:
        name = "stub-timeout"
        label = "Stub (timeout)"

        async def load_universe(self) -> list[Company]:
            raise httpx.ReadTimeout("timed out")

    company_service._cache = None
    monkeypatch.setattr(
        company_service, "_primary", _PrimaryTimeout(), raising=True
    )
    body = client.get(f"{BASE}/search", params={"q": "AAPL"}).json()
    assert body["data_source"]["degraded"] is True
    assert body["total"] == 1


def test_combined_filters_apply_together(client):
    response = client.get(
        f"{BASE}/search",
        params={"q": "a", "exchange": "NASDAQ", "status": "active"},
    )
    body = response.json()
    assert body["total"] > 0
    for row in body["results"]:
        assert row["exchange"] == "NASDAQ"
        assert row["status"] == "active"
        assert "A" in row["name"].upper() or "A" in row["ticker"].upper()
