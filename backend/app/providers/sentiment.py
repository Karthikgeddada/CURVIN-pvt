"""Sentiment engines for stock market analysis.

Two implementations behind one contract:

* ``LexiconSentimentEngine`` — deterministic, finance-oriented keyword
  scoring. Zero cost, instant, fully explainable (the reason names the
  matched terms). Serves as the always-available fallback and the
  default when no LLM is configured. Every verdict it produces is
  honestly labelled heuristic via its engine name.
* ``LlmSentimentEngine`` — one batched request to any OpenAI-compatible
  chat endpoint (Gemini's OpenAI-compatible surface by default). Each
  verdict carries the model's own confidence and a short written reason.

Selection is env-driven (``CURVIN_LLM_API_KEY`` presence enables the
LLM engine); the service layer falls back to the lexicon when the LLM
fails, and flags the payload degraded so the UI never presents a
heuristic as model output.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import httpx

from app.providers.base import ArticleSentiment, NewsArticle

logger = logging.getLogger(__name__)

VALID_LABELS = ("positive", "negative", "neutral")


# --- Deterministic lexicon engine -------------------------------------

_POSITIVE_TERMS = (
    "beat", "beats", "record", "surge", "surges", "soar", "soars",
    "rally", "rallies", "upgrade", "upgraded", "outperform", "growth",
    "profit", "profits", "gain", "gains", "boost", "boosts", "strong",
    "stronger", "optimistic", "bullish", "expansion", "breakthrough",
    "recovery", "rebound", "rebounds", "jumps", "climbs", "rises",
    "wins", "approval", "approved", "buyback", "dividend", "partnership",
    "accelerates", "tops", "exceeds", "robust", "success", "thriving",
)

_NEGATIVE_TERMS = (
    "miss", "misses", "missed", "plunge", "plunges", "slump", "slumps",
    "fall", "falls", "fell", "drop", "drops", "dropped", "decline",
    "declines", "loss", "losses", "downgrade", "downgraded", "bearish",
    "weak", "weaker", "warning", "warns", "layoff", "layoffs", "cuts",
    "cut", "lawsuit", "sues", "sued", "probe", "investigation", "fraud",
    "recall", "bankruptcy", "default", "scandal", "selloff", "tumble",
    "tumbles", "crash", "crashes", "concern", "concerns", "risk",
    "risks", "delays", "halted", "fine", "penalty", "shortfall",
    "downturn", "recession", "disappointing", "bleak", "struggles",
    "grim", "warning signs", "crisis",
)

_TERM_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")


def _count_terms(text: str, terms) -> list[str]:
    """Whole-word, case-insensitive term match; returns matched terms."""
    words = set(_TERM_RE.findall(text.lower()))
    return [term for term in terms if term in words]


class LexiconSentimentEngine:
    """Deterministic keyword scorer — the honest baseline engine."""

    name = "lexicon"
    label = "Rule-based lexicon (heuristic)"

    async def score_batch(
        self, articles: list[NewsArticle]
    ) -> list[ArticleSentiment]:
        return [self._score(article) for article in articles]

    def _score(self, article: NewsArticle) -> ArticleSentiment:
        text = f"{article.title}. {article.description or ''}"
        positive = _count_terms(text, _POSITIVE_TERMS)
        negative = _count_terms(text, _NEGATIVE_TERMS)
        margin = len(positive) - len(negative)

        if margin > 0:
            label = "positive"
            confidence = min(0.9, 0.55 + 0.08 * margin)
        elif margin < 0:
            label = "negative"
            confidence = min(0.9, 0.55 + 0.08 * abs(margin))
        else:
            label = "neutral"
            matched = len(positive) + len(negative)
            confidence = 0.5 + 0.05 * min(matched, 6)

        if positive or negative:
            reason = (
                f"Heuristic read: {len(positive)} positive and "
                f"{len(negative)} negative signal terms in the headline"
            )
            if positive:
                reason += f" (positive: {', '.join(positive[:3])})"
            if negative:
                reason += f" (negative: {', '.join(negative[:3])})"
            reason += "."
        else:
            reason = (
                "Heuristic read: no strong positive or negative language "
                "in the headline, so it is classified neutral."
            )
        return ArticleSentiment(
            label=label,
            confidence=round(confidence, 2),
            reason=reason,
            engine=self.name,
        )


# --- LLM engine (OpenAI-compatible chat endpoint) ---------------------

DEFAULT_LLM_BASE_URL = (
    "https://generativelanguage.googleapis.com/v1beta/openai"
)
DEFAULT_LLM_MODEL = "gemini-2.0-flash"

_SYSTEM_PROMPT = (
    "You are a financial news sentiment analyst. For each numbered "
    "article about a stock, judge whether the article is positive, "
    "negative, or neutral for that company and its stock. Base the "
    "verdict only on what the article text says, not on outside "
    "knowledge of what happened later. Respond with ONLY a JSON array — "
    "no prose, no code fences — where element i corresponds to article "
    "i and is an object with keys: \"index\" (integer), \"label\" "
    "(\"positive\" | \"negative\" | \"neutral\"), \"confidence\" "
    "(number 0-1), and \"reason\" (one short sentence explaining why, "
    "in plain language)."
)


class LlmSentimentEngine:
    """Batch LLM judgement over an OpenAI-compatible chat endpoint."""

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_LLM_MODEL,
        base_url: str = DEFAULT_LLM_BASE_URL,
        timeout: float = 30.0,
        provider_name: str = "llm",
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self.name = provider_name
        self.label = f"LLM-judged ({model})"

    async def score_batch(
        self, articles: list[NewsArticle]
    ) -> list[ArticleSentiment]:
        if not articles:
            return []
        content = await self._complete(self._prompt(articles))
        return self._parse_verdicts(content, len(articles), articles)

    def _prompt(self, articles: list[NewsArticle]) -> str:
        lines = []
        for index, article in enumerate(articles):
            excerpt = article.description or "(no excerpt available)"
            lines.append(
                f"[{index}] {article.title}\n{excerpt}"
            )
        return "Judge these articles:\n\n" + "\n\n".join(lines)

    async def _complete(self, user_prompt: str) -> str:
        url = f"{self._base_url}/chat/completions"
        body = {
            "model": self._model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            payload: dict[str, Any] = response.json()
        try:
            return payload["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as cause:
            raise RuntimeError(
                "LLM response missing message content"
            ) from cause

    def _parse_verdicts(
        self,
        content: str,
        expected: int,
        articles: list[NewsArticle],
    ) -> list[ArticleSentiment]:
        """Strict parse: every article must get a valid verdict, else
        the caller falls back to the lexicon engine. All-or-nothing
        keeps the batch internally consistent."""
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        try:
            rows = json.loads(cleaned)
        except json.JSONDecodeError as cause:
            raise RuntimeError("LLM verdict is not valid JSON") from cause
        if not isinstance(rows, list) or len(rows) != expected:
            raise RuntimeError(
                f"LLM returned {len(rows) if isinstance(rows, list) else '?'} "
                f"verdicts for {expected} articles"
            )

        verdicts: list[ArticleSentiment] = []
        for index, article in enumerate(articles):
            row = rows[index]
            if not isinstance(row, dict):
                raise RuntimeError(f"Verdict {index} is not an object")
            label = str(row.get("label", "")).strip().lower()
            if label not in VALID_LABELS:
                raise RuntimeError(
                    f"Verdict {index} has invalid label {label!r}"
                )
            try:
                confidence = float(row.get("confidence", 0.5))
            except (TypeError, ValueError) as cause:
                raise RuntimeError(
                    f"Verdict {index} has non-numeric confidence"
                ) from cause
            confidence = min(1.0, max(0.0, confidence))
            reason = str(row.get("reason", "")).strip()
            if not reason:
                reason = "No explanation was returned for this verdict."
            verdicts.append(
                ArticleSentiment(
                    label=label,
                    confidence=round(confidence, 2),
                    reason=reason,
                    engine=self.name,
                )
            )
        return verdicts


def engine_from_env() -> LlmSentimentEngine | None:
    """Build the LLM engine when configured, else None (the service
    then uses the deterministic lexicon engine as its primary)."""
    api_key = os.environ.get("CURVIN_LLM_API_KEY", "")
    if not api_key:
        return None
    return LlmSentimentEngine(
        api_key=api_key,
        model=os.environ.get("CURVIN_LLM_MODEL", DEFAULT_LLM_MODEL),
        base_url=os.environ.get("CURVIN_LLM_BASE_URL", DEFAULT_LLM_BASE_URL),
        provider_name=os.environ.get("CURVIN_LLM_PROVIDER", "llm"),
    )