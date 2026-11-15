"""Stock market analysis service: 24h news, judged and aggregated.

Pipeline per ticker: fetch recent stories from the configured news
provider, score each with the configured sentiment engine, then
aggregate into an overall tone with the share of positive / negative /
neutral articles and the reasons behind it.

Honesty rules inherited from the rest of CURVIN:

* No news provider configured, provider failure and an empty window
  are three distinct, explicitly labelled outcomes — never blended.
* A sentiment-engine failure falls back to the deterministic lexicon
  engine and the payload is flagged degraded, so a heuristic is never
  presented as model judgement.
* Results are cached per (ticker, window) with a short TTL; failures
  are never cached.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

from app.providers.base import ArticleSentiment, NewsArticle
from app.providers.sentiment import LexiconSentimentEngine
from app.services.company_service import CompanyService

logger = logging.getLogger(__name__)

NEWS_TTL_SECONDS = 15 * 60  # news cycles move; keep the window fresh
DEFAULT_WINDOW_HOURS = 24


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


def _unavailable(
    ticker: str, label: str, provider: str, degraded: bool
) -> dict[str, object]:
    return {
        "ticker": ticker,
        "window_hours": DEFAULT_WINDOW_HOURS,
        "available": False,
        "article_count": 0,
        "overall": None,
        "articles": [],
        "data_source": {
            "provider": provider,
            "label": label,
            "degraded": degraded,
        },
        "sentiment_engine": None,
        "as_of": _iso(time.time()),
    }


class NewsAnalysisService:
    """Fetches, scores and aggregates recent news per ticker."""

    def __init__(
        self,
        companies: CompanyService,
        news_provider,
        sentiment_engine,
        fallback_engine: LexiconSentimentEngine | None = None,
        ttl: float = NEWS_TTL_SECONDS,
    ) -> None:
        self._companies = companies
        self._news = news_provider
        self._engine = sentiment_engine
        self._fallback = fallback_engine or LexiconSentimentEngine()
        self._ttl = ttl
        self._cache: dict[tuple[str, int], tuple[dict, float]] = {}
        self._lock = asyncio.Lock()

    async def analysis_payload(
        self,
        ticker: str,
        window_hours: int = DEFAULT_WINDOW_HOURS,
        limit: int = 25,
    ) -> dict[str, object]:
        company = await self._companies.resolve(ticker)
        wanted = company.ticker.upper()
        key = (wanted, window_hours)

        async with self._lock:
            hit = self._cache.get(key)
            if hit is not None and time.time() - hit[1] < self._ttl:
                return hit[0]

        if self._news is None:
            return _unavailable(
                wanted,
                "No news provider configured",
                "none",
                False,
            )

        try:
            articles = await self._news.get_recent(
                wanted, window_hours, limit
            )
        except Exception:
            logger.warning(
                "News provider %s failed for %s; serving honest "
                "unavailability.",
                self._news.name,
                wanted,
                exc_info=True,
            )
            return _unavailable(
                wanted,
                f"{self._news.label} (unavailable)",
                self._news.name,
                True,
            )

        if not articles:
            payload = _unavailable(
                wanted,
                f"No news for {wanted} in the last {window_hours} hours",
                self._news.name,
                False,
            )
            async with self._lock:
                self._cache[key] = (payload, time.time())
            return payload

        engine = self._engine
        engine_degraded = False
        try:
            verdicts = await engine.score_batch(articles)
        except Exception:
            logger.warning(
                "Sentiment engine %s failed for %s; falling back to the "
                "deterministic lexicon engine (degraded).",
                getattr(engine, "name", engine),
                wanted,
                exc_info=True,
            )
            engine = self._fallback
            verdicts = await engine.score_batch(articles)
            engine_degraded = True

        payload = self._assemble(
            ticker=wanted,
            window_hours=window_hours,
            articles=articles,
            verdicts=verdicts,
            engine=engine,
            engine_degraded=engine_degraded,
        )
        async with self._lock:
            self._cache[key] = (payload, time.time())
        return payload

    def _assemble(
        self,
        ticker: str,
        window_hours: int,
        articles: list[NewsArticle],
        verdicts: list[ArticleSentiment],
        engine,
        engine_degraded: bool,
    ) -> dict[str, object]:
        scored = list(zip(articles, verdicts))
        counts = {"positive": 0, "negative": 0, "neutral": 0}
        confidence_sums = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
        for _, verdict in scored:
            counts[verdict.label] += 1
            confidence_sums[verdict.label] += verdict.confidence

        total = len(scored)
        shares = {
            label: round(counts[label] / total * 100.0, 1)
            for label in counts
        }

        # Dominant label: most articles first, then the higher summed
        # confidence, then a fixed order — fully deterministic.
        order = ("positive", "negative", "neutral")
        overall_label = max(
            order,
            key=lambda label: (
                counts[label],
                confidence_sums[label],
                -order.index(label),
            ),
        )
        overall = {
            "label": overall_label,
            "positive_pct": shares["positive"],
            "negative_pct": shares["negative"],
            "neutral_pct": shares["neutral"],
            "summary": self._summary(scored, overall_label, counts, total),
        }

        article_dicts = [
            {
                "title": article.title,
                "source": article.source,
                "published_at": article.published_at,
                "url": article.url,
                "sentiment": {
                    "label": verdict.label,
                    "confidence": verdict.confidence,
                    "reason": verdict.reason,
                    "engine": verdict.engine,
                },
            }
            for article, verdict in scored
        ]
        return {
            "ticker": ticker,
            "window_hours": window_hours,
            "available": True,
            "article_count": total,
            "overall": overall,
            "articles": article_dicts,
            "data_source": {
                "provider": self._news.name,
                "label": self._news.label,
                "degraded": False,
            },
            "sentiment_engine": {
                "provider": engine.name,
                "label": (
                    f"{engine.label} (fallback — primary engine failed)"
                    if engine_degraded
                    else engine.label
                ),
                "degraded": engine_degraded,
            },
            "as_of": _iso(time.time()),
        }

    def _summary(
        self,
        scored: list[tuple[NewsArticle, ArticleSentiment]],
        overall_label: str,
        counts: dict[str, int],
        total: int,
    ) -> str:
        """One honest sentence on what the verdicts say, and why."""
        if overall_label == "neutral" and counts["neutral"] == total:
            return (
                "No strongly positive or negative coverage was found in "
                "the last window; the overall read is neutral."
            )
        drivers = [
            verdict
            for _, verdict in scored
            if verdict.label == overall_label
        ]
        drivers.sort(key=lambda v: v.confidence, reverse=True)
        lead = (
            f"Overall {overall_label}: {counts[overall_label]} of "
            f"{total} recent articles read {overall_label}"
        )
        if counts["positive"] and overall_label != "positive":
            lead += f", {counts['positive']} positive"
        if counts["negative"] and overall_label != "negative":
            lead += f", {counts['negative']} negative"
        if counts["neutral"] and overall_label != "neutral":
            lead += f", {counts['neutral']} neutral"
        lead += "."
        if drivers:
            whys = "; ".join(v.reason for v in drivers[:2])
            lead += f" Main drivers: {whys}"
        return lead


# Process-wide singleton, assembled exactly once. The news provider is
# env-gated; the sentiment engine is the LLM when CURVIN_LLM_* is set,
# otherwise the deterministic lexicon engine.
from app.providers.news_massive import provider_from_env as _news_from_env  # noqa: E402
from app.providers.sentiment import engine_from_env as _engine_from_env  # noqa: E402
from app.services.company_service import company_service  # noqa: E402

news_analysis_service = NewsAnalysisService(
    companies=company_service,
    news_provider=_news_from_env(),
    sentiment_engine=_engine_from_env() or LexiconSentimentEngine(),
)