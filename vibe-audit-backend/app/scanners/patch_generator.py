"""
One-Click Patch Generator — generates before/after code patches for known issue types.
Secrets are masked before being passed anywhere; only structural replacements are made.
"""

import re

# --- Secret masking (no real value ever leaves the file system) ---
SECRET_MASK = '***MASKED***'

def _mask_secret(value: str) -> str:
    if len(value) <= 6:
        return SECRET_MASK
    return value[:3] + '*' * (len(value) - 6) + value[-3:]

# --- Per-type patch generators ---

def _patch_hardcoded_secret(issue: dict, file_content: str) -> dict:
    """Replace hardcoded secret value with env var reference."""
    description = issue.get('description', '')
    # Try to extract the variable name from description
    var_match = re.search(r'Variable[:\s]+[\'"]?(\w+)[\'"]?', description, re.I)
    var_name = var_match.group(1).upper() if var_match else 'SECRET_KEY'

    # Detect language from file extension
    ext = issue.get('file', '').split('.')[-1].lower()

    if ext == 'py':
        replacement_snippet = f'import os\n{var_name.lower()} = os.environ.get("{var_name}", "")'
        lang = 'python'
    elif ext in ('js', 'jsx', 'ts', 'tsx', 'mjs'):
        replacement_snippet = f'const {var_name.lower()} = process.env.{var_name};'
        lang = 'javascript'
    else:
        replacement_snippet = f'# Set {var_name} as an environment variable instead'
        lang = 'bash'

    return {
        'type': 'env_var_replacement',
        'language': lang,
        'before': f'# ⚠️  Hardcoded secret detected in: {issue.get("file")}\n# Line {issue.get("line", "?")}: {_mask_secret(description)}',
        'after': replacement_snippet,
        'steps': [
            f'1. Remove the hardcoded value from your source code.',
            f'2. Add `{var_name}=your_actual_value` to your `.env` file.',
            f'3. Add `.env` to your `.gitignore`.',
            f'4. Use the snippet above to read it safely at runtime.',
        ]
    }

def _patch_expensive_model(issue: dict, file_content: str) -> dict:
    """Swap expensive model name with cheaper alternative."""
    description = issue.get('description', '')
    remediation = issue.get('remediation', '')

    # Extract old model from description
    old_model_match = re.search(r'(gpt-4[^\s",)]*|claude-3-opus[^\s",)]*|gemini-ultra[^\s",)]*)', description, re.I)
    old_model = old_model_match.group(1) if old_model_match else 'gpt-4'

    # Extract suggested model from remediation
    new_model_match = re.search(r'(gpt-4o-mini|gpt-3\.5[^\s",)]*|claude-3-haiku[^\s",)]*|gemini-1\.5-flash[^\s",)]*)', remediation, re.I)
    new_model = new_model_match.group(1) if new_model_match else 'gpt-4o-mini'

    ext = issue.get('file', '').split('.')[-1].lower()
    lang = 'python' if ext == 'py' else 'javascript'

    before = f'model="{old_model}"' if ext == 'py' else f'model: "{old_model}"'
    after = f'model="{new_model}"  # ~95% cheaper, same quality for most tasks'
    if ext not in ('py',):
        after = f'model: "{new_model}",  // ~95% cheaper, same quality for most tasks'

    return {
        'type': 'model_swap',
        'language': lang,
        'before': before,
        'after': after,
        'steps': [
            f'1. Find `{old_model}` in `{issue.get("file")}`.',
            f'2. Replace it with `{new_model}`.',
            f'3. Run your test suite to confirm output quality.',
            f'4. Expected cost reduction: ~95%.',
        ]
    }

def _patch_missing_test(issue: dict, file_content: str) -> dict:
    """Generate a starter test file skeleton."""
    src_file = issue.get('file', 'module.py')
    ext = src_file.split('.')[-1].lower()
    basename = src_file.split('/')[-1].replace(f'.{ext}', '')

    if ext == 'py':
        lang = 'python'
        test_filename = f'test_{basename}.py'
        template = f'''import pytest
from {basename} import *  # adjust import to match your structure

class Test{basename.title().replace("_", "")}:
    """Auto-generated test scaffold — fill in real test cases."""

    def test_placeholder(self):
        """Replace with actual test logic."""
        assert True  # TODO: implement
'''
    else:
        lang = 'javascript'
        test_filename = f'{basename}.test.{ext}'
        template = f'''import {{ describe, it, expect }} from 'vitest';  // or jest
// import {{ yourFunction }} from './{basename}';

describe('{basename}', () => {{
  it('should work correctly', () => {{
    // TODO: implement actual test
    expect(true).toBe(true);
  }});
}});
'''

    return {
        'type': 'test_scaffold',
        'language': lang,
        'before': f'# ❌  No test file found for: {src_file}',
        'after': template,
        'new_filename': test_filename,
        'steps': [
            f'1. Create a new file named `{test_filename}` next to `{src_file}`.',
            f'2. Paste the scaffold above as a starting point.',
            f'3. Replace the placeholder with real test cases.',
            f'4. Run your test suite to verify.',
        ]
    }

# --- Dispatch ---
PATCH_HANDLERS = {
    'Hardcoded Secret': _patch_hardcoded_secret,
    'Exposed API Key': _patch_hardcoded_secret,
    'Expensive AI Model Usage': _patch_expensive_model,
    'Missing Unit Tests': _patch_missing_test,
}

def generate_patch(issue: dict, file_content: str = '') -> dict:
    """
    Given an issue dict, return a patch dict with before/after code and fix steps.
    Returns None if no patch is available for this issue type.
    """
    issue_type = issue.get('type', '')
    for key, handler in PATCH_HANDLERS.items():
        if key.lower() in issue_type.lower():
            try:
                return handler(issue, file_content)
            except Exception as e:
                return None
    return None
