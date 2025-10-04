# Fix Commission Calculation Display in Policy Form

**Date**: 2025-10-04
**Status**: ACTIVE
**Priority**: CRITICAL - BLOCKING POLICY CREATION
**Estimated Time**: 30 minutes

---

## 📋 Problem Statement

When creating a new policy in the Policy Form dialog:
- User selects carrier: "American Home Life"
- User selects product: "FE" (Final Expense)
- User enters premium: $100
- **EXPECTED**: Commission Rate shows 100%, Expected Commission shows $100
- **ACTUAL**: Commission Rate shows 0%, Expected Commission shows $0

This completely breaks the policy creation workflow and commission tracking.

---

## 🔍 Root Cause Analysis

### Investigation Results

**Database Schema** (Verified ✅):
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    carrier_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    commission_percentage DECIMAL(5,4),  -- Stores as decimal (1.0 = 100%)
    ...
)
```

**Actual Data State** (Verified ✅):
```javascript
// Query: SELECT * FROM products WHERE name = 'FE'
{
  id: '...',
  carrier_id: '7053d9b0-4afb-5750-a4c4-e74684e19664',
  name: 'FE',
  commission_percentage: null  // ← PROBLEM: Should be 1.00 (100%)
}
```

**Frontend Code** (Verified ✅ - WORKING CORRECTLY):
```typescript
// src/features/policies/PolicyForm.tsx:165-171
else if (name === 'productId') {
  const selectedProduct = products.find(p => p.id === value);
  setFormData(prev => ({
    ...prev,
    productId: value,
    product: selectedProduct?.product_type || 'term_life',
    commissionPercentage: selectedProduct?.commission_percentage
      ? selectedProduct.commission_percentage * 100  // Convert 1.0 → 100%
      : 0,  // ← Returns 0 because commission_percentage is NULL
  }));
}
```

**Calculation Functions** (Verified ✅ - WORKING CORRECTLY):
```typescript
// src/utils/policyCalculations.ts:54-60
export function calculateExpectedCommission(
  annualPremium: number,
  commissionPercentage: number
): number {
  if (annualPremium <= 0 || commissionPercentage <= 0) return 0;  // ← 0% fails this check
  return (annualPremium * commissionPercentage) / 100;
}
```

**Display Code** (Verified ✅ - WORKING CORRECTLY):
```typescript
// src/features/policies/PolicyForm.tsx:466-481
<div className="calculated-values">
  <div className="calc-row">
    <span>Commission Rate:</span>
    <strong>{formData.commissionPercentage.toFixed(2)}%</strong>  // Shows 0%
  </div>
  <div className="calc-row">
    <span>Expected Commission:</span>
    <strong>${expectedCommission.toFixed(2)}</strong>  // Shows $0.00
  </div>
</div>
```

### Conclusion

**The frontend code is 100% correct. The problem is missing data in the database.**

ALL products have `commission_percentage = NULL` when they should have values like `1.00` (100%), `1.10` (110%), etc.

---

## 🎯 Solution Strategy

### What Exists and Works ✅

1. ✅ **Database Schema**: `products.commission_percentage DECIMAL(5,4)` - correct
2. ✅ **Product Fetch Hook**: `useProducts(carrierId)` - fetches products correctly
3. ✅ **Form Logic**: Sets `commissionPercentage` from selected product
4. ✅ **Calculation Functions**: `calculateExpectedCommission()` works correctly
5. ✅ **Display Logic**: Shows commission rate and expected commission
6. ✅ **RLS Policies**: Anonymous users can read products table

### What's Missing ❌

1. ❌ **Product Data**: commission_percentage is NULL for all 42 products
2. ❌ **No Service Duplication Needed**: All services/functions already exist

### The Fix (ONE STEP)

**Create and run a migration to populate products.commission_percentage**

---

## 📐 Implementation Plan

### Phase 1: Create Data Migration ⏱️ 5 minutes

**File**: `supabase/migrations/20251004_fix_products_commission_data.sql`

**Purpose**: Populate commission_percentage for all products

**Approach**: Use UPDATE statements with CASE WHEN to set rates by product name

**Data Source**: FFG Comp Guide (Contract Level 105) from migration 20251003_007

**Key Decisions**:
- Use decimal format: `1.00` = 100%, `1.10` = 110%
- Match products by carrier name + product name (safer than UUIDs)
- Verify data after UPDATE with SELECT

### Phase 2: Apply Migration ⏱️ 5 minutes

**Method**: Run SQL directly in Supabase Dashboard (safest)

**Steps**:
1. Login to Supabase Dashboard
2. Navigate to SQL Editor
3. Paste migration SQL
4. Click "Run"
5. Verify success message

**Alternative**: Use `npx supabase db push` (requires DB password)

### Phase 3: Verification ⏱️ 10 minutes

**Verify Database**:
```javascript
// Test script to verify data
const { data } = await supabase
  .from('products')
  .select('name, commission_percentage')
  .eq('name', 'FE');

