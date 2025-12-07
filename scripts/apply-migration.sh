#!/bin/bash
# /home/nneessen/projects/commissionTracker/scripts/apply-migration.sh

# Apply the user service fix migration

echo "Applying user service fix migration..."

# Use supabase db push with explicit file
npx supabase db push \
  --password "N123j234n345!\$!\$" \
  --include-migrations "20251207_fix_user_service_and_role_duplicates.sql" \
  2>&1

echo "Migration applied!"