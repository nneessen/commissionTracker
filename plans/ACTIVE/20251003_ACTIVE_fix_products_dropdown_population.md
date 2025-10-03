# Fix Products Dropdown Dynamic Population

**Date**: 2025-10-03
**Status**: ACTIVE
**Priority**: CRITICAL

## Problem Statement

Products dropdown in PolicyForm does NOT populate when a carrier is selected from the carriers dropdown. This has failed 3+ times despite:
- ✅ Database has 7 carriers and 42 products (verified)
- ✅ Products table has correct carrier_id foreign keys
- ✅ useProducts hook exists and queries correctly
- ✅ PolicyForm calls useProducts(formData.carrierId)
- ❌ Frontend cannot access the data

## Root Cause Analysis

### Hypothesis
Row Level Security (RLS) is blocking SELECT queries from the frontend because:
1. Frontend uses `VITE_SUPABASE_ANON_KEY` (anonymous access)
2. RLS is enabled on `products` and `carriers` tables
3. No RLS policies exist (or are incorrectly configured) to allow anonymous SELECT

### Evidence
- ✅ Test script with SERVICE_ROLE_KEY successfully reads 42 products
- ❌ Test script with ANON_KEY returns 0 products
- ✅ Database has data (confirmed via service role queries)
- ❌ Frontend shows "No products available" message

## Diagnostic Phase (DO FIRST - NO IMPLEMENTATION)

### Step 1: Create Comprehensive Diagnostic Script
**Purpose**: Understand EXACT state of RLS and access patterns

**Script Requirements** (`scripts/diagnose-rls-issue.js`):
1. Check if RLS is enabled on carriers table
2. Check if RLS is enabled on products table
3. List ALL existing RLS policies on both tables
4. Test SELECT with service role key (should work)
5. Test SELECT with anon key (currently fails)
6. Show exact error messages/codes from failed queries
7. Verify frontend .env has correct keys
8. Test the EXACT query that useProducts makes

**Expected Output**:
```
RLS Status:
  carriers: ENABLED/DISABLED
  products: ENABLED/DISABLED

Existing Policies:
  carriers: [list all policies]
  products: [list all policies]

Access Tests:
  Service Role: ✅ 42 products, 7 carriers
  Anon Key: ❌ 0 products (ERROR: <exact error>)

Frontend Query Simulation:
  Query: SELECT * FROM products WHERE carrier_id = ? AND is_active = true
  With Anon Key: ❌ <exact error>
```

### Step 2: Verify Frontend Configuration
**Check these files**:
1. `.env` - Verify VITE_SUPABASE_ANON_KEY is set correctly
2. `src/services/base/supabase.ts` - Verify it's using anon key
3. `src/hooks/products/useProducts.ts` - Verify query structure
4. Browser Network tab - Check actual request headers

## Solution Approaches (RANKED BY LIKELIHOOD)

### Approach A: Apply RLS Policies via Supabase Dashboard (MOST LIKELY FIX)
**Why**: RLS is enabled but no policies exist to allow SELECT

**Manual Steps**:
1. Go to Supabase Dashboard → SQL Editor
2. Run this EXACT SQL:
```sql
-- Check current RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('carriers', 'products');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('carriers', 'products');

-- Apply fix (if no policies exist)
ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Verify fix
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('carriers', 'products');
```

**Verification**:
- Run diagnostic script again
- Anon key should now return data
- Frontend products dropdown should populate

**Rollback**: If this breaks something, re-enable with:
```sql
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### Approach B: Use Service Role Key for Product Queries (IF A FAILS)
**Why**: Bypass RLS entirely for administrative reads

**Implementation**:
1. Create new service: `src/services/products/productService.ts`
2. Use service role key specifically for product queries
3. Keep as server-side only (don't expose service key to browser)
4. Update useProducts to call this service

**CAUTION**: Service role key should NEVER be in frontend code. Needs backend endpoint.

### Approach C: Create Proper RLS Policies (IF WANT SECURITY)
**Why**: Allow anonymous read access while maintaining security

**SQL to apply**:
```sql
-- Enable RLS
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (public SELECT access)
CREATE POLICY "allow_anonymous_select_carriers"
ON carriers FOR SELECT
TO anon
USING (true);

CREATE POLICY "allow_anonymous_select_products"
ON products FOR SELECT
TO anon
USING (is_active = true);

-- Verify policies are created
SELECT policyname, tablename, roles, cmd
FROM pg_policies
WHERE tablename IN ('carriers', 'products');
```

**Verification**: Diagnostic script should show anon key can now read data

## Implementation Plan (AFTER DIAGNOSIS)

### Phase 1: Diagnosis (5 minutes)
- [ ] Create `scripts/diagnose-rls-issue.js`
- [ ] Run diagnostic script
- [ ] Document EXACT error messages
- [ ] Identify which approach to use

### Phase 2: Apply Fix (10 minutes)
**IF Approach A** (RLS Disabled):
- [ ] User applies SQL in Supabase Dashboard
- [ ] Run diagnostic script to verify
- [ ] Test in browser

**IF Approach C** (RLS Policies):
- [ ] User applies policy SQL in Supabase Dashboard
- [ ] Run diagnostic script to verify
- [ ] Test in browser

### Phase 3: Frontend Testing (5 minutes)
- [ ] Open browser to http://localhost:3002
- [ ] Open Policy Form modal
- [ ] Open browser DevTools Network tab
- [ ] Select a carrier from dropdown
- [ ] Verify Network request to Supabase
- [ ] Verify products array in response
- [ ] Verify products dropdown populates

### Phase 4: Integration Test (5 minutes)
- [ ] Select carrier: "United Home Life"
- [ ] Verify products dropdown shows: "Term", "Express Issue Premier WL", etc.
- [ ] Select product: "Term"
- [ ] Verify commission auto-fills: 102.5%
- [ ] Fill in remaining fields
- [ ] Submit form
- [ ] Verify success toast
- [ ] Verify policy appears in dashboard

## Testing Checklist

### Before Fix
- [ ] Diagnostic script shows RLS blocks anon key
- [ ] Frontend shows "No products available"
- [ ] Browser Network tab shows empty array or error

### After Fix
- [ ] Diagnostic script shows anon key CAN read products
- [ ] Frontend products dropdown populates with products
- [ ] Browser Network tab shows products array with data
- [ ] Can create policy successfully

## Key Insights

1. **Data exists in database** (proven by service role queries)
2. **Frontend code is correct** (useProducts hook structure is fine)
3. **Database schema is correct** (carrier_id foreign keys work)
4. **RLS is the blocker** (anon key cannot SELECT)

## Decision Points

**Q**: Should we disable RLS or create policies?
**A**: For MVP with single user, DISABLE RLS (Approach A). Add policies later if needed.

**Q**: Can we test this without user intervention?
**A**: No - Supabase Management API doesn't allow SQL execution. User MUST apply SQL manually.

**Q**: Why did previous attempts fail?
**A**: Scripts couldn't execute SQL via API. Migration files weren't applied. We never actually fixed RLS.

## Success Criteria

✅ Diagnostic script confirms anon key can read products
✅ Browser Network tab shows products data in response
✅ Products dropdown in UI populates with real product names
✅ Selecting a product auto-fills commission percentage
✅ Can create a complete policy end-to-end

## Notes

- This is a DEPLOYMENT issue, not a CODE issue
- The fix is a one-time manual SQL execution in Supabase Dashboard
- Once RLS is fixed, everything else should work immediately
- No frontend code changes needed after RLS fix
