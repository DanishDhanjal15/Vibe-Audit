import os
import re

def scan_secrets(repo_path: str):
    issues = []
    
    # Common patterns for secrets
    patterns = {
        "AWS Access Key": r"AKIA[0-9A-Z]{16}",
        "Generic Secret": r"(?i)(api[_-]?key|secret|password|token)[\s:=]+['\"]([a-zA-Z0-9_\-]{16,})['\"]",
        "Stripe Live Token": r"sk_live_[0-9a-zA-Z]{24}",
        "Stripe Test Token": r"sk_test_[0-9a-zA-Z]{24}"
    }

    for root, dirs, files in os.walk(repo_path):
        for file in files:
            file_path = os.path.join(root, file)
            # Skip common binary/unnecessary files
            if any(ext in file for ext in ['.pyc', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz']):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for line_num, line in enumerate(lines, 1):
                        for secret_type, regex in patterns.items():
                            if re.search(regex, line):
                                relative_path = os.path.relpath(file_path, repo_path)
                                issues.append({
                                    "type": "Hardcoded Secret",
                                    "severity": "CRITICAL",
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"Found potential {secret_type} in {relative_path}.",
                                    "remediation": f"Remove this hardcoded value and use an environment variable (e.g. process.env.API_KEY or os.environ.get('API_KEY'))."
                                })
            except Exception:
                pass # Skip unreadable files
                
    return issues
