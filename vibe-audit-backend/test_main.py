"""Tests for the main FastAPI application."""
import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestRootEndpoint:
    """Tests for the root health-check endpoint."""

    def test_root_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_message(self):
        response = client.get("/")
        data = response.json()
        assert "message" in data
        assert "running" in data["message"].lower()


class TestBadgeEndpoint:
    """Tests for the /api/badge SVG badge endpoint."""

    def test_badge_default_score(self):
        response = client.get("/api/badge")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/svg+xml"
        assert "<svg" in response.text

    def test_badge_high_score(self):
        response = client.get("/api/badge?score=90")
        assert response.status_code == 200
        assert "Production Ready" in response.text

    def test_badge_medium_score(self):
        response = client.get("/api/badge?score=70")
        assert response.status_code == 200
        assert "Audit Suggested" in response.text

    def test_badge_low_score(self):
        response = client.get("/api/badge?score=30")
        assert response.status_code == 200
        assert "Not Production Ready" in response.text

    def test_badge_invalid_score_rejected(self):
        response = client.get("/api/badge?score=150")
        assert response.status_code == 422
