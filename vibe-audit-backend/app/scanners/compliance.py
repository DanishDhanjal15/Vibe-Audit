import os
import json

def scan_compliance(repo_path: str):
    issues = []
    
    # Files likely to contain database schema or models
    schema_files = ['schema.prisma', 'models.py', 'user.js', 'init.sql']
    
    for root, dirs, files in os.walk(repo_path):
        for file in files:
            if any(sf in file.lower() for sf in schema_files):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                        # Very simple mock PII detection
                        pii_keywords = ['ssn', 'social security', 'credit_card', 'creditcard', 'password']
                        
                        found_pii = [kw for kw in pii_keywords if kw in content]
                        
                        if found_pii and 'bcrypt' not in content and 'hash' not in content and 'encrypt' not in content:
                             relative_path = os.path.relpath(file_path, repo_path)
                             issues.append({
                                "type": "PII/Compliance Violation",
                                "severity": "MEDIUM",
                                "file": relative_path,
                                "description": f"File contains PII fields ({', '.join(found_pii)}) without evidence of hashing/encryption (e.g. bcrypt). This violates GDPR/SOC2.",
                                "remediation": f"Ensure that passwords and sensitive PII are hashed using a library like bcrypt before storing in the database."
                            })
                except Exception:
                    pass
                    
    return issues
