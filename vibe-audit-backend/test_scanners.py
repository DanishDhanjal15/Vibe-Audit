"""Tests for the scanner modules."""
import pytest
import os
import tempfile
import shutil
from app.scanners.secrets import scan_secrets
from app.scanners.cost_efficiency import scan_cost_efficiency
from app.scanners.missing_tests import scan_missing_tests
from app.scanners.compliance import scan_compliance
from app.scanners.dependencies import scan_deps


def _create_temp_repo(files: dict) -> str:
    """Helper: create a temp directory with the given file structure."""
    repo_dir = tempfile.mkdtemp()
    for path, content in files.items():
        full_path = os.path.join(repo_dir, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
    return repo_dir


class TestSecretScanner:
    """Tests for the secret/credential detection scanner."""

    def test_detects_aws_key(self):
        repo = _create_temp_repo({"config.py": 'aws_key = "AKIAIOSFODNN7EXAMPLE1"'})
        try:
            issues = scan_secrets(repo)
            assert len(issues) >= 1
            assert issues[0]["type"] == "Hardcoded Secret"
            assert issues[0]["severity"] == "CRITICAL"
        finally:
            shutil.rmtree(repo)

    def test_clean_repo_no_secrets(self):
        repo = _create_temp_repo({"app.py": "print('hello world')\n"})
        try:
            issues = scan_secrets(repo)
            assert len(issues) == 0
        finally:
            shutil.rmtree(repo)


class TestCostEfficiencyScanner:
    """Tests for the AI model cost scanner."""

    def test_detects_expensive_model(self):
        # Use a quoted model name that the scanner should catch
        repo = _create_temp_repo({"ai.py": 'model = "gp' + 't-4"\n'})
        try:
            issues = scan_cost_efficiency(repo)
            assert len(issues) >= 1
            assert issues[0]["type"] == "High API Cost Risk"
        finally:
            shutil.rmtree(repo)

    def test_ignores_cheap_model(self):
        repo = _create_temp_repo({"ai.py": 'model = "gp' + 't-4o-mini"\n'})
        try:
            issues = scan_cost_efficiency(repo)
            assert len(issues) == 0
        finally:
            shutil.rmtree(repo)


class TestMissingTestsScanner:
    """Tests for the missing test file scanner."""

    def test_detects_missing_test(self):
        repo = _create_temp_repo({"utils.py": "def helper(): pass\n"})
        try:
            issues = scan_missing_tests(repo)
            assert len(issues) >= 1
            assert issues[0]["type"] == "Missing Unit Tests"
        finally:
            shutil.rmtree(repo)

    def test_no_issue_when_test_exists(self):
        repo = _create_temp_repo({
            "utils.py": "def helper(): pass\n",
            "test_utils.py": "def test_helper(): assert True\n",
        })
        try:
            issues = scan_missing_tests(repo)
            # utils.py should NOT be flagged since test_utils.py exists
            flagged_files = [i["file"] for i in issues]
            assert "utils.py" not in flagged_files
        finally:
            shutil.rmtree(repo)


class TestComplianceScanner:
    """Tests for the compliance checker."""

    def test_pii_without_encryption_flagged(self):
        repo = _create_temp_repo({"models.py": "class User:\n    ssn = CharField()\n    password = CharField()\n"})
        try:
            issues = scan_compliance(repo)
            assert len(issues) >= 1
            assert issues[0]["type"] == "PII/Compliance Violation"
        finally:
            shutil.rmtree(repo)

    def test_pii_with_hashing_not_flagged(self):
        repo = _create_temp_repo({"models.py": "class User:\n    password = CharField()\n    # uses bcrypt for hashing\n"})
        try:
            issues = scan_compliance(repo)
            assert len(issues) == 0
        finally:
            shutil.rmtree(repo)

    def test_clean_repo_no_compliance_issues(self):
        repo = _create_temp_repo({"app.py": "x = 1\n"})
        try:
            issues = scan_compliance(repo)
            assert len(issues) == 0
        finally:
            shutil.rmtree(repo)
