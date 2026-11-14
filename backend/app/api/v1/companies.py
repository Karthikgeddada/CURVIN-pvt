"""Company discovery endpoints.

Thin HTTP adapters over ``CompanyService`` — request parsing and
validation only; every business rule lives in the service layer.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.errors import DomainError
from app.services.company_service import company_service

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


@router.get("/{ticker}")
async def get_company(ticker: str) -> dict[str, object]:
    """Full company profile for a ticker (e.g. NVDA, BRK.B)."""
    return await company_service.profile(ticker)
