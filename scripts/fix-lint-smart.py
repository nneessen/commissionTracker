#!/usr/bin/env python3
import re
import os

def should_prefix_import(import_name, module_path):
    """Determine if an import should be prefixed with underscore."""
    # Never prefix imports from external libraries
    external_modules = [
        'react', 'lucide-react', '@tanstack', 'date-fns',
        '@radix-ui', 'vitest', 'zod', '@supabase',
        'recharts', 'sonner', 'clsx', 'tailwind-merge'
    ]

    for ext_module in external_modules:
        if module_path and ext_module in module_path:
            return False

    # Don't prefix if it's a type/interface import that's used in type annotations
    if import_name in ['Database', 'Tables', 'Enums', 'Json']:
        return False

    return True

def fix_unused_in_file(filepath):
    """Fix unused variables/parameters in a single file."""
    if not os.path.exists(filepath):
        return 0

    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    fixes = 0

    # Fix unused function parameters (must match /^_/u)
    # Pattern: function(param1, param2) where param2 is unused
    patterns = [
        # Unused function parameters
        (r'error\s+is\s+defined\s+but\s+never\s+used.*Allowed\s+unused\s+args', r'\berror(?=\s*[,\)])', '_error'),
        (r'(\w+)\s+is\s+defined\s+but\s+never\s+used.*Allowed\s+unused\s+args', None, None),

        # Unused caught errors
        (r'error\s+is\s+defined\s+but\s+never\s+used.*Allowed\s+unused\s+caught\s+errors', r'catch\s*\(\s*error\s*\)', 'catch (_error)'),
        (r'(\w+)\s+is\s+defined\s+but\s+never\s+used.*Allowed\s+unused\s+caught\s+errors', None, None),

        # Unused variables (but not imports)
        (r'(\w+)\s+is\s+assigned\s+a\s+value\s+but\s+never\s+used.*Allowed\s+unused\s+vars', None, None),

        # Unused destructured elements
        (r'(\w+)\s+is\s+assigned\s+a\s+value\s+but\s+never\s+used.*Allowed\s+unused\s+elements', None, None),
    ]

    # Read the actual lint errors for this file
    lint_errors = get_lint_errors_for_file(filepath)

    for error_info in lint_errors:
        var_name = error_info['var']
        line_num = error_info['line']
        error_type = error_info['type']

        # Skip if already prefixed
        if var_name.startswith('_'):
            continue

        # Skip imports from external modules
        if 'defined but never used' in error_type and 'import' in error_type:
            # Check if it's an external import
            import_pattern = rf"import\s+.*\{[^}}]*\b{re.escape(var_name)}\b[^}}]*\}.*from\s+['\"]([^'\"]+)['\"]"
            import_match = re.search(import_pattern, content)
            if import_match:
                module_path = import_match.group(1)
                if not should_prefix_import(var_name, module_path):
                    continue

        # Apply the fix
        safe_var = re.escape(var_name)

        if 'unused args' in error_type or 'unused caught errors' in error_type:
            # Function parameters or catch blocks
            pattern = rf'\b{safe_var}\b(?=\s*[,:\)])'
            replacement = f'_{var_name}'
        elif 'destructuring' in error_type:
            # Destructured elements
            pattern = rf'\b{safe_var}\b(?=\s*[,\]])'
            replacement = f'_{var_name}'
        else:
            # Regular variables
            pattern = rf'\b(?:const|let|var)\s+{safe_var}\b'
            replacement = lambda m: m.group(0).replace(var_name, f'_{var_name}')

        if callable(replacement):
            new_content = re.sub(pattern, replacement, content)
        else:
            new_content = re.sub(pattern, replacement, content)

        if new_content != content:
            content = new_content
            fixes += 1

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)

    return fixes

def get_lint_errors_for_file(filepath):
    """Parse lint output to get errors for a specific file."""
    import subprocess

    result = subprocess.run(
        ['npx', 'eslint', filepath, '--format', 'json'],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(filepath) or '.'
    )

    errors = []
    try:
        import json
        data = json.loads(result.stdout)
        if data and len(data) > 0:
            file_results = data[0]
            for msg in file_results.get('messages', []):
                if 'is defined but never used' in msg.get('message', '') or \
                   'is assigned a value but never used' in msg.get('message', ''):
                    # Extract variable name from message
                    match = re.match(r"'?(\w+)'?\s+is", msg['message'])
                    if match:
                        errors.append({
                            'var': match.group(1),
                            'line': msg.get('line', 0),
                            'type': msg['message']
                        })
    except:
        pass

    return errors

def main():
    # Get all TypeScript/TSX files
    files_to_fix = []
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                files_to_fix.append(os.path.join(root, file))

    # Also check other directories
    for directory in ['archive', 'migration-tools', 'supabase/functions', 'tests']:
        if os.path.exists(directory):
            for root, dirs, files in os.walk(directory):
                for file in files:
                    if file.endswith(('.ts', '.tsx')):
                        files_to_fix.append(os.path.join(root, file))

    total_fixes = 0
    for filepath in files_to_fix:
        fixes = fix_unused_in_file(filepath)
        if fixes > 0:
            print(f"Fixed {fixes} issues in {filepath}")
            total_fixes += fixes

    print(f"\nTotal fixes applied: {total_fixes}")
    return total_fixes

if __name__ == "__main__":
    main()