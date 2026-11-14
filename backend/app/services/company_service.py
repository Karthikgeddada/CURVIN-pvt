"""Company discovery service.

Owns the reference universe: provider selection, caching with TTL,
automatic fallback to deterministic fixtures, search/filter/pagination
and profile assembly. Routes stay thin; every rule lives here.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.errors import DomainError
from app.providers.base import Company
from app.providers.fixtures import FixtureCompanyProvider
from app.providers.sec_edgar import SecEdgarCompanyProvider

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 6 * 60 * 60  # reference data changes rarely


@dataclass(frozen=True)
class DataSourceInfo:
    provider: str
    label: str
    degraded: bool

    def as_dict(self) -> dict[str, object]:
        return {
            "provider": self.provider,
            "label": self.label,
            "degraded": self.degraded,
        }


@dataclass(frozen=True)
class Universe:
    companies: list[Company]
    source: DataSourceInfo
    loaded_at: float  # unix epoch seconds


class CompanyService:
    """Serves company discovery from the best available provider.

    The primary (live) provider is tried first; on any failure the
    deterministic fixtures take over and every response is flagged
    ``degraded`` so clients can surface the fallback honestly.
    """

    def __init__(
        self,
        primary: SecEdgarCompanyProvider,
        fallback: FixtureCompanyProvider,
        cache_ttl_seconds: float = CACHE_TTL_SECONDS,
    ) -> None:
        self._primary = primary
        self._fallback = fallback
        self._cache_ttl = cache_ttl_seconds
        self._cache: Universe | None = None
        self._lock = asyncio.Lock()

    async def _load_universe(self) -> Universe:
        try:
            companies = await self._primary.load_universe()
            universe = Universe(
                companies=companies,
                source=DataSourceInfo(
                    provider=self._primary.name,
                    label=self._primary.label,
                    degraded=False,
                ),
                loaded_at=time.time(),
            )
        except Exception:
            logger.warning(
                "Primary company provider %s failed; serving deterministic "
                "fixtures as a degraded fallback.",
                self._primary.name,
                exc_info=True,
            )
            companies = await self._fallback.load_universe()
            universe = Universe(
                companies=companies,
                source=DataSourceInfo(
                    provider=self._fallback.name,
                    label=self._fallback.label,
                    degraded=True,
                ),
                loaded_at=time.time(),
            )
        return universe

    async def _universe(self) -> Universe:
        async with self._lock:
            if (
                self._cache is not None
                and time.time() - self._cache.loaded_at < self._cache_ttl
            ):
                return self._cache
            self._cache = await self._load_universe()
            return self._cache

    async def invalidate_cache(self) -> None:
        """Drop the cached universe (used by tests)."""
        async with self._lock:
            self._cache = None

    async def search(
        self,
        q: str = "",
        exchange: str = "",
        status: str = "",
        page: int = 1,
        limit: int = 25,
    ) -> dict[str, object]:
        universe = await self._universe()
        needle = q.strip().upper()

        def matches(company: Company) -> bool:
            if exchange and company.exchange != exchange:
                return False
            if status and company.status != status:
                return False
            if not needle:
                return True
            return needle in company.name.upper() or needle in company.ticker

        filtered = [c for c in universe.companies if matches(c)]
        total = len(filtered)
        start = (page - 1) * limit
        results = filtered[start : start + limit]
        return {
            "results": [_summary(c) for c in results],
            "total": total,
            "page": page,
            "limit": limit,
            "data_source": universe.source.as_dict(),
        }

    async def exchanges(self) -> dict[str, object]:
        universe = await self._universe()
        counts: dict[str, int] = {}
        for company in universe.companies:
            counts[company.exchange] = counts.get(company.exchange, 0) + 1
        ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        return {
            "exchanges": [
                {"code": code, "label": code, "company_count": count}
                for code, count in ordered
            ],
            "data_source": universe.source.as_dict(),
        }

    async def profile(self, ticker: str) -> dict[str, object]:
        universe = await self._universe()
        wanted = ticker.strip().upper()
        company = next(
            (c for c in universe.companies if c.ticker.upper() == wanted),
            None,
        )
        if company is None:
            raise DomainError(
                "company_not_found",
                f"No company found for ticker {wanted}.",
                status_code=404,
            )

        base, dot, suffix = company.ticker.partition(".")
        share_class = suffix.upper() if dot and suffix else None
        return {
            "identity": {
                "name": company.name,
                "ticker": company.ticker,
                "exchange": company.exchange,
                "cik": company.cik,
                "status": company.status,
                "share_class": share_class,
                "country": "United States",
                "website": None,
            },
            "business": {
                "description": None,
                "sector": company.sector,
                "industry": company.industry,
                "headquarters": None,
                "employees": None,
            },
            "market": None,
            "fundamentals_available": False,
            "data_source": universe.source.as_dict(),
            "as_of": _iso(universe.loaded_at),
        }


def _summary(company: Company) -> dict[str, object]:
    return {
        "name": company.name,
        "ticker": company.ticker,
        "exchange": company.exchange,
        "cik": company.cik,
        "sector": company.sector,
        "industry": company.industry,
        "status": company.status,
    }


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


# Process-wide singleton, assembled exactly once.
company_service = CompanyService(
    primary=SecEdgarCompanyProvider(),
    fallback=FixtureCompanyProvider(),
)
