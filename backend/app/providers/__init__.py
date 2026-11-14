"""Company reference-data providers.

Every provider implements the same protocol so the service layer can
swap data sources (live SEC EDGAR today, licensed vendors later)
without touching the API surface.
"""
