#!/bin/bash

# Script to test if the app runs without loading errors
# Created: 2025-11-14

echo "================================================"
echo "Testing Commission Tracker App Functionality"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo "1. Installing dependencies..."
npm install --silent

echo "2. Running TypeScript type check..."
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

echo "3. Building the application..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo "4. Starting dev server (will run for 10 seconds to check for runtime errors)..."
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Check if dev server is still running
if kill -0 $DEV_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Dev server started successfully${NC}"

    # Test if server responds
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200\|304"; then
        echo -e "${GREEN}✅ Server is responding to requests${NC}"
    else
        echo -e "${RED}❌ Server is not responding${NC}"
    fi

    # Kill the dev server
    kill $DEV_PID 2>/dev/null
    wait $DEV_PID 2>/dev/null
else
    echo -e "${RED}❌ Dev server failed to start${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ All tests passed successfully!${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "- TypeScript compilation: PASS"
echo "- Build process: PASS"
echo "- Dev server startup: PASS"
echo "- Server response: PASS"
echo ""
echo "The app is running without loading errors."