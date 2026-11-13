"""Shared pytest fixtures for the backend test suite."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """A TestClient with the application lifespan run synchronously."""
    with TestClient(app) as test_client:
        yield test_client
