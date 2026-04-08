import zipfile
import os
import subprocess
import re
from pathlib import Path

def extract_zip(zip_path: str, extract_to: str):
    """Safely extracts a zip file to a specific directory."""
    os.makedirs(extract_to, exist_ok=True)
    base_dir = Path(extract_to).resolve()
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        for member in zip_ref.infolist():
            # Prevent Zip Slip / path traversal
            name = member.filename.replace("\\", "/")
            if not name or name.endswith("/"):
                continue
            # Reject absolute paths and drive-letter paths
            if name.startswith("/") or re.match(r"^[a-zA-Z]:/", name):
                raise ValueError("Unsafe zip entry path detected.")

            target_path = (base_dir / name).resolve()
            if base_dir not in target_path.parents and target_path != base_dir:
                raise ValueError("Unsafe zip entry path detected.")

            target_path.parent.mkdir(parents=True, exist_ok=True)
            with zip_ref.open(member, "r") as src, open(target_path, "wb") as dst:
                dst.write(src.read())

def clone_repo(repo_url: str, extract_to: str):
    """Clones a GitHub repository to a specific directory."""
    os.makedirs(extract_to, exist_ok=True)
    # Ensure it's a valid github URL to prevent basic command injection
    if not repo_url.startswith("https://github.com/"):
        raise ValueError("Only public GitHub URLs are supported.")
        
    result = subprocess.run(["git", "clone", "-c", "core.longpaths=true", repo_url, extract_to], capture_output=True)
    
    if result.returncode != 0:
        error_output = result.stderr.decode('utf-8')
        if "Clone succeeded, but checkout failed" in error_output:
            # On Windows, checkout fails gracefully if files have invalid names (like aux.json or names with colons) 
            # We can safely proceed to scan the 99% of files that DID successfully checkout.
            pass
        else:
            raise RuntimeError(f"Failed to clone repository. Is it public? Error: {error_output}")
