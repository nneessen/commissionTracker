#!/bin/bash
# Apply only the SAFE corrected migrations (007, 008, 004, 006)

set -e

# URL-encoded password
DB_URL="postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

echo "Applying SAFE migrations only..."
echo ""

# Migration 007
echo "=== Migration 007: Users View & Column Migration ==="
PGPASSWORD="N123j234n345!\$!\$" psql "$DB_URL" -f supabase/migrations/20251001_007_SAFE_users_view_corrected.sql
echo ""

# Migration 008
echo "=== Migration 008: RLS Policies ==="
PGPASSWORD="N123j234n345!\$!\$" psql "$DB_URL" -f supabase/migrations/20251001_008_SAFE_rls_policies.sql
echo ""

# Migration 004 (already safe)
echo "=== Migration 004: User Metadata Functions ==="
PGPASSWORD="N123j234n345!\$!\$" psql "$DB_URL" -f supabase/migrations/20250930_004_user_metadata_setup.sql
echo ""

# Migration 006 (already safe)
echo "=== Migration 006: Performance Indexes ==="
PGPASSWORD="N123j234n345!\$!\$" psql "$DB_URL" -f supabase/migrations/20251001_006_add_performance_indexes.sql
echo ""

echo "=== All migrations complete! ==="
