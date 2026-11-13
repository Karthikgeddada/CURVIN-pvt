"""Health endpoint — the contract the frontend foundation page uses
to confirm the backend is reachable."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import SERVICE_NAME, VERSION, get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    version: str


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=SERVICE_NAME,
        environment=settings.environment,
        version=VERSION,
    )
