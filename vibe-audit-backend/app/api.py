import os
import shutil
import uuid
import subprocess
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from .core.ingestion import extract_zip, clone_repo
from .core.sanitizer import sanitize_github_url, sanitize_upload_file
from .scanners.secrets import scan_secrets
from .scanners.dependencies import scan_deps
from .scanners.compliance import scan_compliance
from .scanners.cost_efficiency import scan_cost_efficiency
from .scanners.missing_tests import scan_missing_tests
from .scanners.ai_dna import scan_ai_dna
from .scanners.patch_generator import generate_patch
from .core.scoring import calculate_vibe_score

router = APIRouter()

class RepoRequest(BaseModel):
    url: str

class PatchRequest(BaseModel):
    issue: dict

def build_vibe_graph(extract_dir: str, issues: list):
    issue_files = set(issue.get("file", "").replace('\\', '/') for issue in issues)
    
    # Collect all files (skipping heavy folders)
    all_files = []
    IGNORED = {'node_modules', 'venv', '__pycache__', '.git', '.venv', 'dist', 'build'}
    for root, dirs, files in os.walk(extract_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED and not d.startswith('.')]
        for f in files:
            if f.startswith('.'): continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, extract_dir).replace('\\', '/')
            is_vuln = rel_path in issue_files
            all_files.append((rel_path, is_vuln))

    # Prioritize vulnerable files, then take at most 30 total for a clean map
    all_files.sort(key=lambda x: (not x[1], x[0]))
    selected = all_files[:30]

    nodes = [{"id": "root", "name": "Repository Root", "val": 14, "color": "#6366f1"}]
    links = []

    for rel_path, is_vuln in selected:
        node_id = f"n_{rel_path}"
        filename = rel_path.split('/')[-1]
        nodes.append({
            "id": node_id,
            "name": filename,
            "val": 10 if is_vuln else 4,
            "color": "#f43f5e" if is_vuln else "#10b981"
        })
        links.append({"source": "root", "target": node_id})

    return {"nodes": nodes, "links": links}


def run_scanners_and_score(extract_dir: str):
    raw_issues = []
    raw_issues.extend(scan_secrets(extract_dir))
    raw_issues.extend(scan_deps(extract_dir))
    raw_issues.extend(scan_compliance(extract_dir))
    raw_issues.extend(scan_cost_efficiency(extract_dir))
    raw_issues.extend(scan_missing_tests(extract_dir))
    report = calculate_vibe_score(raw_issues)
    enriched_issues = report.pop("enriched_issues", raw_issues)
    # Attach patch availability flag to each issue
    for issue in enriched_issues:
        issue['has_patch'] = generate_patch(issue) is not None
    graph = build_vibe_graph(extract_dir, raw_issues)
    ai_dna = scan_ai_dna(extract_dir)
    return {"report": report, "issues": enriched_issues, "graph": graph, "ai_dna": ai_dna}

def robust_cleanup(dir_path: str):
    if os.name == 'nt':
        subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", dir_path], capture_output=True)
    else:
        shutil.rmtree(dir_path, ignore_errors=True)

@router.post("/api/audit")
async def run_audit(file: UploadFile = File(...)):
    # Sanitize uploaded file
    file = sanitize_upload_file(file)
    unique_id = str(uuid.uuid4())
    temp_dir = f"temp_workspace_{unique_id}"
    os.makedirs(temp_dir, exist_ok=True)
    zip_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        extract_dir = os.path.join(temp_dir, "extracted")
        try:
            extract_zip(zip_path, extract_dir)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        return run_scanners_and_score(extract_dir)
    finally:
        robust_cleanup(temp_dir)

@router.post("/api/audit-url")
async def run_audit_url(request: RepoRequest):
    # Sanitize and validate URL
    clean_url = sanitize_github_url(request.url)
    unique_id = str(uuid.uuid4())
    temp_dir = f"temp_workspace_{unique_id}"
    os.makedirs(temp_dir, exist_ok=True)
    extract_dir = os.path.join(temp_dir, "cloned")
    
    try:
        clone_repo(clean_url, extract_dir)
        return run_scanners_and_score(extract_dir)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    finally:
        robust_cleanup(temp_dir)

@router.post("/api/patch")
async def get_patch(request: PatchRequest):
    """Generate a code patch for a specific issue."""
    patch = generate_patch(request.issue)
    if patch is None:
        raise HTTPException(status_code=404, detail="No auto-patch available for this issue type.")
    return patch

