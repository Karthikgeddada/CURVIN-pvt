"""SEC EDGAR filings provider (submissions feed).

Reads the public ``submissions`` API — the real filing history keyed
by CIK. Only what the feed actually reports is served; if the feed is
unreachable the service layer reports an honest unavailability rather
than standing in a substitute.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from app.providers.base import Filing

logger = logging.getLogger(__name__)

DEFAULT_URL = "https://data.sec.gov/submissions"


class SecEdgarFilingsProvider:
    """Live recent filings from the SEC submissions feed."""

    name = "sec-edgar"
    label = "SEC EDGAR"

    def __init__(
        self,
        base_url: str = DEFAULT_URL,
        timeout: float = 12.0,
    ) -> None:
        self._base_url = base_url
        self._timeout = timeout

    async def get_recent(self, cik: str, limit: int = 10) -> list[Filing]:
        cik_int = str(int(cik))
        url = f"{self._base_url}/CIK{cik_int.zfill(10)}.json"
        user_agent = os.environ.get(
            "CURVIN_SEC_USER_AGENT",
            "CURVIN Research research@curvin.example",
        )
        async with httpx.AsyncClient(
            timeout=self._timeout,
            headers={"User-Agent": user_agent},
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()

        recent: dict[str, list[Any]] = payload.get("filings", {}).get(
            "recent", {}
        )
        forms = recent.get("form", [])
        if not forms:
            return []

        filings: list[Filing] = []
        for index in range(min(len(forms), limit)):
            filed_raw = recent.get("filingDate", [])[index] if index < len(
                recent.get("filingDate", [])
            ) else None
            if not filed_raw:
                continue
            filings.append(
                Filing(
                    form=str(forms[index]),
                    filed_at=str(filed_raw),
                    accession_no=str(recent.get("accessionNumber", [])[index]),
                    report_period=(
                        str(recent["reportDate"][index])
                        if index < len(recent.get("reportDate", []))
                        and recent["reportDate"][index]
                        else None
                    ),
                    primary_document=(
                        str(recent["primaryDocument"][index])
                        if index < len(recent.get("primaryDocument", []))
                        and recent["primaryDocument"][index]
                        else None
                    ),
                )
            )
        logger.info("Parsed %d recent filings for CIK %s", len(filings), cik)
        return filings
