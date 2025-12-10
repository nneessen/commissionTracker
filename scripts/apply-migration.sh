#!/bin/bash
# /home/nneessen/projects/commissionTracker/scripts/apply-migration.sh

# Apply migrations

echo "Applying workflow migration..."

# Use supabase db push with all migrations
npx supabase db push \
  --password "N123j234n345!\$!\$" \
  --linked \
  --include-all \
  2>&1

echo "Migration applied!"