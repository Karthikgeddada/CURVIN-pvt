"""Company intelligence service (M2): fundamentals and filings.

Both resources are keyed by CIK from the governed reference universe
and served live from SEC EDGAR. When the live feed is unreachable the
service reports an honest unavailability — no substitute financials,
no synthetic filing records, ever.

Company-facts payloads are large, so annual figures are cached per
CIK with a TTL tuned for filings data (they change a few times a
year, not per minute).
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.errors import DomainError
from app.providers.base import Filing, FiscalYear
from app.providers.filings_sec_edgar import SecEdgarFilingsProvider
from app.providers.fundamentals_sec_edgar import SecEdgarFundamentalsProvider
from app.services.company_service import CompanyService, DataSourceInfo, company_service

logger = logging.getLogger(__name__)

FUNDAMENTALS_TTL_SECONDS = 12 * 60 * 60  # audited annuals change rarely
FILINGS_TTL_SECONDS = 15 * 60  # new filings arrive daily at most


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


@dataclass(frozen=True)
class _Cached:
    value: object
    source: DataSourceInfo
    loaded_at: float


class IntelligenceService:
    """CIK-keyed fundamentals and filings with per-CIK TTL caching."""

    def __init__(
        self,
        companies: CompanyService,
        fundamentals_provider: SecEdgarFundamentalsProvider | None = None,
        filings_provider: SecEdgarFilingsProvider | None = None,
        fundamentals_ttl: float = FUNDAMENTALS_TTL_SECONDS,
        filings_ttl: float = FILINGS_TTL_SECONDS,
    ) -> None:
        self._companies = companies
        self._fundamentals = fundamentals_provider or SecEdgarFundamentalsProvider()
        self._filings = filings_provider or SecEdgarFilingsProvider()
        self._fundamentals_ttl = fundamentals_ttl
        self._filings_ttl = filings_ttl
        self._fundamentals_cache: dict[str, _Cached] = {}
        self._filings_cache: dict[str, _Cached] = {}
        self._lock = asyncio.Lock()

    async def _company_or_404(self, ticker: str):
        return await self._companies.resolve(ticker)

    async def _fetch_cached(
        self,
        cik: str,
        cache: dict[str, _Cached],
        ttl: float,
        provider,
        fetch,
        resource_label: str,
    ) -> tuple[object, DataSourceInfo]:
        """Shared fetch-or-cache with honest failure reporting."""
        async with self._lock:
            hit = cache.get(cik)
            if hit is not None and time.time() - hit.loaded_at < ttl:
                return hit.value, hit.source
        try:
            value = await fetch(cik)
        except Exception:
            logger.warning(
                "%s failed for CIK %s; serving honest unavailability.",
                resource_label,
                cik,
                exc_info=True,
            )
            source = DataSourceInfo(
                provider=provider.name,
                label=f"{provider.label} (unavailable)",
                degraded=True,
            )
            return None, source
        source = DataSourceInfo(
            provider=provider.name,
            label=provider.label,
            degraded=False,
        )
        async with self._lock:
            cache[cik] = _Cached(value=value, source=source, loaded_at=time.time())
        return value, source

    async def fundamentals_payload(self, ticker: str) -> dict[str, object]:
        company = await self._company_or_404(ticker)
        if not company.cik:
            return {
                "ticker": company.ticker,
                "available": False,
                "fiscal_years": [],
                "data_source": {
                    "provider": "none",
                    "label": "No CIK in reference data",
                    "degraded": False,
                },
                "as_of": _iso(time.time()),
            }
        years, source = await self._fetch_cached(
            company.cik,
            self._fundamentals_cache,
            self._fundamentals_ttl,
            self._fundamentals,
            self._fundamentals.get_annual,
            "Fundamentals provider",
        )
        year_dicts = [
            {
                "fiscal_year": y.fiscal_year,
                "period_end": y.period_end,
                "currency": y.currency,
                "revenue": y.revenue,
                "net_income": y.net_income,
                "operating_income": y.operating_income,
                "total_assets": y.total_assets,
                "stockholders_equity": y.stockholders_equity,
                "diluted_eps": y.diluted_eps,
            }
            for y in (years or [])
        ]
        return {
            "ticker": company.ticker,
            "available": bool(year_dicts),
            "fiscal_years": year_dicts,
            "data_source": source.as_dict(),
            "as_of": _iso(time.time()),
        }

    async def filings_payload(
        self, ticker: str, limit: int = 10
    ) -> dict[str, object]:
        company = await self._company_or_404(ticker)
        if not company.cik:
            return {
                "ticker": company.ticker,
                "filings": [],
                "data_source": {
                    "provider": "none",
                    "label": "No CIK in reference data",
                    "degraded": False,
                },
                "as_of": _iso(time.time()),
            }
        filings, source = await self._fetch_cached(
            company.cik,
            self._filings_cache,
            self._filings_ttl,
            self._filings,
            lambda cik: self._filings.get_recent(cik, limit=limit),
            "Filings provider",
        )
        filing_dicts = [
            {
                "form": f.form,
                "filed_at": f.filed_at,
                "accession_no": f.accession_no,
                "report_period": f.report_period,
                "primary_document": f.primary_document,
                "url": f.document_url(company.cik),
            }
            for f in (filings or [])
        ]
        return {
            "ticker": company.ticker,
            "filings": filing_dicts,
            "data_source": source.as_dict(),
            "as_of": _iso(time.time()),
        }


# Process-wide singletons, assembled exactly once. Market stays a
# separate module (different lifecycle: env-gated licensed provider).
intelligence_service = IntelligenceService(company_service)
