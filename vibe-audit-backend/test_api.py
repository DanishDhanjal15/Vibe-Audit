"""Tests for the API router endpoints."""
import pytest
import os
import zipfile
import tempfile
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def _create_test_zip(content_files: dict) -> str:
    """Helper: create a temporary zip file with given files and contents."""
    tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    with zipfile.ZipFile(tmp.name, "w") as zf:
        for name, content in content_files.items():
            zf.writestr(name, content)
    return tmp.name


class TestAuditZipEndpoint:
    """Tests for POST /api/audit (zip upload)."""

    def test_audit_clean_repo(self):
        zip_path = _create_test_zip({"hello.py": "print('hello world')\n"})
        try:
            with open(zip_path, "rb") as f:
                response = client.post("/api/audit", files={"file": ("clean.zip", f, "application/zip")})
            assert response.status_code == 200
            data = response.json()
            assert "report" in data
            assert "issues" in data
            assert "graph" in data
        finally:
            os.unlink(zip_path)

    def test_audit_returns_vibe_score(self):
        zip_path = _create_test_zip({"app.py": "x = 1\n"})
        try:
            with open(zip_path, "rb") as f:
                response = client.post("/api/audit", files={"file": ("test.zip", f, "application/zip")})
            data = response.json()
            assert "report" in data
            assert "score" in data["report"]
        finally:
            os.unlink(zip_path)


class TestAuditUrlEndpoint:
    """Tests for POST /api/audit-url."""

    def test_invalid_url_rejected(self):
        response = client.post("/api/audit-url", json={"url": "not-a-valid-url"})
        assert response.status_code == 400

    def test_malicious_url_rejected(self):
        response = client.post("/api/audit-url", json={"url": "https://evil.com/repo; rm -rf /"})
        assert response.status_code == 400


class TestPatchEndpoint:
    """Tests for POST /api/patch."""

    def test_patch_missing_test_issue(self):
        issue = {
            "type": "Missing Unit Tests",
            "severity": "LOW",
            "file": "app.py",
            "line": 1,
            "description": "No test file found.",
            "remediation": "Add tests."
        }
        response = client.post("/api/patch", json={"issue": issue})
        assert response.status_code == 200
        data = response.json()
        assert "type" in data
        assert data["type"] == "test_scaffold"

    def test_patch_unknown_type_returns_404(self):
        issue = {
            "type": "Unknown Issue Type",
            "severity": "LOW",
            "file": "x.py",
            "line": 1,
            "description": "Something.",
            "remediation": "Do something."
        }
        response = client.post("/api/patch", json={"issue": issue})
        assert response.status_code == 404
