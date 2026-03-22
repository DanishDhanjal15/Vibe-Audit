"""
Input sanitization utilities for user-supplied data.
"""

import re
import os
from fastapi import UploadFile, HTTPException

# Allowed GitHub URL patterns
GITHUB_URL_PATTERN = re.compile(
    r'^https?://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+(\.git)?/?$'
)

ALLOWED_ZIP_EXTENSIONS = {'.zip'}
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Dangerous path components
PATH_TRAVERSAL_PATTERNS = [
    '..', '~', '$', '|', '&', ';', '`', '\x00'
]

def sanitize_github_url(url: str) -> str:
    """
    Validate and sanitize a GitHub repository URL.
    Raises HTTPException on invalid input.
    """
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="URL is required and must be a string.")

    url = url.strip()

    # Remove trailing slashes and .git suffix for normalization
    clean_url = url.rstrip('/')

    # Check for path traversal / injection
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if pattern in url:
            raise HTTPException(status_code=400, detail=f"URL contains forbidden characters: '{pattern}'")

    # Must be a valid GitHub URL
    if not GITHUB_URL_PATTERN.match(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Only public GitHub repository URLs are accepted (e.g., https://github.com/user/repo)."
        )

    # Ensure HTTPS
    if url.startswith('http://'):
        url = url.replace('http://', 'https://', 1)

    return url


def sanitize_upload_file(file: UploadFile) -> UploadFile:
    """
    Validate an uploaded file for security.
    Raises HTTPException on dangerous input.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    filename = file.filename.strip()

    # Check extension
    _, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_ZIP_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Only .zip files are accepted."
        )

    # Check for path traversal in filename
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if pattern in filename:
            raise HTTPException(status_code=400, detail=f"Filename contains forbidden characters.")

    # Sanitize filename — keep only alphanumeric, dots, hyphens, underscores
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    file.filename = safe_filename

    # Check content type hint
    if file.content_type and 'zip' not in file.content_type and 'octet-stream' not in file.content_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{file.content_type}'. Only zip archives are accepted."
        )

    return file


def sanitize_string(value: str, max_length: int = 500, field_name: str = "input") -> str:
    """Generic string sanitizer — strips dangerous chars and enforces length limit."""
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a string.")

    value = value.strip()

    if len(value) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name} exceeds maximum length of {max_length} characters.")

    # Strip null bytes and control characters
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', value)

    return value
