#!/bin/bash

# Fix all the incorrectly prefixed imports
# These should NOT have underscore prefix because they ARE being used

# Fix _logger imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/import { _logger }/import { logger }/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/from "_logger"/from "logger"/g' {} +

# Fix other common prefixed imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/import { _\([A-Z][a-zA-Z0-9]*\) }/import { \1 }/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/, _\([A-Z][a-zA-Z0-9]*\),/, \1,/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/, _\([A-Z][a-zA-Z0-9]*\) /, \1 /g' {} +

echo "Fixed imports"
