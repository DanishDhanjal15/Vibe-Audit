import zipfile
import os
import subprocess

def extract_zip(zip_path: str, extract_to: str):
    """Safely extracts a zip file to a specific directory."""
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

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
