"""Massive news provider (ticker-filtered, Polygon-style REST API).

Serves recent stories from Massive's ``/v2/reference/news`` endpoint,
filtered to one ticker and a look-back window. The provider is
env-gated exactly like the market providers: ``CURVIN_NEWS_PROVIDER``
selects the implementation and ``CURVIN_NEWS_API_KEY`` authenticates
it, falling back to the Massive market key when the news key is unset
(same vendor, one dashboard). Without configuration the news analysis
service reports an honest unconfigured state.

Note: the free "Stocks Basic" tier may not include the news endpoint;
any transport failure surfaces as a degraded, honest unavailability —
never as invented stories.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.providers.base import NewsArticle

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.massive.com/v2/reference/news"

# Provider payloads can be verbose; only the excerpt passed to the
# sentiment engines is trimmed, never the stored title or URL.
MAX_DESCRIPTION_CHARS = 600


class MassiveNewsProvider:
    """Recent ticker news from the Massive reference news endpoint."""

    name = "massive"
    label = "Massive news"

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 8.0,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    async def get_recent(
        self, ticker: str, window_hours: int, limit: int
    ) -> list[NewsArticle]:
        wanted = ticker.strip().upper()
        since = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        params = {
            "ticker": wanted,
            "published_utc.gte": since.isoformat().replace("+00:00", "Z"),
            "order": "desc",
            "sort": "published_utc",
            "limit": str(limit),
            # The free tier authenticates with the key in the query
            # string, exactly as the market endpoints do.
            "apiKey": self._api_key,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(self._base_url, params=params)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()

        rows = payload.get("results") or []
        articles: list[NewsArticle] = []
        for row in rows:
            article = _to_article(row)
            if article is not None:
                articles.append(article)
        return articles


def _to_article(row: dict[str, Any]) -> NewsArticle | None:
    """Map one provider row, skipping malformed entries."""
    title = (row.get("title") or "").strip()
    url = (row.get("article_url") or "").strip()
    if not title or not url:
        return None
    publisher = row.get("publisher")
    if isinstance(publisher, dict):
        source = (publisher.get("name") or "").strip()
    elif isinstance(publisher, str):
        source = publisher.strip()
    else:
        source = ""
    published = (row.get("published_utc") or "").strip()
    description = (row.get("description") or "").strip() or None
    if description and len(description) > MAX_DESCRIPTION_CHARS:
        description = description[:MAX_DESCRIPTION_CHARS].rstrip() + "…"
    return NewsArticle(
        title=title,
        source=source or "Unknown source",
        published_at=published or datetime.now(timezone.utc).isoformat(),
        url=url,
        description=description,
    )


def provider_from_env() -> MassiveNewsProvider | None:
    """Build the configured news provider, or None when unconfigured.

    ``CURVIN_NEWS_PROVIDER=massive`` selects the implementation. The key
    comes from ``CURVIN_NEWS_API_KEY`` and falls back to the Massive
    market key, so a deployment that already runs Massive market quotes
    needs no extra environment variables.
    """
    provider_name = os.environ.get("CURVIN_NEWS_PROVIDER", "").lower()
    if not provider_name and os.environ.get("CURVIN_MARKET_PROVIDER", "").lower() == "massive":
        # Deploy with one Massive key serves news from the same vendor
        # without extra configuration.
        provider_name = "massive"
    if provider_name != "massive":
        return None
    api_key = os.environ.get("CURVIN_NEWS_API_KEY", "") or os.environ.get(
        "CURVIN_MARKET_API_KEY", ""
    )
    if not api_key:
        logger.warning(
            "CURVIN_NEWS_PROVIDER=massive but no API key is set; news "
            "analysis will be reported as unconfigured."
        )
        return None
    return MassiveNewsProvider(api_key=api_key)