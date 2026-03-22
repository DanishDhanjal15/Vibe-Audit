# Vibe-Audit Backend: Step-by-Step Implementation Guide

This guide provides a detailed, step-by-step plan to build the Python FastAPI backend for the "Vibe-Audit" hackathon project.

## 1. Environment Setup

First, set up your Python environment and install the required dependencies.

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi "uvicorn[standard]" python-multipart requests python-dotenv google-genai
```

### Required libraries:
- `fastapi` & `uvicorn`: For building and running the rapid, high-performance web API.
- `python-multipart`: To handle file/folder uploads (.zip files of the repo).
- `requests`: To query the npm/PyPI registry for checking package hallucinations.
- `python-dotenv`: To manage environment variables safely (like your LLM API keys).
- `google-genai` (or `openai`): To interact with LLMs for PII scanning and Auto-Remediation code generation.

## 2. Project Structure

Create the following folder structure to keep your hackathon code clean and organized:

```text
vibe-audit-backend/
├── main.py                  # Main FastAPI application entry point
├── requirements.txt         # Project dependencies
├── .env                     # Environment variables (API keys)
└── app/
    ├── __init__.py          # Marks the folder as a Python package
    ├── api.py               # The main API routes (e.g., /upload, /scan)
    ├── core/
    │   ├── ingestion.py     # Logic to unzip uploads or clone GitHub repos
    │   └── scoring.py       # The "Vibe-to-Value" calculation logic
    └── scanners/
        ├── secrets.py       # Hardcoded secrets detection (Regex)
        ├── dependencies.py  # Hallucinated package detection (npm registry checks)
        └── compliance.py    # PII/SOC2 LLM checks and Auto-Remediation
```

## 3. Step-by-Step Implementation

### Step 3.1: Initialize the App (`main.py`)
This file is the starting point of your application. It sets up CORS so your React frontend can talk to it without browser blocking security issues.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router

app = FastAPI(title="Vibe-Audit API")

# Allow the frontend (e.g., localhost:3000) to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "Vibe-Audit API is running! 🚀"}
```

### Step 3.2: The Core Scanners (`app/scanners/`)

**1. Secrets Scanner (`secrets.py`)**
Will scan for AWS Keys, DB Passwords, etc.
*   **Logic:** Iterate over every file line by line. Use Regex mapping rules (e.g., `(?i)password\s*=\s*['"][^'"]+['"]`) to detect plaintext secrets. Attach a "Critical" severity to the issue.

**2. Dependency Scanner (`dependencies.py`)**
Will detect hallucinated packages.
*   **Logic:** Look for `package.json` or `requirements.txt`. Parse the keys. Send an HTTP GET requesting the package info from `registry.npmjs.org/package_name`. If it returns 404 Not Found, flag it as a "Hallucinated Package Risk".

**3. Compliance, PII & Remediation (`compliance.py`)**
Will act as the SOC2 auditor and provide the fix.
*   **Logic:** Collect files like `.prisma`, `models.py`, or general source code. Pass the strings dynamically to Google Gemini or OpenAI with a prompt: *"Review this code. Does it expose PII? Return JSON with a `status` and `remediation_code` block."* Returns the new code snippet to the user.

### Step 3.3: The "Vibe-to-Value" Engine (`app/core/scoring.py`)

This handles the calculation of the final score based on the issues found.

```python
def calculate_vibe_score(issues):
    score = 100
    for issue in issues:
        if issue["severity"] == "CRITICAL":
            score -= 30
        elif issue["severity"] == "HIGH":
            score -= 20
        elif issue["severity"] == "MEDIUM":
            score -= 10
            
    # Compile the final Go/No-Go status
    is_go = score >= 75
    return {
        "score": max(0, score),
        "status": "Go" if is_go else "No-Go",
        "message": "Production Ready" if is_go else "Audit Required"
    }
```

### Step 3.4: API Endpoints (`app/api.py`)

This creates the endpoint the frontend will hit. Usually, for a hackathon, an upload endpoint that accepts a `.zip` file of the repo is easiest to implement and demonstrate.

```python
import os
import shutil
from fastapi import APIRouter, File, UploadFile
from .core.ingestion import extract_zip
from .scanners.secrets import scan_secrets
from .scanners.dependencies import scan_deps
from .core.scoring import calculate_vibe_score

router = APIRouter()

@router.post("/api/audit")
async def run_audit(file: UploadFile = File(...)):
    # 1. Save and extract the uploaded codebase zip
    temp_dir = f"temp_{file.filename}"
    with open(file.filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    extract_zip(file.filename, temp_dir) # Custom unzip logic
    
    # 2. Run all scanners across the extracted folder
    issues = []
    issues.extend(scan_secrets(temp_dir))
    issues.extend(scan_deps(temp_dir))
    
    # 3. Calculate the score
    result = calculate_vibe_score(issues)
    
    # Clean up temp files
    shutil.rmtree(temp_dir)
    os.remove(file.filename)
    
    return {
        "report": result,
        "issues": issues
    }
```

## 4. Running and Testing

To start your backend locally during the hackathon:

```bash
uvicorn main:app --reload
```

Once running, you can immediately go to `http://127.0.0.1:8000/docs` in your browser. This opens the automatically generated **Swagger UI interface**, allowing you to test uploading a project `.zip` file and view the resulting JSON report instantly without needing your frontend built yet!
