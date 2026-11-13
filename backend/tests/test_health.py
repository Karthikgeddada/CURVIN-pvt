"""Tests for the health endpoint — the API contract the frontend
foundation depends on."""


def test_health_returns_ok(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "curvin-backend"
    assert body["environment"] == "development"
    assert body["version"] == "0.1.0"


def test_unknown_route_returns_error_envelope(client):
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "http_404"
    assert "message" in body["error"]
