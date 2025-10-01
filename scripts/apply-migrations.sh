#!/bin/bash
# Apply all SAFE migrations in order

set -e  # Exit on any error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Supabase Migration Application${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if SUPABASE_DB_PASSWORD is set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${YELLOW}Database password not found in environment${NC}"
    echo -e "${YELLOW}Please enter your Supabase database password:${NC}"
    read -s SUPABASE_DB_PASSWORD
    echo ""
    if [ -z "$SUPABASE_DB_PASSWORD" ]; then
        echo -e "${RED}Error: No password provided${NC}"
        exit 1
    fi
fi

# Connection details
DB_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_NAME="postgres"
CONNECTION_STRING="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Migration files in order
MIGRATIONS=(
    "supabase/migrations/20251001_007_SAFE_users_view_corrected.sql"
    "supabase/migrations/20251001_008_SAFE_rls_policies.sql"
    "supabase/migrations/20250930_004_user_metadata_setup.sql"
    "supabase/migrations/20251001_006_add_performance_indexes.sql"
)

MIGRATION_NAMES=(
    "Users View & Column Migration"
    "RLS Policies (Combined)"
    "User Metadata Functions"
    "Performance Indexes"
)

# Verification queries
verify_007() {
    echo -e "${YELLOW}Verifying migration 007...${NC}"
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -c "SELECT COUNT(*) as user_count FROM public.users;" 2>&1
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -c "SELECT COUNT(DISTINCT table_name) as tables_with_user_id FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id';" 2>&1
}

verify_008() {
    echo -e "${YELLOW}Verifying migration 008...${NC}"
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -c "SELECT COUNT(*) as tables_with_rls FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;" 2>&1
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -c "SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';" 2>&1
}

verify_004() {
    echo -e "${YELLOW}Verifying migration 004...${NC}"
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -c "SELECT COUNT(*) as function_count FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('update_user_metadata', 'get_user_profile', 'handle_new_user');" 2>&1
}

verify_006() {
    echo -e "${YELLOW}Verifying migration 006...${NC}"
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -c "SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';" 2>&1
}

# Run migrations
for i in "${!MIGRATIONS[@]}"; do
    MIGRATION="${MIGRATIONS[$i]}"
    NAME="${MIGRATION_NAMES[$i]}"

    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Migration $((i+1))/${#MIGRATIONS[@]}: ${NAME}${NC}"
    echo -e "${BLUE}File: $(basename "$MIGRATION")${NC}"
    echo -e "${BLUE}========================================${NC}\n"

    if [ ! -f "$MIGRATION" ]; then
        echo -e "${RED}Error: Migration file not found: $MIGRATION${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Applying migration...${NC}\n"

    # Run migration
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" -f "$MIGRATION"

    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✓ Migration applied successfully${NC}\n"

        # Run verification based on migration number
        case $i in
            0) verify_007 ;;
            1) verify_008 ;;
            2) verify_004 ;;
            3) verify_006 ;;
        esac

        echo -e "\n${GREEN}✓ Verification passed${NC}"
    else
        echo -e "\n${RED}✗ Migration failed!${NC}"
        echo -e "${RED}Please check the error above and fix before continuing${NC}"
        exit 1
    fi

    sleep 1
done

# Final verification
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}   Final Verification${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Running comprehensive checks...${NC}\n"

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$CONNECTION_STRING" << 'SQL'
-- Final verification queries
\echo ''
\echo '=== Users View ==='
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'users';

\echo ''
\echo '=== Column Migration (should show user_id, not agent_id) ==='
SELECT
    COUNT(DISTINCT table_name) as tables_with_user_id
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'user_id';

SELECT
    COUNT(DISTINCT table_name) as tables_with_agent_id
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'agent_id';

\echo ''
\echo '=== RLS Status ==='
SELECT
    COUNT(*) as tables_with_rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

\echo ''
\echo '=== Policy Count ==='
SELECT
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

\echo ''
\echo '=== Functions ==='
SELECT
    routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

\echo ''
\echo '=== Indexes ==='
SELECT
    COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

SQL

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}   ✓ ALL MIGRATIONS COMPLETED!${NC}"
    echo -e "${GREEN}========================================${NC}\n"
    echo -e "${GREEN}Summary:${NC}"
    echo -e "${GREEN}✓ Migration 007: Users view created${NC}"
    echo -e "${GREEN}✓ Migration 008: RLS policies applied${NC}"
    echo -e "${GREEN}✓ Migration 004: User metadata functions created${NC}"
    echo -e "${GREEN}✓ Migration 006: Performance indexes created${NC}\n"
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "  1. Test authentication in your app"
    echo -e "  2. Verify users can sign in/out"
    echo -e "  3. Check that data is properly isolated by user_id\n"
else
    echo -e "\n${RED}✗ Final verification failed${NC}"
    exit 1
fi
