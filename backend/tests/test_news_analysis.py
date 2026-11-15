"""Stock market analysis tests: news provider, sentiment engines,
aggregation service and the /news-analysis route.

Discovery runs on the deterministic fixtures (primary provider forced
to fail, exactly like test_intelligence). Live provider and LLM
behaviour are exercised with stubs — no network, fully reproducible.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from app.providers.base import ArticleSentiment, NewsArticle
from app.providers.sentiment import (
    LlmSentimentEngine,
    LexiconSentimentEngine,
)
from app.services.company_service import company_service
from app.services.news_analysis_service import (
    NewsAnalysisService,
    news_analysis_service,
)


class _PrimaryFailure:
    name = "stub-failure"
    label = "Stub (failing)"

    async def load_universe(self):
        raise RuntimeError("upstream unavailable")


@pytest.fixture(autouse=True)
def _force_fixture_universe(monkeypatch: pytest.MonkeyPatch):
    company_service._cache = None
    monkeypatch.setattr(company_service, "_primary", _PrimaryFailure())
    news_analysis_service._cache.clear()
    yield
    company_service._cache = None
    news_analysis_service._cache.clear()


BASE = "/api/v1/companies"


def _run(coro):
    return asyncio.run(coro)


def _article(title: str, **overrides) -> NewsArticle:
    fields = dict(
        title=title,
        source="Stub Wire",
        published_at="2026-11-15T10:00:00+00:00",
        url="https://example.com/story",
        description=None,
    )
    fields.update(overrides)
    return NewsArticle(**fields)


def _verdict(label: str, confidence: float = 0.8, reason: str = "because"):
    return ArticleSentiment(
        label=label, confidence=confidence, reason=reason, engine="stub"
    )


class _StubNews:
    name = "stub-news"
    label = "Stub News"

    def __init__(self, articles=None, error: Exception | None = None):
        self._articles = articles or []
        self._error = error
        self.calls: list[tuple[str, int, int]] = []

    async def get_recent(self, ticker: str, window_hours: int, limit: int):
        self.calls.append((ticker, window_hours, limit))
        if self._error:
            raise self._error
        return self._articles


class _StubEngine:
    name = "stub-engine"
    label = "Stub Engine"

    def __init__(self, verdicts=None, error: Exception | None = None):
        self._verdicts = verdicts
        self._error = error

    async def score_batch(self, articles):
        if self._error:
            raise self._error
        return [self._verdicts[0]] * len(articles)


def _service(news, engine) -> NewsAnalysisService:
    return NewsAnalysisService(
        companies=company_service,
        news_provider=news,
        sentiment_engine=engine,
    )


# --- Lexicon engine ---------------------------------------------------


def test_lexicon_scores_positive_headline():
    engine = LexiconSentimentEngine()
    verdict = _run(
        engine.score_batch(
            [_article("Nvidia beats expectations as profit hits record")]
        )
    )[0]
    assert verdict.label == "positive"
    assert verdict.confidence > 0.5
    assert "positive:" in verdict.reason.lower()
    assert verdict.engine == "lexicon"


def test_lexicon_scores_negative_headline():
    engine = LexiconSentimentEngine()
    verdict = _run(
        engine.score_batch(
            [_article("Shares plunge after company warns of layoffs")]
        )
    )[0]
    assert verdict.label == "negative"
    assert "negative:" in verdict.reason.lower()


def test_lexicon_scores_plain_headline_neutral():
    engine = LexiconSentimentEngine()
    verdict = _run(
        engine.score_batch([_article("Company schedules annual meeting")])
    )[0]
    assert verdict.label == "neutral"
    assert "no strong positive or negative" in verdict.reason.lower()


def test_lexicon_verdicts_are_deterministic():
    engine = LexiconSentimentEngine()
    first = _run(engine.score_batch([_article("Stock surges on upgrade")]))
    second = _run(engine.score_batch([_article("Stock surges on upgrade")]))
    assert first == second


# --- LLM engine parsing -----------------------------------------------


def _llm_engine() -> LlmSentimentEngine:
    return LlmSentimentEngine(api_key="stub-key")


def test_llm_parse_accepts_clean_json():
    engine = _llm_engine()
    articles = [_article("a"), _article("b")]
    content = json.dumps(
        [
            {"index": 0, "label": "positive", "confidence": 0.9, "reason": "strong beats"},
            {"index": 1, "label": "negative", "confidence": 0.7, "reason": "misses cited"},
        ]
    )
    verdicts = engine._parse_verdicts(content, 2, articles)
    assert [v.label for v in verdicts] == ["positive", "negative"]
    assert verdicts[0].confidence == 0.9


def test_llm_parse_strips_code_fences():
    engine = _llm_engine()
    content = "```json\n" + json.dumps(
        [{"index": 0, "label": "neutral", "confidence": 0.6, "reason": "flat"}]
    ) + "\n```"
    verdicts = engine._parse_verdicts(content, 1, [_article("a")])
    assert verdicts[0].label == "neutral"


def test_llm_parse_rejects_bad_label():
    engine = _llm_engine()
    content = json.dumps(
        [{"index": 0, "label": "bullish", "confidence": 0.9, "reason": "x"}]
    )
    with pytest.raises(RuntimeError):
        engine._parse_verdicts(content, 1, [_article("a")])


def test_llm_parse_rejects_incomplete_batch():
    engine = _llm_engine()
    content = json.dumps(
        [{"index": 0, "label": "positive", "confidence": 0.9, "reason": "x"}]
    )
    with pytest.raises(RuntimeError):
        engine._parse_verdicts(content, 2, [_article("a"), _article("b")])


def test_llm_parse_clamps_confidence():
    engine = _llm_engine()
    content = json.dumps(
        [{"index": 0, "label": "positive", "confidence": 7.5, "reason": "x"}]
    )
    verdict = engine._parse_verdicts(content, 1, [_article("a")])[0]
    assert verdict.confidence == 1.0


# --- Service aggregation ----------------------------------------------


def test_unconfigured_news_provider_is_honest():
    service = _service(None, _StubEngine())
    payload = _run(service.analysis_payload("NVDA"))
    assert payload["available"] is False
    assert payload["data_source"]["provider"] == "none"
    assert payload["data_source"]["degraded"] is False


def test_news_provider_failure_is_degraded():
    service = _service(
        _StubNews(error=RuntimeError("tier gated")), _StubEngine()
    )
    payload = _run(service.analysis_payload("NVDA"))
    assert payload["available"] is False
    assert payload["data_source"]["degraded"] is True
    assert "unavailable" in payload["data_source"]["label"]


def test_empty_window_is_not_degraded():
    service = _service(_StubNews(articles=[]), _StubEngine())
    payload = _run(service.analysis_payload("NVDA"))
    assert payload["available"] is False
    assert payload["data_source"]["degraded"] is False
    assert "no news" in payload["data_source"]["label"].lower()


def test_aggregation_shares_and_overall_label():
    articles = [_article(f"story {i}") for i in range(4)]
    news = _StubNews(articles=articles)

    class _Mixed(_StubEngine):
        async def score_batch(self, batch):
            labels = ["positive", "negative", "negative", "neutral"]
            return [
                _verdict(label, 0.9, f"reason {label}")
                for label in labels[: len(batch)]
            ]

    payload = _run(_service(news, _Mixed()).analysis_payload("NVDA"))
    assert payload["available"] is True
    assert payload["article_count"] == 4
    overall = payload["overall"]
    assert overall["label"] == "negative"
    assert overall["positive_pct"] == 25.0
    assert overall["negative_pct"] == 50.0
    assert overall["neutral_pct"] == 25.0
    assert "2 of 4" in overall["summary"]
    assert "Main drivers:" in overall["summary"]
    # Per-article verdicts ride along with their reasons.
    first = payload["articles"][0]["sentiment"]
    assert first["label"] == "positive"
    assert first["engine"] == "stub"


def test_engine_failure_falls_back_to_lexicon_degraded():
    articles = [_article("Shares plunge as probe widens")]
    service = _service(
        _StubNews(articles=articles),
        _StubEngine(error=RuntimeError("LLM down")),
    )
    payload = _run(service.analysis_payload("NVDA"))
    assert payload["available"] is True
    engine_info = payload["sentiment_engine"]
    assert engine_info["degraded"] is True
    assert "fallback" in engine_info["label"]
    verdict = payload["articles"][0]["sentiment"]
    assert verdict["engine"] == "lexicon"
    assert verdict["label"] == "negative"


def test_results_are_cached_per_ticker_and_window():
    news = _StubNews(articles=[_article("Shares surge on record quarter")])
    service = _service(news, _StubEngine(verdicts=[_verdict("positive")]))
    first = _run(service.analysis_payload("NVDA"))
    second = _run(service.analysis_payload("NVDA"))
    assert first["article_count"] == 1
    assert second["article_count"] == 1
    assert len(news.calls) == 1  # second call served from cache


def test_unknown_ticker_raises_company_not_found():
    service = _service(_StubNews(), _StubEngine())
    with pytest.raises(Exception) as excinfo:
        _run(service.analysis_payload("NOPE"))
    assert "company_not_found" in str(getattr(excinfo.value, "code", "")) or (
        "No company found" in str(excinfo.value)
    )


# --- Route ------------------------------------------------------------


def test_route_serves_analysis(client, monkeypatch):
    class _RouteEngine(_StubEngine):
        async def score_batch(self, batch):
            return [
                _verdict("negative", 0.85, "warning cited")
            ] * len(batch)

    monkeypatch.setattr(
        news_analysis_service,
        "_news",
        _StubNews(articles=[_article("Company warns of weaker demand")]),
    )
    monkeypatch.setattr(news_analysis_service, "_engine", _RouteEngine())
    response = client.get(f"{BASE}/NVDA/news-analysis")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["ticker"] == "NVDA"
    assert body["window_hours"] == 24
    assert body["overall"]["label"] == "negative"
    assert body["articles"][0]["sentiment"]["reason"] == "warning cited"


def test_route_validates_window(client, monkeypatch):
    monkeypatch.setattr(news_analysis_service, "_news", _StubNews())
    response = client.get(f"{BASE}/NVDA/news-analysis?window_hours=3")
    assert response.status_code == 422


def test_route_unknown_ticker_is_404(client):
    response = client.get(f"{BASE}/NOPE/news-analysis")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "company_not_found"