#!/bin/bash

# Commission Tracker Build Test Script
# Purpose: Validate that the app builds without errors after code changes

echo "========================================="
echo "The Standard HQ Build Validation"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}→ Running TypeScript compiler...${NC}"

# Run TypeScript compiler
if npm run build 2>&1 | tee build.log | grep -q "error TS"; then
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    echo ""
    echo "Errors found:"
    grep "error TS" build.log | head -20
    echo ""
    echo "Full log saved to build.log"
    exit 1
else
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
fi

echo ""
echo -e "${YELLOW}→ Running development server test...${NC}"

# Test if dev server starts (run for 10 seconds then kill)
timeout 10 npm run dev > dev.log 2>&1 &
DEV_PID=$!

# Wait a bit for server to start
sleep 5

# Check if process is still running
if ps -p $DEV_PID > /dev/null; then
    echo -e "${GREEN}✓ Development server started successfully${NC}"
    kill $DEV_PID 2>/dev/null
else
    echo -e "${RED}✗ Development server failed to start${NC}"
    echo "Check dev.log for details"
    exit 1
fi

# Clean up log files
rm -f build.log dev.log

echo ""
echo "========================================="
echo -e "${GREEN}✓ All build tests passed!${NC}"
echo "The application is ready to run."
echo ""
echo "To access the app:"
echo "1. Run: npm run dev"
echo "2. Clear browser cache and cookies"
echo "3. Navigate to http://localhost:5173"
echo "4. Sign in with nick@nickneessen.com"
echo ""
echo "If you still see the pending approval screen:"
echo "1. Navigate to http://localhost:5173/admin/auth-diagnostic"
echo "2. Click 'Clear Storage & Reload'"
echo "3. Sign out and sign back in"
echo "========================================="
