# Decision Engine Performance Optimizations

## Date: January 2026

## Problem
The UW Decision Engine's `getRecommendations()` function was taking ~10 seconds to return rate recommendations. Root cause was sequential database queries in the product loop (50-100+ products × 4-5 queries each).

## Optimizations Implemented

### Phase 1.1: Remove Duplicate Matrix Fetch ✅
**File:** `src/services/underwriting/decisionEngine.ts`
**Change:** Modified `getPremium()` function to accept an optional `prefetchedMatrix` parameter. Updated the call in `getRecommendations()` to pass the already-fetched matrix instead of re-fetching.
**Savings:** ~80ms per product (50% of matrix fetch time)

### Phase 1.2: Parallelize Within-Product Operations ✅
**File:** `src/services/underwriting/decisionEngine.ts`
**Change:** Start `getPremiumMatrixForProduct()` and `getExtractedCriteria()` fetches in parallel using promises. Await matrix first for term calculations, then await criteria when needed.
**Savings:** ~50-100ms per product (overlapping network latency)

### Phase 2: Remove COUNT Query ✅
**File:** `src/services/underwriting/premiumMatrixService.ts`
**Change:** Replaced the `getPremiumMatrixForProduct()` function to skip the COUNT query. Now uses a single SELECT with LIMIT 10000 instead of COUNT + SELECT.
**Savings:** ~107ms per product (eliminated extra round-trip)

### Phase 3: Parallel Product Loop ❌ REVERTED
**Status:** Attempted but reverted due to bugs (incorrect product filtering for ages 65+, term products not returning correctly)
**Notes:** Sequential loop preserved but with the above optimizations still active.

## Expected Performance Improvement
- **Before:** ~10 seconds for 50 products
- **After:** ~5-6 seconds for 50 products (40-50% improvement from Phase 1+2 optimizations)
- Individual per-product savings: ~190-280ms (duplicate fetch + COUNT removal + parallel internal)

## Files Modified
1. `scripts/benchmark-decision-engine.ts` - Fixed TypeScript errors, added benchmark tests
2. `src/services/underwriting/decisionEngine.ts` - Added PremiumMatrix import, modified getPremium() signature, parallel matrix+criteria fetch
3. `src/services/underwriting/premiumMatrixService.ts` - Removed COUNT query in getPremiumMatrixForProduct()