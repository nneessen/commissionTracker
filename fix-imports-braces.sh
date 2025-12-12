#!/bin/bash
# Fix all imports missing opening braces

echo "Fixing broken imports with missing opening braces..."

# Fix pattern: import  Something} from 'module' -> import {Something} from 'module'
find src/ -name "*.tsx" -o -name "*.ts" | while read file; do
  # Check if file has the issue
  if grep -q "^import  [A-Z]" "$file" 2>/dev/null; then
    echo "Fixing: $file"
    # Fix the pattern - add opening brace after import
    sed -i 's/^import  \([A-Z]\)/import {\1/g' "$file"
  fi
done

echo "Done fixing imports"