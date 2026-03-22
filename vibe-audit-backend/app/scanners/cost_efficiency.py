import os
import re


def _build_model_patterns():
    """
    Build model-detection patterns dynamically so that this scanner's own
    source code is never matched by the regexes it uses.
    """
    # Construct model names via concatenation to avoid self-detection
    gpt4 = "gp" + "t-4"
    claude_opus = "claude-3" + "-opus"
    gemini_pro = "gemini-1.5" + "-pro"

    return [
        (gpt4, re.compile(r"['\"](gp" + r"t-4(?!o-mini)[a-zA-Z0-9\-]*)['\"]"), "gp" + "t-4o-mini"),
        (claude_opus, re.compile(r"['\"]claude-3" + r"-opus[a-zA-Z0-9\-]*['\"]"), "claude-3-5-sonnet or claude-3-haiku"),
        (gemini_pro, re.compile(r"['\"]gemini-1\.5" + r"-pro[a-zA-Z0-9\-]*['\"]"), "gemini-1.5-flash"),
    ]


EXPENSIVE_MODELS = _build_model_patterns()


def scan_cost_efficiency(repo_path: str):
    issues = []

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
                        for model_name, regex, cheaper_alt in EXPENSIVE_MODELS:
                            if regex.search(line):
                                relative_path = os.path.relpath(file_path, repo_path)
                                issues.append({
                                    "type": "High API Cost Risk",
                                    "severity": "HIGH",
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"Found usage of expensive AI model '{model_name}'. AI code generators default to premium models unnecessarily.",
                                    "remediation": f"Refactor your AI model string to use '{cheaper_alt}' instead. This will reduce your token cloud costs by up to ~95% without sacrificing standard application functionality."
                                })
            except Exception:
                pass

    return issues
