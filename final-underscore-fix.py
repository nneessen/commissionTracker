import re
import os
import glob

def fix_file(filepath):
    """Remove ALL underscore prefixes from property names (except truly unused vars)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    original_content = ''.join(lines)
    modified = False
    
    new_lines = []
    for line in lines:
        original_line = line
        
        # Fix property accesses: ._something -> .something
        # But be careful not to break things like ._typename which might be intentional
        line = re.sub(r'\.(_[a-z][a-zA-Z0-9]*)', lambda m: '.' + m.group(1)[1:], line)
        
        # Fix object destructuring: { _property } -> { property }
        line = re.sub(r'{(\s*)_([a-z][a-zA-Z0-9]*)', r'{\1\2', line)
        line = re.sub(r',(\s*)_([a-z][a-zA-Z0-9]*)', r',\1\2', line)
        
        if line != original_line:
            modified = True
        
        new_lines.append(line)
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        return True
    return False

# Find all TypeScript and TSX files
files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)

fixed_count = 0
for filepath in files:
    if fix_file(filepath):
        fixed_count += 1

print(f"Fixed remaining underscores in {fixed_count} files")
