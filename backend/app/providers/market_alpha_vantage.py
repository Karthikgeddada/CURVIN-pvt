"""Alpha Vantage market-quote provider.

The licensed-quote implementation behind the M2 market section.
Gated behind configuration — without ``CURVIN_MARKET_API_KEY`` the
market service serves an honest unavailability instead of simulated
prices. Free-tier quotas apply; the service layer adds no retries so
a quota breach surfaces as a degraded state rather than hammering the
provider.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx

from app.providers.base import Quote

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://www.alphavantage.co/query"


class AlphaVantageMarketProvider:
    """Live quotes from the Alpha Vantage GLOBAL_QUOTE endpoint."""

    name = "alpha-vantage"
    label = "Alpha Vantage"

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 8.0,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._timeout = timeout

    async def get_quote(self, ticker: str) -> Quote | None:
        symbol = ticker.strip().upper().replace(".", "-")
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": self._api_key,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(self._base_url, params=params)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()

        entry = payload.get("Global Quote") or {}
        price_raw = entry.get("05. price")
        # Alpha Vantage returns an empty object for unknown symbols and
        # quota breaches alike — distinguish by asking for the note.
        if not price_raw and entry.get("Note"):
            raise RuntimeError("Alpha Vantage quota exceeded")
        if not price_raw:
            return None

        price = float(price_raw)
        previous_close = float(entry.get("08. previous close") or price)
        change = float(entry.get("09. change") or 0.0)
        change_percent_raw = str(entry.get("10. change percent") or "0%")
        try:
            change_percent = float(change_percent_raw.rstrip("%"))
        except ValueError:
            change_percent = 0.0

        return Quote(
            ticker=ticker.strip().upper(),
            price=price,
            previous_close=previous_close,
            change=change,
            change_percent=change_percent,
            currency="USD",
            market_capitalization=None,  # not part of GLOBAL_QUOTE
            as_of=time.time(),
            data_delay="delayed",  # free tier is 15-minute delayed
        )


def provider_from_env() -> AlphaVantageMarketProvider | None:
    """Build the licensed quote provider when configuration allows."""
    if os.environ.get("CURVIN_MARKET_PROVIDER", "").lower() != "alphavantage":
        return None
    api_key = os.environ.get("CURVIN_MARKET_API_KEY", "")
    if not api_key:
        logger.warning(
            "CURVIN_MARKET_PROVIDER=alphavantage but CURVIN_MARKET_API_KEY "
            "is unset; market quotes will be reported as unconfigured."
        )
        return None
    return AlphaVantageMarketProvider(api_key=api_key)
