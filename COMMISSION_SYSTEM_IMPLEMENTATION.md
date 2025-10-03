# Commission Tracking System - Implementation Status

## Overview

Comprehensive refactor of commission tracking system from flawed VARCHAR-based approach to properly normalized database schema with specific products and commission rates.

## ✅ Completed Work

### Phase 1: Database Migrations (100% Complete)

All 8 migrations created and ready to run:

1. **20251102_010_create_products_table.sql**
   - Creates `products` table with FK to carriers
   - Stores specific product names (e.g., "EXPRESS ISSUE PREMIER WL", "TRENDSETTER SUPER TERM")
   - Includes product_type for categorization
   - Full RLS policies and indexes

2. **20251102_011_create_commission_rates_table.sql**
   - Creates `commission_rates` table
   - Links to products (not carriers directly)
   - Contract levels 80-145 in increments of 5
   - Supports effective_date and expiration_date for rate changes
   - Optimized indexes for fast lookups

3. **20251102_012_update_policies_table.sql**
   - Adds `product_id` column (FK to products)
   - Adds `submit_date` column
   - Backfills submit_date from created_at

4. **20251102_013_populate_products.sql**
   - Populates all carriers from PDF
   - Populates all products with correct carrier associations
   - 40+ products across 11 carriers

5. **20251102_014_populate_commission_rates.sql**
   - Populates commission rates for all products
   - All 14 contract levels (80-145) for each product
   - Commission percentages from FFG Comp Guide PDF
   - ~560 commission rate records

6. **20251102_015_backfill_policies.sql**
   - Backfills product_id in existing policies
   - Adds FK constraint after backfill
   - Handles policies that can't be auto-matched

7. **20251102_016_create_commission_functions.sql**
   - `get_commission_rate(product_id, contract_level, effective_date)`
   - `calculate_policy_commission(policy_id, user_id)`
   - `get_commission_rate_by_names(carrier_name, product_name, contract_level)`

8. **20251102_017_deprecate_comp_guide.sql**
   - Renames old `comp_guide` to `comp_guide_deprecated`
   - Drops old functions that referenced comp_guide
   - Migration summary reporting

### Phase 2: TypeScript Updates (100% Complete)

1. **Updated src/types/product.types.ts**
   - Product interface with `name` (not productName)
   - CommissionRate interface with effectiveDate/expirationDate
   - Removed carrierId from CommissionRate (product already links to carrier)
   - Updated all form interfaces to match new schema

2. **Updated src/types/policy.types.ts**
   - Added `productId?: string` to Policy interface
   - Added `productId` to NewPolicyForm
   - Added `productId` to CreatePolicyData
   - Kept `product` (ProductType) for backward compatibility

3. **Created src/services/products/ProductRepository.ts**
   - Full CRUD operations for products
   - Commission rate queries
   - `getProductsByCarrier(carrierId)`
   - `getCommissionRate(productId, contractLevel, effectiveDate)`
   - `calculateCommission(productId, contractLevel, annualPremium)`

4. **Created src/hooks/products/useProducts.ts**
   - `useProducts(filters)` - fetch all products
   - `useProductsByCarrier(carrierId)` - fetch products for carrier
   - `useProduct(id)` - fetch single product
   - `useCommissionRate(query)` - fetch commission rate
   - `useCalculateCommission()` - calculate commission amount
   - Full React Query integration with proper cache keys

## 🔄 In Progress / Next Steps

### Phase 3: PolicyForm Integration (Pending)

**PolicyForm.tsx updates needed:**

1. Import `useProductsByCarrier` and `useCommissionRate` hooks
2. Add productId to form state
3. Add product dropdown that:
   - Loads products when carrier is selected
   - Shows specific product names
   - Updates productId on selection
4. Add commission auto-calculation:
   - Fetch user's contract_comp_level
   - Query commission_rate when product + contract level are set
   - Display calculated commission amount
   - Allow manual override if needed
5. Update form submission to include productId

**Example implementation:**

