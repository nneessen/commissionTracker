#!/usr/bin/env python3
"""
Fix incorrect underscore prefixes in import statements - Version 2.
This version handles multiline imports and all edge cases.
"""

import re
import os
from pathlib import Path

def remove_underscore_if_capitalized(name: str) -> str:
    """Remove leading underscore if followed by capital letter."""
    name = name.strip()
    if name.startswith('_') and len(name) > 1 and name[1].isupper():
        return name[1:]
    return name

def fix_file(filepath: Path) -> tuple[bool, int]:
    """
    Fix import statements in a file.
    Returns (was_modified, changes_count).
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False, 0

    original_content = content
    changes = 0

    # Pattern to match import statements with named imports (including multiline)
    # This matches: import { ... } from "..."
    # and: import type { ... } from "..."
    import_pattern = r'import\s+(type\s+)?{([^}]+)}\s+from'

    def fix_import_match(match):
        nonlocal changes
        prefix = match.group(1) or ''  # 'type ' or empty
        imports_str = match.group(2)  # Everything between { }

        # Split by comma and process each import
        import_parts = []
        for part in imports_str.split(','):
            part = part.strip()
            if not part:
                continue

            # Handle aliased imports: "Foo as Bar" or "_Foo as Bar"
            if ' as ' in part:
                parts = part.split(' as ')
                original = parts[0].strip()
                alias = parts[1].strip()

                fixed_original = remove_underscore_if_capitalized(original)
                if fixed_original != original:
                    changes += 1

                import_parts.append(f"{fixed_original} as {alias}")
            else:
                # Simple import
                fixed_part = remove_underscore_if_capitalized(part)
                if fixed_part != part:
                    changes += 1
                import_parts.append(fixed_part)

        # Reconstruct the import statement
        fixed_imports = ', '.join(import_parts)
        return f"import {prefix}{{{fixed_imports}}} from"

    # Apply the fix
    content = re.sub(import_pattern, fix_import_match, content)

    if content != original_content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, changes
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
    total_changes = 0

    for directory in directories:
        if not os.path.exists(directory):
            continue

        # Find all TypeScript/JavaScript files
        for ext in ['*.ts', '*.tsx', '*.js', '*.jsx']:
            for filepath in Path(directory).rglob(ext):
                total_files += 1
                was_modified, changes = fix_file(filepath)

                if was_modified:
                    total_modified += 1
                    total_changes += changes
                    print(f"Fixed {changes} import(s) in: {filepath}")

    print(f"\n=== Summary ===")
    print(f"Files scanned: {total_files}")
    print(f"Files modified: {total_modified}")
    print(f"Total changes: {total_changes}")

if __name__ == '__main__':
    main()
