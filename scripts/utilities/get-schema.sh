#!/bin/bash
# Get complete database schema from Supabase

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Fetching Supabase Database Schema...${NC}\n"

# Check if SUPABASE_DB_PASSWORD is set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}Error: SUPABASE_DB_PASSWORD environment variable not set${NC}"
    echo "Please set it with: export SUPABASE_DB_PASSWORD='your-password'"
    exit 1
fi

# Connection details
DB_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_NAME="postgres"

# Output file
OUTPUT_FILE="scripts/current-schema.sql"

echo -e "${YELLOW}Connecting to: ${DB_HOST}:${DB_PORT}${NC}\n"

# Get schema using psql
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  > "$OUTPUT_FILE" 2>&1 << 'SQL'

-- ====================================
-- COMPLETE DATABASE SCHEMA DUMP
-- Generated: NOW()
-- ====================================

\echo '=== PUBLIC SCHEMA TABLES ==='
SELECT 
    tablename, 
    schemaname,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '=== PUBLIC SCHEMA VIEWS ==='
SELECT 
    viewname,
    schemaname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

\echo ''
\echo '=== DETAILED TABLE STRUCTURE ==='
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

\echo ''
\echo '=== FOREIGN KEY CONSTRAINTS ==='
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '=== INDEXES ==='
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '=== RLS POLICIES ==='
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '=== FUNCTIONS IN PUBLIC SCHEMA ==='
SELECT 
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

\echo ''
\echo '=== AUTH.USERS STRUCTURE ==='
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
    AND table_name = 'users'
ORDER BY ordinal_position;

SQL

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Schema saved to: ${OUTPUT_FILE}${NC}"
    echo -e "${GREEN}✓ Lines: $(wc -l < "$OUTPUT_FILE")${NC}\n"
    
    # Show summary
    echo -e "${YELLOW}Summary:${NC}"
    grep -E "^=== " "$OUTPUT_FILE" | sed 's/===//g'
else
    echo -e "\n${RED}✗ Failed to fetch schema${NC}"
    echo -e "${RED}Check the error in: ${OUTPUT_FILE}${NC}\n"
    exit 1
fi
