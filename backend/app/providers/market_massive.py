"""Massive market-quote provider (free tier, end-of-day).

Serves daily aggregate bars from Massive's stocks REST API. The free
"Stocks Basic" plan is end-of-day, so quotes are built from the last
two completed daily bars: latest close is the price, the bar before it
is the previous close, and the daily change is their real difference.
Nothing is estimated — when fewer than two bars exist the single bar
stands alone with a zero-change fallback, matching how the Alpha
Vantage provider handles a missing previous close.

Gated behind ``CURVIN_MARKET_PROVIDER=massive`` plus
``CURVIN_MARKET_API_KEY``; without them the market service reports an
honest unconfigured state instead of simulated prices.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import httpx

from app.providers.base import Quote

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.massive.com/v2/aggs/ticker"

# Look back far enough that weekends, holidays and ticker pauses still
# leave at least two completed daily bars in the window.
LOOKBACK_DAYS = 14


class MassiveMarketProvider:
    """End-of-day quotes from Massive daily aggregate bars."""

    name = "massive"
    label = "Massive (end-of-day)"

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 8.0,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    async def get_quote(self, ticker: str) -> Quote | None:
        wanted = ticker.strip().upper()
        today = date.today()
        url = (
            f"{self._base_url}/{wanted}/range/1/day/"
            f"{today - timedelta(days=LOOKBACK_DAYS)}/{today}"
        )
        async with httpx.AsyncClient(
            timeout=self._timeout,
            # The free tier authenticates with the key in the query
            # string, exactly as Massive's own docs show.
            params={"adjusted": "true", "apiKey": self._api_key},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()

        bars = payload.get("results") or []
        if not bars:
            # Unknown ticker (or nothing traded in the window) — an
            # honest "no quote", never an error or a substitute.
            return None

        latest = bars[-1]
        price = float(latest["c"])
        if len(bars) >= 2:
            previous_close = float(bars[-2]["c"])
            change = price - previous_close
            change_percent = (
                change / previous_close * 100.0 if previous_close else 0.0
            )
        else:
            # A single bar (e.g. a very recent listing): show the real
            # price; the previous close is simply not known yet.
            previous_close = price
            change = 0.0
            change_percent = 0.0

        as_of_ms = latest.get("t")
        as_of = (
            float(as_of_ms) / 1000.0
            if isinstance(as_of_ms, (int, float))
            else 0.0
        )

        return Quote(
            ticker=wanted,
            price=price,
            previous_close=previous_close,
            change=change,
            change_percent=change_percent,
            currency="USD",
            market_capitalization=None,  # not part of daily bars
            as_of=as_of,
            data_delay="eod",  # free tier is end-of-day
        )
