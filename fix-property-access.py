import re
import os
import glob

def fix_properties_in_file(filepath):
    """Remove underscore prefix from property accesses that should not have it."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix property accesses like obj._PropertyName to obj.PropertyName
    # But keep genuine unused variables like let _unused = ...
    
    # Fix: ._PropertyName (uppercase after underscore)
    content = re.sub(r'\.(_[A-Z][a-zA-Z0-9]*)', r'.\1'.replace('_', ''), content)
    
    # Fix: ._camelCase property names (common properties like _error, _data, _can, etc.)
    content = re.sub(r'\._(error|data|can|is|get|set|has|should|will)', r'.\1', content)
    content = re.sub(r'\._(isFetching|isLoading|isCollapsed|isValid|isOpen)', r'.\1', content)
    content = re.sub(r'\._(currentState|nextState|previousState)', r'.\1', content)
    content = re.sub(r'\._(total[A-Z][a-zA-Z0-9]*)', r'.\1', content)
    content = re.sub(r'\._(period[A-Z][a-zA-Z0-9]*)', r'.\1', content)
    content = re.sub(r'\._(breakeven[A-Z][a-zA-Z0-9]*)', r'.\1', content)
    content = re.sub(r'\._(policies[A-Z][a-zA-Z0-9]*)', r'.\1', content)
    
    # Fix variable declarations with _ prefix where they shouldn't be
    # totalPaid should not be _totalPaid
    content = re.sub(r'\b_total([A-Z][a-zA-Z0-9]*)\b', r'total\1', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Find all TypeScript and TSX files
files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)

fixed_count = 0
for filepath in files:
    if fix_properties_in_file(filepath):
        fixed_count += 1

print(f"Fixed property accesses in {fixed_count} files")
