# Quick Quote Continuation - Supabase Row Limit Issue

## Current State

We redesigned the Quick Quote feature to be "blazingly fast" using a pre-fetch + in-memory calculation strategy. The implementation is complete but has a critical bug.

### Architecture Implemented
1. **Single batch fetch on mount** - `getAllPremiumMatricesForIMO()` fetches ALL premium matrices
2. **Long cache** - 10 min stale, 30 min GC via React Query
3. **Instant calculations** - `useMemo` recalculates quotes when inputs change (no DB calls)
4. **Pure calculation engine** - `quickQuoteCalculator.ts` with no async operations

### Files Created/Modified
- `src/services/underwriting/premiumMatrixService.ts` - Added `getAllPremiumMatricesForIMO()`
- `src/services/underwriting/quickQuoteCalculator.ts` - NEW pure calculation functions
- `src/features/underwriting/hooks/useQuickQuote.ts` - Added `useAllPremiumMatrices()` hook
- `src/features/underwriting/components/QuickQuote/QuickQuotePage.tsx` - Rewritten with new architecture
- `src/features/underwriting/components/QuickQuote/QuoteComparisonGrid.tsx` - NEW 3-column grid
- `src/features/underwriting/components/QuickQuote/ThreeAmountInputs.tsx` - NEW amount inputs

---

## THE PROBLEM

**Supabase has a hard limit of 1000 rows per request.** The `.range(0, 9999)` I added does NOT work - Supabase still caps at 1000.

### Data Volume
There are **4,364 premium matrix entries** for the IMO:
- American Amicable - Term Made Simple: 788 entries
- Foresters - Strong Foundation: 920 entries
- Foresters - Your Term: 940 entries
- Kansas City Life - Signature Term: 680 entries
- Mutual of Omaha - Term Life Express: 748 entries
- United Home Life - Simple Term: 288 entries

Only the last 2 products (sorted by product_id) are showing because they fit in the 1000 row limit.

---

## TASK: Diagnose, Research & Solve

### 1. Research Supabase Row Limits
- Confirm the 1000 row hard limit
- Research official workarounds:
  - Pagination with multiple requests
  - RPC functions (stored procedures)
  - Changing project settings
  - Using `.limit()` vs `.range()`

### 2. Evaluate Solutions for Performance

The goal is **blazingly fast** Quick Quote. Evaluate these approaches:

**Option A: Pagination (fetch all in parallel)**
```typescript
// Fetch in chunks of 1000, combine results
const chunks = await Promise.all([
  supabase.from("premium_matrix").select(...).range(0, 999),
  supabase.from("premium_matrix").select(...).range(1000, 1999),
  // etc.
]);
```
- Pros: Gets all data, parallel is fast
- Cons: Need to know total count first, multiple network calls

**Option B: Fetch by product (on-demand)**
```typescript
// Only fetch matrices for selected product types
const matrices = await fetchMatricesForProducts(selectedProductIds);
```
- Pros: Smaller payloads, under 1000 per product
- Cons: Refetch when product selection changes, loses "instant" feel

**Option C: Supabase RPC function**
```sql
CREATE FUNCTION get_all_premium_matrices(p_imo_id UUID)
RETURNS SETOF premium_matrix AS $$
  SELECT * FROM premium_matrix WHERE imo_id = p_imo_id;
$$ LANGUAGE SQL;
```
- Pros: No row limit for functions, single call
- Cons: Need migration, may have other limits

**Option D: Pre-aggregate rates into a smaller table**
- Create a summary table with just the rates needed for quoting
- Pros: Smaller data, faster queries
- Cons: Data duplication, sync complexity

### 3. Implement the Best Solution

Requirements:
- Must fetch ALL rate data (currently ~4,364 rows, could grow to 10,000+)
- Must be fast (< 500ms initial load)
- Must enable instant recalculation (no network on input change)
- Must work with existing `quickQuoteCalculator.ts` pure functions

### 4. Test the Fix

Verify that Quick Quote shows ALL 6 term products for:
- 35 year old male, non-tobacco, standard health class
- Term life selected
- 20 year term
- Face amounts: $50k, $100k, $250k

---

## Key Code Locations

### Current broken fetch function
`src/services/underwriting/premiumMatrixService.ts:270-307`
```typescript
export async function getAllPremiumMatricesForIMO(imoId: string) {
  const { data, error } = await supabase
    .from("premium_matrix")
    .select(`...`)
    .eq("imo_id", imoId)
    .eq("products.is_active", true)
    .range(0, 9999);  // THIS DOESN'T WORK - still capped at 1000
  ...
}
```

### React Query hook that calls it
`src/features/underwriting/hooks/useQuickQuote.ts:270-293`

### Pure calculation functions (these are fine)
`src/services/underwriting/quickQuoteCalculator.ts`

---

## Database Info

```sql
-- Check total rows
SELECT COUNT(*) FROM premium_matrix WHERE imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
-- Result: 4364

-- Check by product
SELECT p.name, COUNT(*)
FROM premium_matrix pm
JOIN products p ON pm.product_id = p.id
WHERE pm.imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
GROUP BY p.name;
```

Connection string: `postgresql://postgres.pcyaqwodnyrpkaiojnpz@aws-1-us-east-2.pooler.supabase.com:6543/postgres`
Password: `N123j234n345!$!$`

---

## Expected Outcome

After fixing this issue:
1. Quick Quote loads ALL premium matrix data (4,364+ rows)
2. All 6 term products display when Term Life is selected
3. Initial load is fast (< 500ms acceptable, < 1s maximum)
4. Input changes recalculate instantly (no network calls)
5. Solution scales to 10,000+ rows as more products are added
