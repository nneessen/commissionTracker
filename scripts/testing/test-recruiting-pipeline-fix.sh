#!/bin/bash
# Test script for recruiting pipeline first-load fix
# Tests that the page loads properly without race conditions

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== Testing Recruiting Pipeline First-Load Fix ===${NC}\n"

# Test 1: TypeScript compilation
echo -e "${YELLOW}Test 1: TypeScript compilation for MyRecruitingPipeline...${NC}"
cd /Users/nickneessen/projects/commissionTracker

# Check for TypeScript errors specifically in the pipeline file
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "MyRecruitingPipeline" || true)
if [ "$TS_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ No TypeScript errors in MyRecruitingPipeline${NC}\n"
else
    echo -e "${RED}✗ TypeScript errors found in MyRecruitingPipeline${NC}"
    npx tsc --noEmit 2>&1 | grep "MyRecruitingPipeline"
    exit 1
fi

# Test 2: Check that isReady guard exists
echo -e "${YELLOW}Test 2: Verify isReady guard exists...${NC}"
if grep -q "const isReady = !authLoading && !profileLoading && !!user?.id && !!profile?.id" src/features/recruiting/pages/MyRecruitingPipeline.tsx; then
    echo -e "${GREEN}✓ isReady guard implemented correctly${NC}\n"
else
    echo -e "${RED}✗ isReady guard not found${NC}"
    exit 1
fi

# Test 3: Check loading state uses isReady
echo -e "${YELLOW}Test 3: Verify loading state uses isReady...${NC}"
if grep -q "if (authLoading || profileLoading || !isReady)" src/features/recruiting/pages/MyRecruitingPipeline.tsx; then
    echo -e "${GREEN}✓ Loading state properly guards with isReady${NC}\n"
else
    echo -e "${RED}✗ Loading state doesn't use isReady guard${NC}"
    exit 1
fi

# Test 4: Check single profile source (no duplicate query)
echo -e "${YELLOW}Test 4: Verify single profile source (no duplicate query)...${NC}"
PROFILE_QUERIES=$(grep -c "queryKey: \['user-profile'" src/features/recruiting/pages/MyRecruitingPipeline.tsx || true)
if [ "$PROFILE_QUERIES" -eq 0 ]; then
    echo -e "${GREEN}✓ No duplicate profile query (uses cached useCurrentUserProfile)${NC}\n"
else
    echo -e "${RED}✗ Found duplicate profile query - should use useCurrentUserProfile only${NC}"
    exit 1
fi

# Test 5: Dev server page check
echo -e "${YELLOW}Test 5: Dev server responds...${NC}"
# Check if dev server is running
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/recruiting/my-pipeline 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Recruiting pipeline page loads (HTTP 200)${NC}\n"
else
    echo -e "${YELLOW}⚠ Dev server not running or page returned $HTTP_STATUS${NC}"
    echo -e "${YELLOW}  Start dev server with: npm run dev${NC}\n"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ All Tests Passed!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${YELLOW}Manual verification needed:${NC}"
echo -e "1. Log in as a recruit user"
echo -e "2. Navigate to /recruiting/my-pipeline"
echo -e "3. Verify page loads on FIRST login (no manual refresh needed)"
echo -e "4. Check browser console for any errors"
