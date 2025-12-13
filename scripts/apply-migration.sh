#!/bin/bash
# scripts/apply-migration.sh

# Get the migration file from argument or use default
MIGRATION_FILE="${1:-supabase/migrations/20241213_010_fix_user_profile_trigger.sql}"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Applying migration: $MIGRATION_FILE"

# Use the pooler connection with URL encoding
export PGPASSWORD='N123j234n345!$!$'

# Use pooler endpoint which is more reliable
psql -h aws-0-us-east-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.pcyaqwodnyrpkaiojnpz \
     -d postgres \
     -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi