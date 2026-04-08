import os
import json
import requests

def scan_deps(repo_path: str):
    issues = []
    IGNORED_DIRS = {'node_modules', '.git', 'dist', 'build', '.venv', 'venv', '__pycache__'}

    package_json_paths = []
    root_pkg = os.path.join(repo_path, "package.json")
    if os.path.exists(root_pkg):
        package_json_paths.append(root_pkg)

    # Monorepo support: find nested package.json files
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith('.')]
        if "package.json" in files:
            package_json_paths.append(os.path.join(root, "package.json"))

    # Dedupe while preserving order
    seen = set()
    package_json_paths = [p for p in package_json_paths if not (p in seen or seen.add(p))]

    if not package_json_paths:
        return issues

    for package_json_path in package_json_paths:
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            dependencies = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
            rel_pkg = os.path.relpath(package_json_path, repo_path).replace('\\', '/')

            for package_name in dependencies.keys():
                res = requests.get(f"https://registry.npmjs.org/{package_name}", timeout=5)
                if res.status_code == 404:
                    issues.append({
                        "type": "Hallucinated Dependency",
                        "severity": "HIGH",
                        "file": rel_pkg,
                        "package": package_name,
                        "description": f"The AI hallucinated this package! '{package_name}' does not exist on npm.",
                        "remediation": f"Remove '{package_name}' from {rel_pkg} or replace it with the correct existing library."
                    })
        except Exception as e:
            print(f"Error parsing {package_json_path}: {e}")

    return issues
