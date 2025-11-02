#!/bin/bash
# scripts/verify-migrations.sh
# Purpose: Verify local migrations match remote database state

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Migration Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if required environment variables are set
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}❌ Missing Supabase configuration${NC}"
  echo "   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  echo ""
  exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠️  Supabase CLI not found${NC}"
  echo "   Install: npm install -g supabase"
  echo ""
  echo "Falling back to manual verification..."
  echo ""
fi

# Count local migration files
LOCAL_MIGRATIONS=$(find supabase/migrations -name "*.sql" -type f | wc -l | tr -d ' ')
echo -e "${GREEN}📁 Local Migrations:${NC} $LOCAL_MIGRATIONS files found"
echo ""

# List migration files
echo "Local migration files:"
find supabase/migrations -name "*.sql" -type f -exec basename {} \; | sort
echo ""

# Check critical functions exist in database
echo "Checking critical database functions..."
echo ""

PGPASSWORD="${PGPASSWORD:-N123j234n345!\$!}" psql "${DATABASE_URL:-postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres}" << 'EOF'
\set ON_ERROR_STOP on

-- Check get_user_commission_profile
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_commission_profile')
    THEN '✅ get_user_commission_profile'
    ELSE '❌ get_user_commission_profile MISSING'
  END as status;

-- Check calculate_earned_amount
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_earned_amount')
    THEN '✅ calculate_earned_amount'
    ELSE '❌ calculate_earned_amount MISSING'
  END as status;

-- Check update_commission_earned_amounts
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_commission_earned_amounts')
    THEN '✅ update_commission_earned_amounts'
    ELSE '❌ update_commission_earned_amounts MISSING'
  END as status;

EOF

EXIT_CODE=$?

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Migration verification complete${NC}"
  echo ""
  echo "All critical database functions are present."
  echo ""
  exit 0
else
  echo -e "${RED}❌ Migration verification failed${NC}"
  echo ""
  echo "Some required database functions are missing."
  echo ""
  echo "To apply missing migrations:"
  echo "  1. Review files in supabase/migrations/"
  echo "  2. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new"
  echo "  3. Copy migration file contents"
  echo "  4. Execute in SQL editor"
  echo ""
  exit 1
fi
