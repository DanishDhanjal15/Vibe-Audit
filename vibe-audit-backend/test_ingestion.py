"""Tests for the core ingestion module (ZIP extraction & git clone)."""
import pytest
import os
import zipfile
import tempfile
import shutil
import subprocess
from app.core.ingestion import extract_zip


def _cleanup(path):
    """Robust cleanup that handles Windows file locking."""
    try:
        shutil.rmtree(path, ignore_errors=True)
    except Exception:
        if os.name == 'nt':
            subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", path], capture_output=True)


class TestExtractZip:
    """Tests for ZIP extraction functionality."""

    def test_extract_valid_zip(self):
        tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
        tmp.close()
        with zipfile.ZipFile(tmp.name, "w") as zf:
            zf.writestr("hello.txt", "world")

        extract_dir = tempfile.mkdtemp()
        try:
            extract_zip(tmp.name, extract_dir)
            # Walk to find all extracted files (may be in subdirectory)
            extracted = []
            for root, dirs, files in os.walk(extract_dir):
                extracted.extend(files)
            assert len(extracted) > 0
        finally:
            os.unlink(tmp.name)
            _cleanup(extract_dir)

    def test_extract_zip_creates_directory(self):
        tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
        tmp.close()
        with zipfile.ZipFile(tmp.name, "w") as zf:
            zf.writestr("test/file.py", "x = 1")

        extract_dir = os.path.join(tempfile.mkdtemp(), "new_dir")
        try:
            extract_zip(tmp.name, extract_dir)
            assert os.path.isdir(extract_dir)
        finally:
            os.unlink(tmp.name)
            _cleanup(extract_dir)
