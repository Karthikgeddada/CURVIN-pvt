"""API v1 — aggregates every v1 router under a single prefix."""

from fastapi import APIRouter

from app.api.v1 import companies, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(companies.router)
