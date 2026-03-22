import os

def scan_missing_tests(repo_path: str):
    issues = []
    
    # Collect all file paths
    all_files = []
    for root, dirs, files in os.walk(repo_path):
        for file in files:
            all_files.append(os.path.relpath(os.path.join(root, file), repo_path))
            
    # Look for source files that don't have matching test files
    for file in all_files:
        # Skip hidden files or modules like node_modules, .git, temp
        if any(ignored in file.replace('\\', '/') for ignored in ['node_modules', '.venv', 'venv', '.git']):
            continue

        if file.endswith('.py') and not os.path.basename(file).startswith('test_') and not file.endswith('_test.py'):
            basename = os.path.basename(file)
            test_name_1 = f"test_{basename}"
            test_name_2 = basename.replace('.py', '_test.py')
            
            has_test = any(test_name_1 in f or test_name_2 in f for f in all_files)
            if not has_test:
                issues.append({
                    "type": "Missing Unit Tests",
                    "severity": "LOW",
                    "file": file,
                    "line": 1,
                    "description": "Vibe Coded files often lack unit tests completely. No corresponding test file found for this source component.",
                    "remediation": "Click 'Auto-Generate Tests' (Premium Feature) to let the Gatekeeper AI write a complete PyTest suite for this file and open a PR."
                })
        
        elif file.endswith(('.js', '.jsx', '.ts', '.tsx')) and not file.endswith(('.test.js', '.spec.js', '.test.jsx', '.test.ts', '.test.tsx')):
            basename = os.path.basename(file)
            name_without_ext = os.path.splitext(basename)[0]
            
            has_test = any(f"{name_without_ext}.test." in f or f"{name_without_ext}.spec." in f for f in all_files)
            if not has_test:
                issues.append({
                    "type": "Missing Unit Tests",
                    "severity": "LOW",
                    "file": file,
                    "line": 1,
                    "description": "Vibe Coded files often lack unit tests completely. No corresponding test/spec file found for this web component.",
                    "remediation": "Click 'Auto-Generate Tests' (Premium Feature) to let the Gatekeeper AI write a complete Jest/Vitest suite for this file automatically."
                })
                
    # Limit to max 4 missing test issues to avoid spamming the dashboard for empty repos
    return issues[:4]
