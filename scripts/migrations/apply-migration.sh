#!/bin/bash
# scripts/apply-migration.sh
# THE CORRECT AND ONLY MIGRATION SCRIPT TO USE
# Usage: ./scripts/apply-migration.sh supabase/migrations/YYYYMMDD_migration_name.sql

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if migration file provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide migration file${NC}"
    echo -e "${YELLOW}Usage: ./scripts/apply-migration.sh supabase/migrations/YYYYMMDD_migration_name.sql${NC}"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Applying Migration to Supabase${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "${BLUE}File: $(basename "$MIGRATION_FILE")${NC}\n"

# Database connection details
DB_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_PASS="N123j234n345!\$!\$"

# Connection string (the format that ACTUALLY WORKS)
CONN_STR="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo -e "${YELLOW}Connecting to Supabase database...${NC}\n"

# Apply migration
psql "${CONN_STR}" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}   ✅ Migration Applied Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}\n"

    # Auto-track the migration in schema_migrations
    FILENAME=$(basename "$MIGRATION_FILE" .sql)

    # Parse version and name from filename
    # New format: YYYYMMDDHHMMSS_description
    # Old format: YYYYMMDD_NNN_description
    if [[ "$FILENAME" =~ ^([0-9]{14})_(.+)$ ]]; then
        # New format
        VERSION="${BASH_REMATCH[1]}"
        NAME="${BASH_REMATCH[2]}"
    elif [[ "$FILENAME" =~ ^([0-9]{8})_([0-9]{3}_.+)$ ]]; then
        # Old format
        VERSION="${BASH_REMATCH[1]}"
        NAME="${BASH_REMATCH[2]}"
    else
        echo -e "${YELLOW}Warning: Could not parse migration filename for tracking${NC}"
        VERSION=""
        NAME=""
    fi

    if [ -n "$VERSION" ] && [ -n "$NAME" ]; then
        echo -e "${BLUE}Tracking migration in schema_migrations...${NC}"
        psql "${CONN_STR}" -c "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${VERSION}', '${NAME}') ON CONFLICT (version) DO NOTHING;" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Migration tracked: version=${VERSION}, name=${NAME}${NC}\n"
        else
            echo -e "${YELLOW}⚠ Could not track migration (may already exist)${NC}\n"
        fi
    fi
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}   ✗ Migration Failed!${NC}"
    echo -e "${RED}========================================${NC}\n"
    exit 1
fi
