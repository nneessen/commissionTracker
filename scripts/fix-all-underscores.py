import re
import os
import glob

def fix_file(filepath):
    """Remove underscore prefix from imports and property accesses that should not have it."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix import statements - remove _ from any imported name that starts with _
    # (except for genuinely unused variables like __typename)
    def fix_import_statement(match):
        import_line = match.group(0)
        # Fix any _Name to Name in imports
        fixed = re.sub(r'([,\s{]|^)_([a-zA-Z][a-zA-Z0-9]*)', r'\1\2', import_line)
        return fixed
    
    # Fix multi-line imports
    content = re.sub(
        r'import\s+{[^}]+}\s+from\s+[\'"][^\'"]+[\'"]',
        fix_import_statement,
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Fix property accesses like obj._property or obj._Property
    content = re.sub(r'\.(_[a-zA-Z][a-zA-Z0-9]*)', lambda m: '.' + m.group(1)[1:], content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Find all TypeScript and TSX files
files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)

fixed_count = 0
for filepath in files:
    if fix_file(filepath):
        fixed_count += 1

print(f"Fixed underscores in {fixed_count} files")
