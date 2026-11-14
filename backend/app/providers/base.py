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
