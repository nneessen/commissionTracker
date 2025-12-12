#!/bin/bash
# Script to fix common linting errors

echo "Fixing linting errors..."

# Fix prefer-const errors (let -> const where variable is never reassigned)
echo "Fixing prefer-const errors..."
find src archive migration-tools supabase tests -name "*.ts" -o -name "*.tsx" | while read file; do
  # Fix specific prefer-const patterns
  sed -i 's/let query =/const query =/g' "$file"
  sed -i 's/let filteredExpenses =/const filteredExpenses =/g' "$file"
  sed -i 's/let referenceDate =/const referenceDate =/g' "$file"
  sed -i 's/let roleError =/const roleError =/g' "$file"
  sed -i 's/let error =/const error =/g' "$file"
done

# Fix lexical declarations in case blocks by wrapping in blocks
echo "Fixing case declarations..."
find src supabase -name "*.ts" -o -name "*.tsx" | xargs grep -l "case.*:" | while read file; do
  # This is complex - we'll handle manually in critical files
  echo "  - Found case blocks in: $file"
done

echo "Script complete - manual fixes still required for complex patterns"