#!/bin/bash
# Run TypeScript type checking
echo "🔍 Running TypeScript type check..."
npm run typecheck

if [ $? -eq 0 ]; then
  echo "✅ Type check passed"
  exit 0
else
  echo "⚠️  Type check found errors (review output above)"
  exit 1
fi
