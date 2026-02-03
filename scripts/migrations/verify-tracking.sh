#!/bin/bash
# scripts/migrations/verify-tracking.sh
# Verifies all new-format migrations are properly tracked in schema_migrations
# Returns exit code 1 if any migrations are missing from tracking

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MIGRATIONS_DIR="supabase/migrations"

echo "Migration Tracking Verification"
echo "================================"

# Load environment
if [ -f .env ]; then
    source .env
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

# Get all new-format migrations from disk (YYYYMMDDHHMMSS_*)
echo ""
echo "Checking new-format migrations (YYYYMMDDHHMMSS_*)..."
echo ""

DISK_MIGRATIONS=$(ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null | xargs -n1 basename | grep -E '^[0-9]{14}_' | cut -d'_' -f1 | sort)
DISK_COUNT=$(echo "$DISK_MIGRATIONS" | wc -l)

# Get tracked migrations from database
TRACKED_MIGRATIONS=$(psql "${DATABASE_URL}?sslmode=require" -t -A -c "SELECT version FROM supabase_migrations.schema_migrations WHERE length(version) = 14 ORDER BY version;")
TRACKED_COUNT=$(echo "$TRACKED_MIGRATIONS" | grep -c . || echo 0)

echo "Disk migrations (new-format): $DISK_COUNT"
echo "Tracked migrations (new-format): $TRACKED_COUNT"
echo ""

# Find untracked migrations
UNTRACKED=()
for version in $DISK_MIGRATIONS; do
    if ! echo "$TRACKED_MIGRATIONS" | grep -q "^${version}$"; then
        # Get the full filename for this version
        filename=$(ls ${MIGRATIONS_DIR}/${version}_*.sql 2>/dev/null | head -1 | xargs -n1 basename)
        UNTRACKED+=("$version: $filename")
    fi
done

if [ ${#UNTRACKED[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All new-format migrations are tracked!${NC}"
    echo ""

    # Show last 5 tracked
    echo "Most recent tracked migrations:"
    psql "${DATABASE_URL}?sslmode=require" -c "SELECT version, name FROM supabase_migrations.schema_migrations WHERE length(version) = 14 ORDER BY version DESC LIMIT 5;"
else
    echo -e "${RED}✗ UNTRACKED MIGRATIONS FOUND:${NC}"
    echo ""
    for item in "${UNTRACKED[@]}"; do
        echo -e "  ${YELLOW}$item${NC}"
    done
    echo ""
    echo "Run the backfill script to fix:"
    echo "  psql \"\${DATABASE_URL}?sslmode=require\" -f scripts/migrations/backfill-tracking.sql"
    exit 1
fi

# Check old-format migrations status (informational only)
echo ""
echo "Old-format migrations (YYYYMMDD_NNN_*):"
OLD_COUNT=$(ls ${MIGRATIONS_DIR}/*.sql 2>/dev/null | xargs -n1 basename | grep -E '^[0-9]{8}_[0-9]{3}_' | wc -l)
TRACKED_OLD=$(psql "${DATABASE_URL}?sslmode=require" -t -A -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE length(version) = 8;")
echo "  Files on disk: $OLD_COUNT"
echo "  Tracked in DB: $TRACKED_OLD"
echo -e "  ${YELLOW}Note: Old format only tracks one migration per day (version collision)${NC}"
echo ""

echo "Verification complete."
