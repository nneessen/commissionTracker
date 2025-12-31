#!/bin/bash

# Cleanup old plan files from plans/active/
# Identifies plans older than 3 days and prompts to move them to plans/completed/

set -e

ACTIVE_DIR="plans/active"
COMPLETED_DIR="plans/completed"
DAYS_OLD=3

echo "🔍 Checking for plans older than $DAYS_OLD days in $ACTIVE_DIR/"
echo ""

# Find files older than DAYS_OLD days
OLD_FILES=$(find "$ACTIVE_DIR" -name "*.md" -type f -mtime +$DAYS_OLD 2>/dev/null || true)

if [ -z "$OLD_FILES" ]; then
  echo "✅ No old plans found. All active plans are recent."
  exit 0
fi

echo "📋 Found old plans:"
echo "$OLD_FILES" | while read -r file; do
  MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d" "$file")
  echo "  - $(basename "$file") (modified: $MODIFIED)"
done
echo ""

read -p "Move these to $COMPLETED_DIR/? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "$OLD_FILES" | while read -r file; do
    git mv "$file" "$COMPLETED_DIR/"
    echo "  ✓ Moved $(basename "$file")"
  done
  echo ""
  echo "✅ Cleanup complete! Run 'git status' to see changes."
else
  echo "❌ Cleanup cancelled."
fi
