"""Deterministic company-reference fixtures.

A curated snapshot of real US listings (names, tickers, exchanges and
CIK numbers are genuine reference data). Served automatically when the
live provider is unreachable so discovery degrades gracefully instead
of failing — and flagged as degraded in every response.
"""

from __future__ import annotations

from app.providers.base import Company

# (name, ticker, exchange, cik, sector, industry, status)
_ROWS: list[tuple[str, str, str, str, str, str, str]] = [
    ("Apple Inc.", "AAPL", "NASDAQ", "0000320193", "Technology", "Consumer Electronics", "active"),
    ("Microsoft Corporation", "MSFT", "NASDAQ", "0000789019", "Technology", "Software — Infrastructure", "active"),
    ("NVIDIA Corporation", "NVDA", "NASDAQ", "0001045810", "Technology", "Semiconductors", "active"),
    ("Alphabet Inc.", "GOOGL", "NASDAQ", "0001652044", "Communication Services", "Internet Content", "active"),
    ("Amazon.com, Inc.", "AMZN", "NASDAQ", "0001018724", "Consumer Discretionary", "Internet Retail", "active"),
    ("Meta Platforms, Inc.", "META", "NASDAQ", "0001326801", "Communication Services", "Internet Content", "active"),
    ("Tesla, Inc.", "TSLA", "NASDAQ", "0001318605", "Consumer Discretionary", "Auto Manufacturers", "active"),
    ("Berkshire Hathaway Inc.", "BRK.B", "NYSE", "0001067983", "Financials", "Multi-Segment Holdings", "active"),
    ("JPMorgan Chase & Co.", "JPM", "NYSE", "0000019617", "Financials", "Diversified Banks", "active"),
    ("Visa Inc.", "V", "NYSE", "0001403161", "Financials", "Credit Services", "active"),
    ("Johnson & Johnson", "JNJ", "NYSE", "0000200406", "Healthcare", "Drug Manufacturers", "active"),
    ("Walmart Inc.", "WMT", "NYSE", "0000104169", "Consumer Staples", "Discount Stores", "active"),
    ("Exxon Mobil Corporation", "XOM", "NYSE", "0000034088", "Energy", "Oil & Gas Integrated", "active"),
    ("UnitedHealth Group Incorporated", "UNH", "NYSE", "0000731766", "Healthcare", "Healthcare Plans", "active"),
    ("The Home Depot, Inc.", "HD", "NYSE", "0000354950", "Consumer Discretionary", "Home Improvement Retail", "active"),
    ("The Procter & Gamble Company", "PG", "NYSE", "0000080424", "Consumer Staples", "Household Products", "active"),
    ("The Coca-Cola Company", "KO", "NYSE", "0000021344", "Consumer Staples", "Beverages", "active"),
    ("PepsiCo, Inc.", "PEP", "NASDAQ", "0000077476", "Consumer Staples", "Beverages", "active"),
    ("McDonald's Corporation", "MCD", "NYSE", "0000063908", "Consumer Discretionary", "Restaurants", "active"),
    ("Netflix, Inc.", "NFLX", "NASDAQ", "0001065280", "Communication Services", "Entertainment", "active"),
    ("Advanced Micro Devices, Inc.", "AMD", "NASDAQ", "0000002488", "Technology", "Semiconductors", "active"),
    ("Intel Corporation", "INTC", "NASDAQ", "0000050863", "Technology", "Semiconductors", "active"),
    ("Cisco Systems, Inc.", "CSCO", "NASDAQ", "0000858877", "Technology", "Communication Equipment", "active"),
    ("Oracle Corporation", "ORCL", "NYSE", "0001341439", "Technology", "Software — Infrastructure", "active"),
    ("Salesforce, Inc.", "CRM", "NYSE", "0001108524", "Technology", "Software — Application", "active"),
    ("Adobe Inc.", "ADBE", "NASDAQ", "0000796343", "Technology", "Software — Application", "active"),
    ("QUALCOMM Incorporated", "QCOM", "NASDAQ", "0000804328", "Technology", "Semiconductors", "active"),
    ("Broadcom Inc.", "AVGO", "NASDAQ", "0001730168", "Technology", "Semiconductors", "active"),
    ("The Walt Disney Company", "DIS", "NYSE", "0001744489", "Communication Services", "Entertainment", "active"),
    ("NIKE, Inc.", "NKE", "NYSE", "0000320187", "Consumer Discretionary", "Footwear & Apparel", "active"),
    ("The Boeing Company", "BA", "NYSE", "0000012927", "Industrials", "Aerospace & Defense", "active"),
    ("Caterpillar Inc.", "CAT", "NYSE", "0000018230", "Industrials", "Farm & Heavy Machinery", "active"),
    ("The Goldman Sachs Group, Inc.", "GS", "NYSE", "0000886982", "Financials", "Investment Banking", "active"),
    ("Bank of America Corporation", "BAC", "NYSE", "0000070858", "Financials", "Diversified Banks", "active"),
    ("Pfizer Inc.", "PFE", "NYSE", "0000078003", "Healthcare", "Drug Manufacturers", "active"),
    ("AT&T Inc.", "T", "NYSE", "0000732717", "Communication Services", "Telecom Services", "active"),
    ("Verizon Communications Inc.", "VZ", "NYSE", "0000743158", "Communication Services", "Telecom Services", "active"),
    ("Costco Wholesale Corporation", "COST", "NASDAQ", "0000909832", "Consumer Staples", "Discount Stores", "active"),
    ("Twitter, Inc.", "TWTR", "NYSE", "0001418091", "Communication Services", "Internet Content", "inactive"),
    ("Activision Blizzard, Inc.", "ATVI", "NASDAQ", "0000718877", "Communication Services", "Interactive Entertainment", "inactive"),
]


def _cik(raw: str) -> str:
    return raw.zfill(10)


class FixtureCompanyProvider:
    """Offline provider over the curated snapshot above."""

    name = "fixtures"
    label = "Deterministic fixtures"

    async def load_universe(self) -> list[Company]:
        return [
            Company(
                name=name,
                ticker=ticker,
                exchange=exchange,
                cik=_cik(cik),
                sector=sector,
                industry=industry,
                status=status,
            )
            for (name, ticker, exchange, cik, sector, industry, status) in _ROWS
        ]
