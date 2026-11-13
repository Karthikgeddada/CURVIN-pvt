"""Tests for CORS behavior — the contract that lets the deployed
Vercel frontend talk to this backend."""


def test_cors_middleware_is_registered(client):
    middleware_classes = [
        middleware.cls.__name__
        for middleware in client.app.user_middleware
    ]
    assert "CORSMiddleware" in middleware_classes


def test_preflight_from_production_frontend_is_allowed(client):
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://curvin-pvt.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "https://curvin-pvt.vercel.app"
    )
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "GET" in response.headers["access-control-allow-methods"]


def test_preflight_from_unknown_origin_is_rejected(client):
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert "access-control-allow-origin" not in response.headers


def test_get_from_production_frontend_carries_allow_origin(client):
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "https://curvin-pvt.vercel.app"},
    )

    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "https://curvin-pvt.vercel.app"
    )
