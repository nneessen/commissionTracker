import re
import os
import glob

def fix_imports_in_file(filepath):
    """Remove underscore prefix from imported names that should not have it."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix import statements - remove _ prefix from imported names (but not from names like _unused)
    # This regex looks for import statements and removes _ from capitalized names or React hooks
    # Pattern: import { _SomeName, _anotherName } from '...'
    
    # Strategy: Find all imports and fix the underscored names inside them
    def fix_import_match(match):
        import_statement = match.group(0)
        # Remove _ from:
        # 1. Names starting with uppercase letter (types, components, constants)
        # 2. Names starting with 'use' (React hooks)
        # 3. Common utility names
        fixed = re.sub(r'([,\s{]|^)_([A-Z][a-zA-Z0-9]*)', r'\1\2', import_statement)
        fixed = re.sub(r'([,\s{]|^)_(use[A-Z][a-zA-Z0-9]*)', r'\1\2', fixed)
        fixed = re.sub(r'([,\s{]|^)_(parse[A-Z][a-zA-Z0-9]*)', r'\1\2', fixed)
        fixed = re.sub(r'([,\s{]|^)_(format[A-Z][a-zA-Z0-9]*)', r'\1\2', fixed)
        fixed = re.sub(r'([,\s{]|^)_(generate[A-Z][a-zA-Z0-9]*)', r'\1\2', fixed)
        fixed = re.sub(r'([,\s{]|^)_(get[A-Z][a-zA-Z0-9]*)', r'\1\2', fixed)
        return fixed
    
    # Match import statements (single and multi-line)
    content = re.sub(
        r'import\s+{[^}]+}\s+from\s+[\'"][^\'"]+[\'"]',
        fix_import_match,
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Find all TypeScript and TSX files
files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)

fixed_count = 0
for filepath in files:
    if fix_imports_in_file(filepath):
        fixed_count += 1

print(f"Fixed imports in {fixed_count} files")
