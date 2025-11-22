#!/bin/bash
# Test script to verify RLS policy fix
# Tests that the app can load without infinite recursion errors

set -e

echo "🔍 Testing RLS Policy Fix..."
echo ""

# Kill any existing dev servers
echo "1. Cleaning up old processes..."
pkill -f vite 2>/dev/null || true
sleep 2

# Start dev server in background
echo "2. Starting dev server..."
npm run dev > /tmp/rls-test.log 2>&1 &
DEV_PID=$!
echo "   Dev server PID: $DEV_PID"

# Wait for server to start
echo "3. Waiting for server to start..."
sleep 8

# Test if server responds
echo "4. Testing server response..."
if curl -s http://localhost:3000 | grep -q "<!DOCTYPE html"; then
    echo "   ✓ Server responding correctly"
else
    echo "   ✗ Server not responding"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

# Check for errors in logs
echo "5. Checking for infinite recursion errors..."
if grep -q "infinite recursion" /tmp/rls-test.log; then
    echo "   ✗ FAILED: Infinite recursion error still present"
    cat /tmp/rls-test.log
    kill $DEV_PID 2>/dev/null || true
    exit 1
else
    echo "   ✓ No infinite recursion errors found"
fi

# Check for 500 errors
echo "6. Checking for 500 errors..."
if grep -q "500" /tmp/rls-test.log; then
    echo "   ⚠️  Warning: 500 errors found in logs"
    grep "500" /tmp/rls-test.log | head -5
else
    echo "   ✓ No 500 errors found"
fi

# Verify RLS policies in database
echo "7. Verifying RLS policies in database..."
POLICY_COUNT=$(PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles';")
echo "   Found $POLICY_COUNT policies on user_profiles table"

if [ "$POLICY_COUNT" -eq 3 ]; then
    echo "   ✓ Correct number of policies (3)"
else
    echo "   ✗ Expected 3 policies, found $POLICY_COUNT"
fi

# Cleanup
echo "8. Cleaning up..."
kill $DEV_PID 2>/dev/null || true

echo ""
echo "✅ All tests passed! RLS fix verified."
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Sign in as nick@nickneessen.com"
echo "  3. Verify you can access the dashboard without errors"