console.log(data);
// Expected: { name: 'FE', commission_percentage: 1.00 }
```

**Verify UI**:
1. Open http://localhost:3002
2. Click "New Policy"
3. Select Carrier: "American Home Life"
4. Select Product: "FE"
5. Enter Premium: $100
6. ✅ Commission Rate should show: **100.00%**
7. ✅ Expected Commission should show: **$100.00**

### Phase 4: Integration Test ⏱️ 10 minutes

**Complete Policy Creation Flow**:
1. Fill all required fields
2. Verify commission calculation updates as premium changes
3. Submit policy
4. Verify policy saved with correct commission_percentage
5. Test with different carriers and products

---

## 📁 Files Involved

### Files to CREATE:
1. **supabase/migrations/20251004_fix_products_commission_data.sql** - NEW migration

### Files to REVIEW (No changes needed):
1. **src/features/policies/PolicyForm.tsx** - ✅ Already correct
2. **src/utils/policyCalculations.ts** - ✅ Already correct
3. **src/hooks/products/useProducts.ts** - ✅ Already correct
4. **src/types/product.types.ts** - ✅ Already correct

### Files to TEST:
1. **src/features/policies/PolicyForm.tsx** - Manual UI test
2. **src/utils/policyCalculations.ts** - Unit tests (if they exist)

---

## 🗂️ Current Database Schema (Verified)

```sql
-- products table structure
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    product_type product_type NOT NULL,
    description TEXT,
    min_premium DECIMAL(10,2) DEFAULT 0,
    max_premium DECIMAL(10,2),
    min_age INTEGER DEFAULT 0,
    max_age INTEGER DEFAULT 120,
    commission_percentage DECIMAL(5,4),  -- ← Field exists but values are NULL
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(carrier_id, name)
);

-- Current data state (ALL NULL):
-- American Home Life: FE, Simple Term, Path Setter, Everlast, Exccudex
-- commission_percentage: NULL, NULL, NULL, NULL, NULL
```

---

## 📊 Commission Rate Reference (Contract Level 105)

### American Home Life
- **FE**: 100% (1.00)
- **Simple Term**: 110% (1.10)
- **Path Setter**: 95% (0.95)
- **Everlast**: 90% (0.90)
- **Exccudex**: 95% (0.95)

### United Home Life
- **Term**: 110% (1.10)
- **Express Issue Premier WL**: 100% (1.00)
- **Express Issue Deluxe WL**: 100% (1.00)
- **Express Issue Graded WL**: 100% (1.00)
- **Guaranteed Issue Whole Life**: 50% (0.50)
- **Provider Whole Life**: 85% (0.85)
- **Accidental**: 75% (0.75)

### SBLI
- **SBLI Term**: 110% (1.10)
- **Silver Guard FE**: 85% (0.85)
- **APRIORITY Level Term (75K+)**: 60% (0.60)
- **APRIORITY Whole Life**: 80% (0.80)
- **APRIORITY Protector Term**: 60% (0.60)

(See migration file for complete list of all 42 products)

---

## ✅ Success Criteria

### Database Verification
- [ ] ALL products have non-NULL commission_percentage
- [ ] Values match FFG Comp Guide data
- [ ] American Home Life "FE" product = 1.00 (100%)
- [ ] Query returns correct data via anonymous key

### UI Verification
- [ ] Commission Rate displays correctly (e.g., "100.00%")
- [ ] Expected Commission calculates correctly (e.g., $100 premium → $100 commission at 100%)
- [ ] Calculation updates when premium amount changes
- [ ] Calculation updates when product changes
- [ ] All carriers and products work correctly

### Integration Verification
- [ ] Can create policy with commission calculation
- [ ] Policy saves with correct commission_percentage to database
- [ ] Commission displays correctly in policy list/dashboard
- [ ] No console errors during form interaction

---

## 🚨 Critical Notes

### DO NOT:
- ❌ Create new calculation functions (they already exist and work)
- ❌ Create new service files (useProducts already works)
- ❌ Modify PolicyForm logic (it's correct)
- ❌ Create duplicate types (Product interface is correct)

### DO:
- ✅ Only create the data migration
- ✅ Use existing code/services/functions
- ✅ Test thoroughly after data fix
- ✅ Verify all 42 products are populated

### Why Previous Migrations Failed:
1. Migration 20251003_003_ffg_import.sql had ON CONFLICT that may have cleared data
2. Migration 20251003_007_fix_ffg_products_correct_data.sql deleted and re-inserted but didn't persist
3. Possible that migrations weren't applied in order or were rolled back
4. Need a clean, idempotent UPDATE-based migration

---

## 🔄 Rollback Plan

If the migration causes issues:

```sql
-- Rollback: Set all commission_percentage back to NULL
UPDATE products SET commission_percentage = NULL;
```

This returns to the current (broken) state, so rollback is safe but pointless.

---

## 📝 Next Steps

1. ✅ Create migration file with UPDATE statements
2. ✅ Run migration via Supabase Dashboard
3. ✅ Verify data in database
4. ✅ Test UI functionality
5. ✅ Test complete policy creation flow
6. ✅ Mark plan as COMPLETE

---

**Priority**: FIX THIS FIRST - Blocks all policy creation with proper commission tracking
**Impact**: HIGH - Critical for business functionality
**Risk**: LOW - Only updates data, no schema changes
**Effort**: LOW - Single migration file, no code changes needed
