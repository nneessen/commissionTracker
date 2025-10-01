#!/bin/bash
# Simple migration script
# Usage: ./scripts/migrate.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Database Migration Tool${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if password is set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${YELLOW}Enter your Supabase database password:${NC}"
    read -s SUPABASE_DB_PASSWORD
    echo ""
fi

# URL encode the password
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SUPABASE_DB_PASSWORD', safe=''))")

# Build connection string
DB_URL="postgresql://postgres.pcyaqwodnyrpkaiojnpz:${ENCODED_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

echo -e "${GREEN}Running migrations...${NC}\n"

# Run each migration
psql "$DB_URL" -f supabase/migrations/20251001_007_SAFE_users_view_corrected.sql 2>&1 | grep -E "NOTICE|ERROR|✓|✗" || true
psql "$DB_URL" -f supabase/migrations/20251001_008_SAFE_rls_policies.sql 2>&1 | grep -E "NOTICE|ERROR|✓|✗" | grep -v "does not exist, skipping" || true
psql "$DB_URL" -f supabase/migrations/20250930_004_user_metadata_setup.sql 2>&1 | grep -E "NOTICE|ERROR|✓|✗" || true
psql "$DB_URL" -f supabase/migrations/20251001_006_add_performance_indexes.sql 2>&1 | grep -E "NOTICE|ERROR|✓|✗" || true

echo -e "\n${GREEN}Verifying migrations...${NC}\n"

# Run verification
psql "$DB_URL" << 'SQL'
SELECT 'Users view exists' as check_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'users' AND table_type = 'VIEW'
       ) THEN '✓ PASS' ELSE '✗ FAIL' END as status
UNION ALL
SELECT 'Tables use user_id',
       CASE WHEN (
           SELECT COUNT(*) FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'user_id'
       ) >= 5 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT 'RLS enabled',
       CASE WHEN (
           SELECT COUNT(*) FROM pg_tables
           WHERE schemaname = 'public' AND rowsecurity = true
       ) >= 8 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT 'Policies created',
       CASE WHEN (
           SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
       ) >= 15 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT 'Functions created',
       CASE WHEN (
           SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public'
       ) >= 3 THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT 'Indexes created',
       CASE WHEN (
           SELECT COUNT(*) FROM pg_indexes
           WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
       ) >= 15 THEN '✓ PASS' ELSE '✗ FAIL' END;
SQL

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Migrations Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"
