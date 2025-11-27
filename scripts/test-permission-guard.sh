#!/bin/bash

# Test script for PermissionGuard implementation
# Verifies that the app builds and runs without errors

set -e  # Exit on error

echo "==================================================================="
echo "Testing PermissionGuard Implementation"
echo "==================================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "${YELLOW}Step 1: Running TypeScript build check...${NC}"
npm run build

if [ $? -eq 0 ]; then
  echo "${GREEN}✓ Build passed - No TypeScript errors${NC}"
else
  echo "${RED}✗ Build failed - TypeScript errors detected${NC}"
  exit 1
fi

echo ""
echo "${YELLOW}Step 2: Verifying PermissionGuard component exists...${NC}"
if [ -f "src/components/auth/PermissionGuard.tsx" ]; then
  echo "${GREEN}✓ PermissionGuard component found${NC}"
else
  echo "${RED}✗ PermissionGuard component missing${NC}"
  exit 1
fi

echo ""
echo "${YELLOW}Step 3: Verifying PermissionDenied component exists...${NC}"
if [ -f "src/features/auth/PermissionDenied.tsx" ]; then
  echo "${GREEN}✓ PermissionDenied component found${NC}"
else
  echo "${RED}✗ PermissionDenied component missing${NC}"
  exit 1
fi

echo ""
echo "${YELLOW}Step 4: Verifying orphaned routes deleted...${NC}"
if [ ! -d "src/routes" ]; then
  echo "${GREEN}✓ src/routes/ directory successfully removed${NC}"
else
  echo "${RED}✗ src/routes/ directory still exists (dead code not removed)${NC}"
  exit 1
fi

echo ""
echo "${YELLOW}Step 5: Verifying route registration in router.tsx...${NC}"
if grep -q "adminRolesRoute" src/router.tsx; then
  echo "${GREEN}✓ adminRolesRoute found in router.tsx${NC}"
else
  echo "${RED}✗ adminRolesRoute not found in router.tsx${NC}"
  exit 1
fi

echo ""
echo "==================================================================="
echo "${GREEN}✓ All tests passed!${NC}"
echo "==================================================================="
echo ""
echo "Manual testing checklist:"
echo "  [ ] Admin (nick@nickneessen.com) CAN access /admin/roles"
echo "  [ ] Admin CAN see 'Role Management' in sidebar"
echo "  [ ] Non-admin user CANNOT see 'Role Management' in sidebar"
echo "  [ ] Non-admin user navigating to /admin/roles sees PermissionDenied"
echo "  [ ] Loading states display correctly"
echo "  [ ] No console errors"
echo ""
echo "Run 'npm run dev' to test manually"
echo ""
