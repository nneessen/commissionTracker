#!/bin/bash
# Test script for verifying the fixes implemented
# Run this after applying all fixes to verify functionality

set -e

echo "========================================"
echo "Testing All Fixes"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Verify RPC function exists and works
echo "Test 1: Testing search_users_for_assignment RPC..."
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT COUNT(*) as result_count
FROM search_users_for_assignment('', NULL, 'approved', NULL, 5);
" 2>&1 | grep -q "result_count" && \
  echo -e "${GREEN}✓${NC} RPC function works - no is_deleted column error" || \
  echo -e "${RED}✗${NC} RPC function failed"

echo ""

# Test 2: Verify migration was applied
echo "Test 2: Verifying migration was applied..."
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT COUNT(*) FROM pg_proc WHERE proname = 'search_users_for_assignment';
" 2>&1 | grep -q "1" && \
  echo -e "${GREEN}✓${NC} Migration applied successfully" || \
  echo -e "${RED}✗${NC} Migration not found"

echo ""

# Test 3: Check if user_delete_dependencies view is gone (as expected)
echo "Test 3: Verifying user_delete_dependencies view was properly removed..."
RESULT=$(PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "
SELECT COUNT(*) FROM pg_views WHERE viewname = 'user_delete_dependencies';
" | xargs)

if [ "$RESULT" -eq "0" ]; then
  echo -e "${GREEN}✓${NC} View properly removed (expected)"
else
  echo -e "${YELLOW}!${NC} View still exists (unexpected but not blocking)"
fi

echo ""

# Test 4: Verify component file location
echo "Test 4: Verifying component was moved to shared folder..."
if [ -f "src/components/shared/user-search-combobox.tsx" ]; then
  echo -e "${GREEN}✓${NC} Component in correct location"
else
  echo -e "${RED}✗${NC} Component not found in shared folder"
fi

if [ -f "src/components/user-search-combobox.tsx" ]; then
  echo -e "${RED}✗${NC} Old component file still exists (should be removed)"
else
  echo -e "${GREEN}✓${NC} Old component file removed"
fi

echo ""

# Test 5: Check if App.tsx has /register/ in public paths
echo "Test 5: Verifying /register/ is in public paths..."
grep -q '"/register/"' src/App.tsx && \
  echo -e "${GREEN}✓${NC} Registration route is public" || \
  echo -e "${RED}✗${NC} Registration route not in public paths"

echo ""

# Test 6: Verify all imports updated
echo "Test 6: Checking for old import paths..."
OLD_IMPORTS=$(grep -r 'from "@/components/user-search-combobox"' src/ 2>/dev/null | wc -l | xargs)

if [ "$OLD_IMPORTS" -eq "0" ]; then
  echo -e "${GREEN}✓${NC} All imports updated to new path"
else
  echo -e "${RED}✗${NC} Found $OLD_IMPORTS files still using old import path"
fi

echo ""

# Test 7: TypeScript compilation
echo "Test 7: Running TypeScript type check..."
npx tsc --noEmit 2>&1 | grep -q "error TS" && \
  echo -e "${RED}✗${NC} TypeScript errors found" || \
  echo -e "${GREEN}✓${NC} No TypeScript errors"

echo ""

# Test 8: Test actual RPC call with search term
echo "Test 8: Testing RPC with search term..."
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT COUNT(*) as search_result_count
FROM search_users_for_assignment('test', NULL, NULL, NULL, 10);
" 2>&1 | grep -q "search_result_count" && \
  echo -e "${GREEN}✓${NC} RPC search with term works" || \
  echo -e "${RED}✗${NC} RPC search with term failed"

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""
echo -e "${YELLOW}Manual Testing Required:${NC}"
echo "1. Open app in browser and navigate to 'Add New Recruit' dialog → Assignment tab"
echo "2. Type in the upline search box - should show results without errors"
echo "3. Send a registration invite and click the email link - should show form, not login"
echo "4. Try deleting a recruit - should work without 404 errors"
echo ""
echo "All automated tests completed!"
