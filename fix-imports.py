#!/usr/bin/env python3
"""
Fix incorrect underscore prefixes in import statements.
This script removes underscores from:
1. Named imports: import { _Foo } -> import { Foo }
2. Type imports: import type { _Bar } -> import type { Bar }
3. Default imports are not affected (they don't have braces)
"""

import re
import os
from pathlib import Path

def fix_import_line(line: str) -> str:
    """Fix underscores in import statements on a single line."""
    # Pattern for named imports with underscores: import { _Name, _Other }
    # This handles: import { _X }, import type { _X }, import { _X, _Y }

    # Find import statements with braces
    import_pattern = r'import\s+(type\s+)?\{([^}]+)\}'

    def fix_import_names(match):
        prefix = match.group(1) or ''  # 'type ' or empty
        imports = match.group(2)

        # Split by comma and fix each import
        import_parts = []
        for part in imports.split(','):
            # Remove leading/trailing whitespace
            part = part.strip()

            # Check if it's an aliased import (e.g., "Foo as Bar")
            if ' as ' in part:
                # Handle "Foo as _Bar" or "_Foo as Bar" or "_Foo as _Bar"
                parts = part.split(' as ')
                original = parts[0].strip()
                alias = parts[1].strip()

                # Remove underscore from original if it starts with _
                if original.startswith('_') and len(original) > 1 and original[1].isupper():
                    original = original[1:]

                # Keep alias as-is (it might be intentionally prefixed)
                part = f"{original} as {alias}"
            else:
                # Simple import - remove underscore if it's a capitalized name
                if part.startswith('_') and len(part) > 1 and part[1].isupper():
                    part = part[1:]

            import_parts.append(part)

        # Reconstruct the import statement
        fixed_imports = ', '.join(import_parts)
        return f"import {prefix}{{{fixed_imports}}}"

    return re.sub(import_pattern, fix_import_names, line)

def fix_file(filepath: Path) -> tuple[bool, int]:
    """
    Fix import statements in a file.
    Returns (was_modified, lines_changed).
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False, 0

    modified = False
    lines_changed = 0
    new_lines = []

    for line in lines:
        # Only process lines that contain 'import' and '{'
        if 'import' in line and '{' in line:
            fixed_line = fix_import_line(line)
            if fixed_line != line:
                modified = True
                lines_changed += 1
                new_lines.append(fixed_line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    if modified:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return True, lines_changed
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            return False, 0

    return False, 0

def main():
    # Directories to process
    directories = [
        'src',
        'tests',
        'archive',
        'migration-tools',
        'supabase/functions'
    ]

    total_files = 0
    total_modified = 0
    total_lines = 0

    for directory in directories:
        if not os.path.exists(directory):
            continue

        # Find all TypeScript/JavaScript files
        for ext in ['*.ts', '*.tsx', '*.js', '*.jsx']:
            for filepath in Path(directory).rglob(ext):
                total_files += 1
                was_modified, lines_changed = fix_file(filepath)

                if was_modified:
                    total_modified += 1
                    total_lines += lines_changed
                    print(f"Fixed {lines_changed} import(s) in: {filepath}")

    print(f"\n=== Summary ===")
    print(f"Files scanned: {total_files}")
    print(f"Files modified: {total_modified}")
    print(f"Import lines fixed: {total_lines}")

if __name__ == '__main__':
    main()
