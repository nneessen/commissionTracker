#!/bin/bash
# Test script for verifying policy creation after SECURITY DEFINER fix
# This script runs the application in development mode to ensure it loads without errors

set -e  # Exit on any error

echo ""
echo "=========================================="
echo "🧪 Policy Creation Fix - Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo "✅ Step 1: Verifying database migration status..."
echo ""

# Verify the function has SECURITY DEFINER
echo "Checking auto_create_commission_record function security setting..."
SECURITY_SETTING=$(PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT CASE WHEN prosecdef THEN 'definer' ELSE 'invoker' END FROM pg_proc WHERE proname = 'auto_create_commission_record' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')")

if echo "$SECURITY_SETTING" | grep -q "definer"; then
    echo -e "${GREEN}✓ Function has SECURITY DEFINER enabled${NC}"
else
    echo -e "${RED}✗ Function still has SECURITY INVOKER - migration failed!${NC}"
    exit 1
fi

echo ""
echo "✅ Step 2: Checking trigger status..."
echo ""

# Verify trigger exists
TRIGGER_EXISTS=$(PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'trigger_auto_create_commission' AND event_object_table = 'policies'")

if [ "$TRIGGER_EXISTS" -ge 1 ]; then
    echo -e "${GREEN}✓ Trigger exists on policies table${NC}"
else
    echo -e "${RED}✗ Trigger not found!${NC}"
    exit 1
fi

echo ""
echo "✅ Step 3: Building the application..."
echo ""

# Build the application to check for any compile errors
if npm run build; then
    echo -e "${GREEN}✓ Application built successfully${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ All automated checks passed!${NC}"
echo "=========================================="
echo ""
echo "📋 Manual Testing Required:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Navigate to the Dashboard page"
echo "3. Click 'New Policy' in the quick actions section"
echo "4. Fill out the form with test data:"
echo "   - Client Name: Test Client"
echo "   - State: Any state"
echo "   - Age: 35"
echo "   - Carrier: Select any carrier"
echo "   - Product: Select any product"
echo "   - Policy Number: TEST-$(date +%s)"
echo "   - Effective Date: Today"
echo "   - Premium: 250"
echo "   - Payment Frequency: Monthly"
echo ""
echo "5. Click 'Add Policy'"
echo ""
echo "6. Expected result:"
echo "   ✓ Policy created successfully (no permission denied error)"
echo "   ✓ Success toast message appears"
echo "   ✓ Commission record auto-created in database"
echo ""
echo "7. Verify in database:"
echo "   Run: npm run db:check-commissions"
echo "   (or check Supabase dashboard > commissions table)"
echo ""
echo "8. Repeat test from Policies page"
echo ""
echo "=========================================="
echo ""