```typescript
// Add to PolicyForm.tsx
import {
  useProductsByCarrier,
  useCommissionRate,
} from "../../hooks/products/useProducts";

// In component:
const { data: products } = useProductsByCarrier(formData.carrierId);
const { data: commissionRate } = useCommissionRate(
  formData.productId && userContractLevel
    ? { productId: formData.productId, contractLevel: userContractLevel }
    : null,
);

// Calculate commission
const calculatedCommission =
  formData.annualPremium && commissionRate
    ? (formData.annualPremium * commissionRate) / 100
    : 0;
```

### Phase 4: Testing & Validation (Pending)

1. **Run Migrations**

   ```bash
   npx supabase db push
   # Or run migrations individually
   ```

2. **Verify Data Integrity**
   - Check all carriers imported
   - Check all products created with correct carrier_id
   - Check all commission_rates populated
   - Verify policies backfilled with product_id

3. **Test Commission Calculation**
   - Create test policy with specific product
   - Verify commission auto-calculates correctly
   - Test different contract levels
   - Test with different carriers/products

4. **Run TypeScript Checks**

   ```bash
   npm run typecheck
   ```

5. **Fix Type Errors**
   - Update any components still using old product schema
   - Fix any ProductType mismatches
   - Ensure productId is handled properly

## Schema Design Summary

### Before (Flawed)

```
comp_guide: carrier_name VARCHAR, product_name VARCHAR, contract_level INT
policies: carrier_id FK, product ENUM (generic types)
```

### After (Normalized)

```
carriers (id, name)
  ↓ 1:N
products (id, carrier_id FK, name, product_type)
  ↓ 1:N
commission_rates (id, product_id FK, contract_level, commission_percentage)

policies (id, carrier_id FK, product_id FK, ...)
```

### Commission Flow

```
Policy.product_id → Product → Carrier
User.contract_comp_level (80-145)
↓
Query: commission_rates WHERE product_id = ? AND contract_level = ?
↓
Calculate: commission_amount = annual_premium × (rate / 100)
```

## Key Benefits

✅ **Proper Normalization** - 3NF, referential integrity with FKs
✅ **Specific Products** - Real product names from PDF, not generic types
✅ **Auto-Calculation** - Commission calculated from product + contract level
✅ **Scalable** - Easy to add new products/carriers
✅ **Type-Safe** - Full TypeScript integration
✅ **Backward Compatible** - Old product ENUM kept for transition
✅ **Performance** - Optimized indexes on product_id, contract_level

## Migration Order (Critical!)

Must run in this exact order:

1. Create products table (010)
2. Create commission_rates table (011)
3. Update policies table - add columns (012)
4. Populate products (013)
5. Populate commission_rates (014)
6. Backfill policies.product_id (015)
7. Create commission functions (016)
8. Deprecate old comp_guide (017)

## Next Developer Actions

1. **Update PolicyForm.tsx** - Add product dropdown and commission display
2. **Run migrations** - Execute all 8 migrations in order
3. **Test typecheck** - Fix any TypeScript errors
4. **Manual testing** - Create policy, verify commission calculation
5. **Update related components** - Any other forms/views using products

## Files Modified/Created

**Database:**

- `supabase/migrations/20251102_010_*.sql` through `20251102_017_*.sql` (8 files)

**TypeScript:**

- `src/types/product.types.ts` (updated)
- `src/types/policy.types.ts` (updated)
- `src/services/products/ProductRepository.ts` (new)
- `src/hooks/products/useProducts.ts` (new)

**Pending:**

- `src/features/policies/PolicyForm.tsx` (needs update)
- Any other components using product data

## Commission Data Sources

All commission rates extracted from:
**FFG Comp Guide (8/25).pdf** - 5 pages

- Page 1: United Home Life (7 products)
- Page 2: SBLI, Baltimore Life, American Home Life, John Hancock, F&G
- Page 3: American-Amicable (11 products)
- Page 4: Corebridge, Transamerica (10 products)
- Page 5: Elco Mutual, Kansas City Life (4 products)

Total: 40+ products, 560+ commission rate records
