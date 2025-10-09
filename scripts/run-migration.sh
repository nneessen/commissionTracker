#!/bin/bash
# Run a single migration file on remote Supabase
# Usage: ./scripts/run-migration.sh <migration-file>

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide migration file${NC}"
    echo -e "${YELLOW}Usage: ./scripts/run-migration.sh supabase/migrations/002_fix_policies_commission.sql${NC}"
    exit 1
fi

MIGRATION_FILE="$1"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Running Migration${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "${BLUE}File: $(basename "$MIGRATION_FILE")${NC}\n"

# Check if password is set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${YELLOW}Enter your Supabase database password:${NC}"
    read -s SUPABASE_DB_PASSWORD
    echo ""
fi

# URL encode the password
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SUPABASE_DB_PASSWORD', safe=''))")

# Connection details
DB_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_NAME="postgres"
CONNECTION_STRING="postgresql://${DB_USER}:${ENCODED_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo -e "${YELLOW}Applying migration...${NC}\n"

# Run migration
psql "$CONNECTION_STRING" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}   ✓ Migration Complete!${NC}"
    echo -e "${GREEN}========================================${NC}\n"
else
    echo -e "\n${RED}✗ Migration failed!${NC}"
    exit 1
fi
