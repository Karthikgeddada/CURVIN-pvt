"""Application settings sourced from environment variables.

Deliberately dependency-light: plain ``os.environ`` reads instead of a
settings framework. Secrets are never given defaults — they must be
provided by the deployment environment when a feature needs them.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

SERVICE_NAME = "curvin-backend"
VERSION = "0.1.0"


@dataclass(frozen=True)
class Settings:
    """Runtime configuration for the CURVIN backend."""

    environment: str = field(
        default_factory=lambda: os.environ.get("CURVIN_ENVIRONMENT", "development")
    )
    """Comma-separated list of allowed CORS origins."""
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: _parse_origins(
            os.environ.get(
                "CURVIN_CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        )
    )

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


def _parse_origins(raw: str) -> tuple[str, ...]:
    return tuple(
        origin.strip() for origin in raw.split(",") if origin.strip()
    )


def get_settings() -> Settings:
    """Build settings once per process and cache the result."""
    global _SETTINGS
    if _SETTINGS is None:
        _SETTINGS = Settings()
    return _SETTINGS


_SETTINGS: Settings | None = None
