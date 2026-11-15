"""SEC EDGAR company-reference provider.

Loads the public ``company_tickers_exchange.json`` dataset — cik, name,
ticker and exchange for every SEC registrant (10k+ entries). Exchange
names are normalised to upper case ("Nasdaq" -> "NASDAQ"); entries with
no exchange attribute are honestly labelled ``US Composite`` rather
than guessed. Sector and industry are not part of this dataset and are
therefore left unset — no inference.

This is the PRIMARY discovery source. When it is unreachable the
company service falls back to the deterministic fixtures and flags
every response as degraded.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from app.providers.base import Company

logger = logging.getLogger(__name__)

DEFAULT_URL = (
    "https://www.sec.gov/files/company_tickers_exchange.json"
)

# Entries whose exchange attribute is missing or unrecognised get this
# honest label instead of a guessed listing venue.
UNKNOWN_EXCHANGE = "US Composite"


def _normalise_exchange(raw: Any) -> str:
    """SEC writes "Nasdaq"/"NYSE"/"OTC"; CURVIN filters use upper case.

    A missing value stays honest ("US Composite"), never invented.
    """
    text = str(raw or "").strip().upper()
    return text if text else UNKNOWN_EXCHANGE


class SecEdgarCompanyProvider:
    """Live provider over the SEC EDGAR public dataset."""

    name = "sec-edgar"
    label = "SEC EDGAR"

    def __init__(self, url: str = DEFAULT_URL, timeout: float = 8.0) -> None:
        self._url = url
        self._timeout = timeout

    async def load_universe(self) -> list[Company]:
        # SEC requires a declared User-Agent identifying the caller.
        user_agent = os.environ.get(
            "CURVIN_SEC_USER_AGENT",
            "CURVIN Research research@curvin.example",
        )
        async with httpx.AsyncClient(
            timeout=self._timeout,
            headers={"User-Agent": user_agent},
            follow_redirects=True,
        ) as client:
            response = await client.get(self._url)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()

        # Shape: {"fields": ["cik", "name", "ticker", "exchange"],
        #          "data": [[320193, "Apple Inc.", "AAPL", "Nasdaq"], ...]}
        fields = payload.get("fields") or []
        rows = payload.get("data") or []
        if "ticker" not in fields or "name" not in fields:
            raise ValueError("SEC EDGAR dataset has an unexpected shape")
        index = {field: position for position, field in enumerate(fields)}

        companies: list[Company] = []
        seen: set[tuple[str, str]] = set()
        for row in rows:
            if not isinstance(row, list) or len(row) < len(fields):
                continue
            ticker = str(row[index["ticker"]] or "").strip().upper()
            # SEC writes multi-class and series tickers with a hyphen
            # ("BRK-B", "JPM-PC"); CURVIN's canonical notation — used
            # by the profile share-class parsing and by Massive's bars
            # API — is the dot form ("BRK.B"). A separator swap, never
            # a change to the symbol itself.
            ticker = ticker.replace("-", ".")
            name = str(row[index["name"]] or "").strip()
            if not ticker or not name:
                continue
            # The dataset can carry the same ticker on several rows
            # (e.g. multiple venues); keep the first, deterministically.
            key = (ticker, name.lower())
            if key in seen:
                continue
            seen.add(key)
            exchange = _normalise_exchange(
                row[index["exchange"]]
                if "exchange" in index
                else None
            )
            cik_value = row[index["cik"]] if "cik" in index else None
            companies.append(
                Company(
                    name=name,
                    ticker=ticker,
                    exchange=exchange,
                    cik=str(cik_value).zfill(10) if cik_value else None,
                    status="unknown",  # not part of this dataset
                )
            )
        if not companies:
            raise ValueError("SEC EDGAR returned an empty dataset")
        companies.sort(key=lambda company: company.name.lower())
        logger.info("SEC EDGAR provider loaded %d companies", len(companies))
        return companies
