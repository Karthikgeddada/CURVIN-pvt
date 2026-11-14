"""SEC EDGAR company-reference provider.

Loads the public ``company_tickers.json`` dataset (name, ticker, CIK
for every SEC registrant). Exchange attribution comes from a curated
map of well-known listings; everything else is honestly labelled
``US Composite`` rather than guessed. Sector and industry are not part
of this dataset and are therefore left unset — no inference.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from app.providers.base import Company

logger = logging.getLogger(__name__)

DEFAULT_URL = "https://www.sec.gov/files/company_tickers.json"

# Curated exchange attribution for widely-held listings. Entries not
# listed here are "US Composite" (multi-exchange or unknown).
_EXCHANGE_MAP: dict[str, str] = {
    "AAPL": "NASDAQ", "MSFT": "NASDAQ", "NVDA": "NASDAQ", "GOOGL": "NASDAQ",
    "AMZN": "NASDAQ", "META": "NASDAQ", "TSLA": "NASDAQ", "AMD": "NASDAQ",
    "INTC": "NASDAQ", "CSCO": "NASDAQ", "ADBE": "NASDAQ", "QCOM": "NASDAQ",
    "AVGO": "NASDAQ", "PEP": "NASDAQ", "NFLX": "NASDAQ", "COST": "NASDAQ",
    "TXN": "NASDAQ", "AMAT": "NASDAQ", "INTU": "NASDAQ", "CMCSA": "NASDAQ",
    "BRK.B": "NYSE", "JPM": "NYSE", "V": "NYSE", "JNJ": "NYSE", "WMT": "NYSE",
    "XOM": "NYSE", "UNH": "NYSE", "HD": "NYSE", "PG": "NYSE", "KO": "NYSE",
    "MCD": "NYSE", "ORCL": "NYSE", "CRM": "NYSE", "DIS": "NYSE", "NKE": "NYSE",
    "BA": "NYSE", "CAT": "NYSE", "GS": "NYSE", "BAC": "NYSE", "PFE": "NYSE",
    "T": "NYSE", "VZ": "NYSE", "MRK": "NYSE",
}


class SecEdgarCompanyProvider:
    """Live provider over the SEC EDGAR public dataset."""

    name = "sec-edgar"
    label = "SEC EDGAR"

    def __init__(self, url: str = DEFAULT_URL, timeout: float = 5.0) -> None:
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

        companies: list[Company] = []
        for entry in payload.values():
            ticker = str(entry.get("ticker_str", "")).strip().upper()
            name = str(entry.get("title", "")).strip()
            cik_value = entry.get("cik_str")
            if not ticker or not name:
                continue
            companies.append(
                Company(
                    name=name,
                    ticker=ticker,
                    exchange=_EXCHANGE_MAP.get(ticker, "US Composite"),
                    cik=str(cik_value).zfill(10) if cik_value else None,
                    status="unknown",
                )
            )
        if not companies:
            raise ValueError("SEC EDGAR returned an empty dataset")
        companies.sort(key=lambda company: company.name.lower())
        logger.info("SEC EDGAR provider loaded %d companies", len(companies))
        return companies
