import os
import re

def scan_cost_efficiency(repo_path: str):
    issues = []
    
    # regex patterns to find expensive AI models
    expensive_models = {
        "gpt-4": (r"['\"](gpt-4(?!o-mini)[a-zA-Z0-9\-]*)['\"]", "gpt-4o-mini"),
        "claude-3-opus": (r"['\"]claude-3-opus[a-zA-Z0-9\-]*['\"]", "claude-3-5-sonnet or claude-3-haiku"),
        "gemini-1.5-pro": (r"['\"]gemini-1\.5-pro[a-zA-Z0-9\-]*['\"]", "gemini-1.5-flash")
    }

    for root, dirs, files in os.walk(repo_path):
        for file in files:
            file_path = os.path.join(root, file)
            # Skip common binary files
            if any(ext in file for ext in ['.pyc', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz']):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for line_num, line in enumerate(lines, 1):
                        for expensive_model, (regex, cheaper_alt) in expensive_models.items():
                            if re.search(regex, line):
                                relative_path = os.path.relpath(file_path, repo_path)
                                issues.append({
                                    "type": "High API Cost Risk",
                                    "severity": "HIGH",
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"Found usage of expensive AI model '{expensive_model}'. AI code generators default to premium models unnecessarily.",
                                    "remediation": f"Refactor your AI model string to use '{cheaper_alt}' instead. This will reduce your token cloud costs by up to ~95% without sacrificing standard application functionality."
                                })
            except Exception:
                pass 
                
    return issues
