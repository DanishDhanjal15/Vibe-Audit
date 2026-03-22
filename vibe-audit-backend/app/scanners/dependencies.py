import os
import json
import requests

def scan_deps(repo_path: str):
    issues = []
    package_json_path = os.path.join(repo_path, "package.json")
    
    if not os.path.exists(package_json_path):
        return issues
        
    try:
        with open(package_json_path, 'r') as f:
            data = json.load(f)
            
        dependencies = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
        
        for package_name in dependencies.keys():
            # Check the official NPM API to see if the package exists
            res = requests.get(f"https://registry.npmjs.org/{package_name}", timeout=5)
            
            if res.status_code == 404:
                issues.append({
                    "type": "Hallucinated Dependency",
                    "severity": "HIGH",
                    "file": "package.json",
                    "package": package_name,
                    "description": f"The AI hallucinated this package! '{package_name}' does not exist on npm.",
                    "remediation": f"Remove '{package_name}' from package.json or replace it with the correct existing library."
                })
    except Exception as e:
        print(f"Error parsing package.json: {e}")
            
    return issues
