"""Market quote service.

Serves licensed quotes when a provider is configured and reachable.
There is deliberately no fixture fallback for prices: CURVIN never
presents simulated numbers as market data. Absence is reported as an
honest unavailability, with the reason in ``data_source``.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from app.providers.base import MarketQuoteProvider, Quote

logger = logging.getLogger(__name__)


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


class MarketService:
    """Serves quotes from the configured licensed provider, or nothing."""

    def __init__(self, quote_provider: MarketQuoteProvider | None) -> None:
        # None means no licensed provider is configured for the
        # deployment — every response then says so explicitly.
        self._provider = quote_provider

    @property
    def configured(self) -> bool:
        return self._provider is not None

    async def quote_payload(self, ticker: str) -> dict[str, object]:
        wanted = ticker.strip().upper()
        if self._provider is None:
            return {
                "ticker": wanted,
                "quote": None,
                "data_source": {
                    "provider": "none",
                    "label": "No market data provider configured",
                    "degraded": False,
                },
                "as_of": _iso(time.time()),
            }
        try:
            quote: Quote | None = await self._provider.get_quote(wanted)
        except Exception:
            logger.warning(
                "Market provider %s failed for %s; serving honest "
                "unavailability.",
                self._provider.name,
                wanted,
                exc_info=True,
            )
            return {
                "ticker": wanted,
                "quote": None,
                "data_source": {
                    "provider": self._provider.name,
                    "label": f"{self._provider.label} (unavailable)",
                    "degraded": True,
                },
                "as_of": _iso(time.time()),
            }
        if quote is None:
            return {
                "ticker": wanted,
                "quote": None,
                "data_source": {
                    "provider": self._provider.name,
                    "label": f"{self._provider.label} — no quote for ticker",
                    "degraded": False,
                },
                "as_of": _iso(time.time()),
            }
        return {
            "ticker": wanted,
            "quote": {
                "price": quote.price,
                "previous_close": quote.previous_close,
                "change": quote.change,
                "change_percent": quote.change_percent,
                "currency": quote.currency,
                "market_capitalization": quote.market_capitalization,
                "as_of": _iso(quote.as_of),
                "data_delay": quote.data_delay,
            },
            "data_source": {
                "provider": self._provider.name,
                "label": self._provider.label,
                "degraded": False,
            },
            "as_of": _iso(time.time()),
        }


# Process-wide singleton: the licensed quote provider is built from the
# environment exactly once. Without configuration the service serves
# honest unavailability for every ticker.
from app.providers.market_alpha_vantage import provider_from_env

market_service = MarketService(quote_provider=provider_from_env())
