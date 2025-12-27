#!/bin/bash
# scripts/revert-migration.sh
# Reverts a specific migration by name

MIGRATION_NAME="${1}"

if [ -z "$MIGRATION_NAME" ]; then
    echo "Usage: ./revert-migration.sh <migration-name>"
    echo "Example: ./revert-migration.sh 20251223_001_add_feature"
    echo ""
    echo "The revert SQL file should be located at:"
    echo "  supabase/migrations/reverts/<migration-name>_revert.sql"
    exit 1
fi

REVERT_FILE="supabase/migrations/reverts/${MIGRATION_NAME}_revert.sql"

if [ ! -f "$REVERT_FILE" ]; then
    echo "Error: Revert file not found: $REVERT_FILE"
    echo ""
    echo "Create the revert SQL first in supabase/migrations/reverts/"
    echo "The file should contain SQL to undo the migration."
    exit 1
fi

echo "Reverting migration: $MIGRATION_NAME"
echo "Using revert file: $REVERT_FILE"
echo ""

# Use the pooler connection with URL encoding
export PGPASSWORD='N123j234n345!$!$'

# Use pooler endpoint (us-east-2 region)
psql -h aws-1-us-east-2.pooler.supabase.com \
     -p 6543 \
     -U postgres.pcyaqwodnyrpkaiojnpz \
     -d postgres \
     -f "$REVERT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "Revert applied successfully!"
    echo ""
    echo "IMPORTANT: Remember to regenerate types:"
    echo "  npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts"
    echo ""
    echo "Then run: npm run build"
else
    echo ""
    echo "Revert failed. Check the error above."
    exit 1
fi
