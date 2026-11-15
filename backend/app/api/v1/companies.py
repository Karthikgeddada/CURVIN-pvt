"""Company discovery endpoints.

Thin HTTP adapters over ``CompanyService`` — request parsing and
validation only; every business rule lives in the service layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.errors import DomainError
from app.services.company_service import company_service
from app.services.intelligence_service import intelligence_service
from app.services.market_service import market_service
from app.services.news_analysis_service import news_analysis_service

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/search")
async def search_companies(
    q: str = Query(default="", max_length=100, description="Name or ticker fragment"),
    exchange: str = Query(default="", max_length=32),
    status: str = Query(default="", max_length=16),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
) -> dict[str, object]:
    """Search the company universe by name or ticker, with filters."""
    if status and status not in {"active", "inactive"}:
        # Unknown is a valid reference state, but not a user filter.
        raise DomainError(
            "invalid_status_filter",
            "status must be one of: active, inactive.",
        )
    return await company_service.search(
        q=q, exchange=exchange, status=status, page=page, limit=limit
    )


@router.get("/exchanges")
async def list_exchanges() -> dict[str, object]:
    """Supported exchanges with coverage counts."""
    return await company_service.exchanges()


@router.get("/{ticker}/market")
async def get_company_market(ticker: str) -> dict[str, object]:
    """Licensed market quote for a ticker, or an honest unavailability."""
    return await market_service.quote_payload(ticker)


@router.get("/{ticker}/fundamentals")
async def get_company_fundamentals(ticker: str) -> dict[str, object]:
    """Audited annual financials keyed by CIK from SEC XBRL facts."""
    return await intelligence_service.fundamentals_payload(ticker)


@router.get("/{ticker}/filings")
async def get_company_filings(
    ticker: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> dict[str, object]:
    """Recent SEC filings keyed by CIK, newest first."""
    return await intelligence_service.filings_payload(ticker, limit=limit)


@router.get("/{ticker}/news-analysis")
async def get_company_news_analysis(
    ticker: str,
    window_hours: int = Query(default=24, ge=6, le=72),
    limit: int = Query(default=25, ge=5, le=50),
) -> dict[str, object]:
    """Sentiment analysis of recent news for a ticker: per-article
    verdicts with reasons, plus the overall positive/negative/neutral
    split for the look-back window."""
    return await news_analysis_service.analysis_payload(
        ticker, window_hours=window_hours, limit=limit
    )


@router.get("/{ticker}")
async def get_company(ticker: str) -> dict[str, object]:
    """Full company profile for a ticker (e.g. NVDA, BRK.B)."""
    return await company_service.profile(ticker)
