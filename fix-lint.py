#!/usr/bin/env python3
# /home/nneessen/projects/commissionTracker/fix-lint.py
# Automatically fix ESLint unused variable errors

import subprocess
import re
import sys
from pathlib import Path

def get_lint_errors():
    """Run ESLint and parse errors"""
    result = subprocess.run(['npm', 'run', 'lint'], capture_output=True, text=True)
    output = result.stdout + result.stderr

    errors = {}
    current_file = None

    for line in output.split('\n'):
        # Match file path
        if line.startswith('/home/'):
            current_file = line.strip()
            if current_file not in errors:
                errors[current_file] = []
        # Match error line
        elif current_file and '@typescript-eslint/no-unused-vars' in line:
            match = re.search(r'(\d+):(\d+)\s+error\s+\'([^\']+)\' is (assigned a value but never used|defined but never used)', line)
            if match:
                line_num, col, var_name, _ = match.groups()
                errors[current_file].append({
                    'line': int(line_num),
                    'col': int(col),
                    'var': var_name
                })

    return errors

def fix_file(file_path, error_list):
    """Fix unused vars in a single file"""
    if not Path(file_path).exists():
        return 0

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_count = 0
    # Sort by line number descending to avoid index shifts
    for error in sorted(error_list, key=lambda x: x['line'], reverse=True):
        line_idx = error['line'] - 1
        if line_idx < 0 or line_idx >= len(lines):
            continue

        var_name = error['var']
        if var_name.startswith('_'):
            continue  # Already fixed

        line = lines[line_idx]

        # Replace the variable name with underscore-prefixed version
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(var_name) + r'\b'
        new_line = re.sub(pattern, f'_{var_name}', line, count=1)

        if new_line != line:
            lines[line_idx] = new_line
            fixed_count += 1

    if fixed_count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f'Fixed {fixed_count} errors in {Path(file_path).relative_to(Path.cwd())}')

    return fixed_count

def main():
    print('Analyzing ESLint errors...')
    errors = get_lint_errors()

    if not errors:
        print('No unused variable errors found!')
        return

    print(f'Found unused variables in {len(errors)} files')

    total_fixed = 0
    for file_path, error_list in errors.items():
        total_fixed += fix_file(file_path, error_list)

    print(f'\nTotal fixes applied: {total_fixed}')
    print('\nRun npm run lint again to verify')

if __name__ == '__main__':
    main()
