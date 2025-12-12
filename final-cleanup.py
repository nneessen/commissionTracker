import re
import glob

def fix_all_underscores(filepath):
    """Fix ALL remaining underscore prefixes in imports and destructuring."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix import statements - remove _ from EVERY imported name
    # Match: import { _Something, _another } from '...'
    def fix_imports(match):
        import_block = match.group(0)
        # Remove _ from all imported names
        fixed = re.sub(r'([,{\s])_([a-zA-Z][a-zA-Z0-9_]*)', r'\1\2', import_block)
        return fixed
    
    content = re.sub(
        r'import\s+{[^}]+}\s+from\s+[\'"][^\'"]+[\'"]',
        fix_imports,
        content,
        flags=re.DOTALL
    )
    
    # Fix destructuring in code: const { _property } = obj
    content = re.sub(r'{\s*_([a-zA-Z][a-zA-Z0-9_]*)', r'{ \1', content)
    content = re.sub(r',\s*_([a-zA-Z][a-zA-Z0-9_]*)', r', \1', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)
fixed = sum(1 for f in files if fix_all_underscores(f))
print(f"Fixed {fixed} files")
