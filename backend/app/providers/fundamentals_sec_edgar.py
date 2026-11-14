"""SEC EDGAR fundamentals provider (XBRL company facts).

Reads the public ``companyfacts`` API — audited annual figures keyed
by CIK, exactly the governed-reference-data source the product docs
specify. Only reported values are served; missing concepts stay null.
Nothing is estimated, interpolated or synthesised.

The response payload is large (multi-MB), so results are cached by
CIK at the service layer with a TTL appropriate for filings data.
"""

from __future__ import annotations

import logging
import os
from collections import defaultdict
from datetime import date
from typing import Any

import httpx

from app.providers.base import FiscalYear

logger = logging.getLogger(__name__)

DEFAULT_URL = "https://data.sec.gov/api/xbrl/companyfacts"

# XBRL concepts mapped to the FiscalYear fields they feed. Revenue has
# two common tags; both are accepted, preferring the generic one.
_CONCEPTS: dict[str, tuple[str, ...]] = {
    "revenue": (
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
    ),
    "net_income": ("NetIncomeLoss",),
    "operating_income": ("OperatingIncomeLoss",),
    "total_assets": ("Assets",),
    "stockholders_equity": ("StockholdersEquity",),
    "diluted_eps": ("EarningsPerShareDiluted",),
}

MAX_YEARS = 6


def _annual_entries(concept: dict[str, Any]) -> list[dict[str, Any]]:
    """Annual (10-K) entries, deduplicated by period end date.

    Real payloads are messy: recent filings often carry no ``frame`` at
    all, balance-sheet instants use ``CYyyyyQ4I`` frames, and the same
    period is restated across multiple filings. Instead of relying on
    frames we take every 10-K entry, reject spans that are not ~one
    year long (interim/quarterly values), and keep for each period end
    the entry from the most recent filing (largest ``fy``) — the
    latest audited restatement of that period.
    """
    best: dict[str, dict[str, Any]] = {}
    for unit, entries in concept.get("units", {}).items():
        if unit not in ("USD", "USD/shares"):
            continue
        for e in entries:
            if e.get("form") != "10-K" or e.get("fp") != "FY":
                continue
            end = str(e.get("end") or "")
            if not end:
                continue
            start = str(e.get("start") or "")
            if start:
                # Duration concept — only accept spans of ~one fiscal
                # year so quarterly comparatives never leak in.
                try:
                    days = (
                        date.fromisoformat(end) - date.fromisoformat(start)
                    ).days
                except ValueError:
                    continue
                if not 300 <= days <= 380:
                    continue
            current = best.get(end)
            if current is None or (e.get("fy") or 0) >= (current.get("fy") or 0):
                best[end] = e
    return list(best.values())


class SecEdgarFundamentalsProvider:
    """Live annual financials from SEC XBRL company facts."""

    name = "sec-edgar"
    label = "SEC EDGAR"

    def __init__(
        self,
        base_url: str = DEFAULT_URL,
        timeout: float = 15.0,
    ) -> None:
        self._base_url = base_url
        self._timeout = timeout

    async def get_annual(self, cik: str) -> list[FiscalYear]:
        cik_int = str(int(cik))  # accepts both '1045810' and '0001045810'
        url = f"{self._base_url}/CIK{cik_int.zfill(10)}.json"
        user_agent = os.environ.get(
            "CURVIN_SEC_USER_AGENT",
            "CURVIN Research research@curvin.example",
        )
        async with httpx.AsyncClient(
            timeout=self._timeout,
            headers={"User-Agent": user_agent},
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()

        facts: dict[str, Any] = payload.get("facts", {}).get("us-gaap", {})
        if not facts:
            return []

        # value[year][field] — the first concept with a usable annual
        # entry wins (generic Revenues beats the contract-revenue tag).
        years: dict[int, dict[str, float]] = defaultdict(dict)
        period_ends: dict[int, str] = {}

        for field, concepts in _CONCEPTS.items():
            for concept_name in concepts:
                concept = facts.get(concept_name)
                if not concept:
                    continue
                for entry in _annual_entries(concept):
                    end = str(entry.get("end", ""))
                    if not end:
                        continue
                    year = int(end[:4])
                    if field not in years[year]:
                        years[year][field] = float(entry["val"])
                        period_ends[year] = end

        result: list[FiscalYear] = []
        for year in sorted(years, reverse=True)[:MAX_YEARS]:
            row = years[year]
            result.append(
                FiscalYear(
                    fiscal_year=year,
                    period_end=period_ends[year],
                    currency="USD",
                    revenue=row.get("revenue"),
                    net_income=row.get("net_income"),
                    operating_income=row.get("operating_income"),
                    total_assets=row.get("total_assets"),
                    stockholders_equity=row.get("stockholders_equity"),
                    diluted_eps=row.get("diluted_eps"),
                )
            )
        logger.info("Parsed %d fiscal years for CIK %s", len(result), cik)
        return result
