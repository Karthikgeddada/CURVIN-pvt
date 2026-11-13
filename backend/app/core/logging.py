"""Structured logging: one JSON line per event, ready for ingestion.

No third-party logger — the standard library is sufficient and keeps
the deployment footprint small.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from app.core.config import SERVICE_NAME


class JsonFormatter(logging.Formatter):
    """Render each record as a single JSON object on one line."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "service": SERVICE_NAME,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: int = logging.INFO) -> None:
    """Install the JSON formatter on the root logger, once."""

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Quiet uvicorn's own handlers so all output shares one format.
    for noisy in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(noisy)
        logger.handlers = []
        logger.propagate = True
