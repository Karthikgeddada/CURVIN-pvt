"""Provider contract and the canonical company reference record.

The record is deliberately minimal: only fields the reference data can
actually verify. Anything richer (prices, fundamentals) belongs to
other providers and other milestones.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Company:
    """One verified listing in the reference universe."""

    name: str
    ticker: str
    exchange: str
    cik: str | None
    sector: str | None = None
    industry: str | None = None
    status: str = "active"  # active | inactive | unknown


class CompanyProvider(Protocol):
    """Anything that can produce the full company universe."""

    name: str
    label: str

    async def load_universe(self) -> list[Company]:
        """Return every listing the provider knows about.

        Raises on any failure — the service layer decides whether to
        fall back; providers never return partial data silently.
        """
        ...  # pragma: no cover


# --- Market data (M2) -------------------------------------------------


@dataclass(frozen=True)
class Quote:
    """One verified market quote. Only ever sourced from a licensed
    provider — CURVIN never serves simulated or estimated prices."""

    ticker: str
    price: float
    previous_close: float
    change: float
    change_percent: float
    currency: str
    market_capitalization: float | None
    as_of: float  # unix epoch seconds
    data_delay: str  # realtime | delayed | eod


class MarketQuoteProvider(Protocol):
    """Anything that can produce current quotes for listed tickers."""

    name: str
    label: str

    async def get_quote(self, ticker: str) -> Quote | None:
        """Return the current quote, or None when the ticker is unknown.

        Raises on transport/provider failure — the service layer turns
        that into an honest unavailability, never into substitute data.
        """
        ...  # pragma: no cover


# --- Fundamentals (M2) ------------------------------------------------


@dataclass(frozen=True)
class FiscalYear:
    """One audited annual period, sourced from XBRL company facts."""

    fiscal_year: int
    period_end: str  # ISO date
    currency: str
    revenue: float | None
    net_income: float | None
    operating_income: float | None
    total_assets: float | None
    stockholders_equity: float | None
    diluted_eps: float | None


class FundamentalsProvider(Protocol):
    """Anything that can produce annual financials for a CIK."""

    name: str
    label: str

    async def get_annual(self, cik: str) -> list[FiscalYear]:
        """Return annual periods, most recent first. Raises on failure."""
        ...  # pragma: no cover


# --- Filings (M2) -----------------------------------------------------


@dataclass(frozen=True)
class Filing:
    """One SEC filing from the submissions feed."""

    form: str
    filed_at: str  # ISO date
    accession_no: str
    report_period: str | None  # ISO date, when reported
    primary_document: str | None

    def document_url(self, cik: str) -> str | None:
        """Public URL of the primary document, when one exists."""
        if not self.primary_document:
            return None
        cik_int = str(int(cik))
        no_dashes = self.accession_no.replace("-", "")
        return (
            f"https://www.sec.gov/Archives/edgar/data/"
            f"{cik_int}/{no_dashes}/{self.primary_document}"
        )


class FilingsProvider(Protocol):
    """Anything that can produce recent filings for a CIK."""

    name: str
    label: str

    async def get_recent(self, cik: str, limit: int = 10) -> list[Filing]:
        """Return the most recent filings, newest first. Raises on failure."""
        ...  # pragma: no cover


# --- News (stock market analysis on the company profile) --------------


@dataclass(frozen=True)
class NewsArticle:
    """One news story about a ticker, exactly as the provider published
    it. Sentiment is attached later, by a separate sentiment engine —
    the news provider itself never judges tone."""

    title: str
    source: str
    published_at: str  # ISO timestamp
    url: str
    description: str | None = None  # summary/body excerpt when offered


class NewsProvider(Protocol):
    """Anything that can produce recent news for a ticker."""

    name: str
    label: str

    async def get_recent(
        self, ticker: str, window_hours: int, limit: int
    ) -> list[NewsArticle]:
        """Return stories published within the look-back window, newest
        first. Raises on transport/provider failure — the service layer
        turns that into an honest unavailability, never filler content.
        """
        ...  # pragma: no cover


# --- Sentiment (stock market analysis on the company profile) ---------


@dataclass(frozen=True)
class ArticleSentiment:
    """One engine verdict on one article. ``reason`` is the honest why
    shown to the user; ``engine`` names the judge so heuristic output is
    never dressed up as model judgement."""

    label: str  # positive | negative | neutral
    confidence: float  # 0.0-1.0
    reason: str
    engine: str


class SentimentEngine(Protocol):
    """Anything that can judge the tone of a batch of articles."""

    name: str
    label: str

    async def score_batch(
        self, articles: list[NewsArticle]
    ) -> list[ArticleSentiment]:
        """Return one verdict per article, in input order. Raises on
        failure — the service layer falls back to its deterministic
        engine and flags the result as degraded.
        """
        ...  # pragma: no cover
