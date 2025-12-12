#!/usr/bin/env python3
"""
Fix remaining underscore issues:
1. Named imports with underscores (using inline format)
2. Property accesses like ._property
3. Destructured properties
"""

import re
import os
from pathlib import Path

def fix_file_content(content: str) -> tuple[str, int]:
    """
    Fix all underscore issues in file content.
    Returns (fixed_content, changes_count).
    """
    changes = 0
    original = content

    # Fix 1: Inline import statements that span single line
    # Pattern: import {X, _Y, Z} from "module"
    def fix_inline_import(match):
        nonlocal changes
        before = match.group(1)  # Everything before the imports
        imports_str = match.group(2)  # The import list
        after = match.group(3)  # Everything after

        # Process each import
        fixed_imports = []
        for item in imports_str.split(','):
            item = item.strip()
            if not item:
                continue

            # Handle aliased imports
            if ' as ' in item:
                parts = item.split(' as ')
                original_name = parts[0].strip()
                alias = parts[1].strip()

                if original_name.startswith('_') and len(original_name) > 1 and original_name[1].isupper():
                    original_name = original_name[1:]
                    changes += 1

                fixed_imports.append(f"{original_name} as {alias}")
            else:
                # Simple import
                if item.startswith('_') and len(item) > 1 and item[1].isupper():
                    fixed_imports.append(item[1:])
                    changes += 1
                else:
                    fixed_imports.append(item)

        return f"{before}{', '.join(fixed_imports)}{after}"

    # Apply to single-line imports
    content = re.sub(
        r'(import\s+(?:type\s+)?\{)([^}]+)(\}\s+from)',
        fix_inline_import,
        content
    )

    # Fix 2: Property destructuring with underscores
    # Pattern: const { _prop } = obj  or  const { _prop1, _prop2 } = obj
    def fix_destructuring(match):
        nonlocal changes
        before = match.group(1)  # const/let/var {
        props = match.group(2)  # the properties
        after = match.group(3)  # } = ...

        fixed_props = []
        for prop in props.split(','):
            prop = prop.strip()
            if not prop:
                continue

            # Handle aliasing: _oldName: newName
            if ':' in prop:
                parts = prop.split(':')
                old_name = parts[0].strip()
                new_name = parts[1].strip()

                if old_name.startswith('_') and len(old_name) > 1 and old_name[1].islower():
                    old_name = old_name[1:]
                    changes += 1

                fixed_props.append(f"{old_name}: {new_name}")
            else:
                # Simple destructuring
                if prop.startswith('_') and len(prop) > 1 and prop[1].islower():
                    fixed_props.append(prop[1:])
                    changes += 1
                else:
                    fixed_props.append(prop)

        return f"{before}{', '.join(fixed_props)}{after}"

    # Apply to destructuring patterns
    content = re.sub(
        r'((?:const|let|var)\s*\{)([^}]+)(\}\s*=)',
        fix_destructuring,
        content
    )

    changes_made = content != original
    return content, changes

def fix_file(filepath: Path) -> tuple[bool, int]:
    """
    Fix a single file.
    Returns (was_modified, changes_count).
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False, 0

    fixed_content, changes = fix_file_content(content)

    if changes > 0:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True, changes
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            return False, 0

    return False, 0

def main():
    directories = [
        'src',
        'tests'
    ]

    total_files = 0
    total_modified = 0
    total_changes = 0

    for directory in directories:
        if not os.path.exists(directory):
            continue

        for ext in ['*.ts', '*.tsx']:
            for filepath in Path(directory).rglob(ext):
                total_files += 1
                was_modified, changes = fix_file(filepath)

                if was_modified:
                    total_modified += 1
                    total_changes += changes
                    print(f"Fixed {changes} issue(s) in: {filepath}")

    print(f"\n=== Summary ===")
    print(f"Files scanned: {total_files}")
    print(f"Files modified: {total_modified}")
    print(f"Total changes: {total_changes}")

if __name__ == '__main__':
    main()
