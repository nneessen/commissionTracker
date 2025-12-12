#!/usr/bin/env python3
# /home/nneessen/projects/commissionTracker/fix-remaining-lint.py
# Fix all remaining ESLint errors

import subprocess
import re
from pathlib import Path

def get_errors():
    """Get all remaining errors from ESLint"""
    result = subprocess.run(['npm', 'run', 'lint'], capture_output=True, text=True)
    output = result.stdout + result.stderr

    errors = []
    current_file = None

    for line in output.split('\n'):
        if line.startswith('/home/'):
            current_file = line.strip()
        elif current_file and 'error' in line and 'warning' not in line:
            match = re.search(r'(\d+):(\d+)\s+error\s+(.*)', line)
            if match:
                line_num, col, error_msg = match.groups()
                errors.append({
                    'file': current_file,
                    'line': int(line_num),
                    'col': int(col),
                    'msg': error_msg.strip()
                })

    return errors

def fix_prefer_const(file_path, line_num):
    """Fix prefer-const error by changing let to const"""
    with open(file_path, 'r') as f:
        lines = f.readlines()

    line_idx = line_num - 1
    if line_idx < 0 or line_idx >= len(lines):
        return False

    line = lines[line_idx]
    if 'let ' in line:
        lines[line_idx] = line.replace('let ', 'const ', 1)
        with open(file_path, 'w') as f:
            f.writelines(lines)
        return True
    return False

def fix_no_case_declarations(file_path, line_num):
    """Fix no-case-declarations by wrapping case block in braces"""
    with open(file_path, 'r') as f:
        lines = f.readlines()

    line_idx = line_num - 1
    if line_idx < 0 or line_idx >= len(lines):
        return False

    # Find the case statement
    case_line_idx = line_idx
    for i in range(line_idx, -1, -1):
        if 'case ' in lines[i] or 'default:' in lines[i]:
            case_line_idx = i
            break

    # Check if already wrapped
    if '{' in lines[case_line_idx]:
        return False

    # Add opening brace after case/default line
    indent = len(lines[case_line_idx]) - len(lines[case_line_idx].lstrip())
    lines[case_line_idx] = lines[case_line_idx].rstrip() + ' {\n'

    # Find the break/return and add closing brace before it
    for i in range(case_line_idx + 1, len(lines)):
        if 'break;' in lines[i] or 'return' in lines[i]:
            # Add closing brace on its own line before break
            brace_indent = ' ' * indent
            lines.insert(i, f'{brace_indent}}}\n')
            break

    with open(file_path, 'w') as f:
        f.writelines(lines)
    return True

def fix_no_useless_escape(file_path, line_num, col):
    """Fix unnecessary escape characters"""
    with open(file_path, 'r') as f:
        lines = f.readlines()

    line_idx = line_num - 1
    if line_idx < 0 or line_idx >= len(lines):
        return False

    line = lines[line_idx]
    # Remove unnecessary escapes for / and .
    line = line.replace(r'\/', '/')
    line = line.replace(r'\.', '.')

    lines[line_idx] = line
    with open(file_path, 'w') as f:
        f.writelines(lines)
    return True

def fix_unused_var(file_path, line_num, var_name):
    """Fix unused variable by prefixing with underscore"""
    with open(file_path, 'r') as f:
        lines = f.readlines()

    line_idx = line_num - 1
    if line_idx < 0 or line_idx >= len(lines):
        return False

    line = lines[line_idx]
    pattern = r'\b' + re.escape(var_name) + r'\b'
    lines[line_idx] = re.sub(pattern, f'_{var_name}', line, count=1)

    with open(file_path, 'w') as f:
        f.writelines(lines)
    return True

def main():
    print('Analyzing remaining ESLint errors...')
    errors = get_errors()

    if not errors:
        print('No errors found!')
        return

    print(f'Found {len(errors)} errors')

    # Group errors by type
    prefer_const = [e for e in errors if 'prefer-const' in e['msg']]
    no_case = [e for e in errors if 'no-case-declarations' in e['msg']]
    no_escape = [e for e in errors if 'no-useless-escape' in e['msg']]
    unused_vars = [e for e in errors if 'no-unused-vars' in e['msg']]

    # Fix prefer-const errors
    for error in prefer_const:
        if fix_prefer_const(error['file'], error['line']):
            print(f"Fixed prefer-const in {Path(error['file']).name}:{error['line']}")

    # Fix no-case-declarations errors
    for error in no_case:
        if fix_no_case_declarations(error['file'], error['line']):
            print(f"Fixed no-case-declarations in {Path(error['file']).name}:{error['line']}")

    # Fix no-useless-escape errors
    for error in no_escape:
        if fix_no_useless_escape(error['file'], error['line'], error['col']):
            print(f"Fixed no-useless-escape in {Path(error['file']).name}:{error['line']}")

    # Fix unused vars
    for error in unused_vars:
        match = re.search(r"'([^']+)' is assigned a value but never used", error['msg'])
        if match:
            var_name = match.group(1)
            if fix_unused_var(error['file'], error['line'], var_name):
                print(f"Fixed unused var '{var_name}' in {Path(error['file']).name}:{error['line']}")

    print(f'\nFixed errors. Remaining errors need manual fix.')
    print('Run npm run lint again to check')

if __name__ == '__main__':
    main()
