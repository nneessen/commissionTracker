#!/bin/bash
# Test recruiting feature

set -e  # Exit on error

echo "==================================="
echo "Recruiting Feature Test Script"
echo "==================================="
echo ""

echo "1. Checking TypeScript compilation..."
npx tsc --noEmit
echo "✅ TypeScript compilation passed"
echo ""

echo "2. Running app build..."
npm run build
echo "✅ Build completed successfully"
echo ""

echo "==================================="
echo "All automated tests passed!"
echo "==================================="
echo ""
echo "Next steps:"
echo "- Run 'npm run dev' to start the dev server"
echo "- Manually test the recruiting page"
echo "- Verify all bugs are fixed"
echo ""
