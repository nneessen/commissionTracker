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

### Phase 3: Parallel Product Loop ✅ RE-IMPLEMENTED
**Status:** Successfully implemented on 2026-01-16
**File:** `src/services/underwriting/decisionEngine.ts`
**Changes:**
1. Added `p-limit` dependency for concurrency control
2. Created `evaluateSingleProduct()` function extracting the product evaluation logic
3. Added `ProductEvaluationContext` and `ProductEvaluationResult` interfaces
4. Replaced sequential for-loop with parallel evaluation using p-limit (10 concurrent products)
5. Each product evaluation is self-contained with proper term determination
**Key Fix:** Term determination now happens AFTER matrix fetch within each isolated evaluation, preventing the race condition that caused the original bugs.
**Concurrency Limit:** `PARALLEL_PRODUCT_LIMIT = 10` concurrent evaluations

### Phase 3.1: Batch Premium Matrix Fetch ⚠️ BUG
**Status:** Implemented but has bug - only returns one carrier's products
**File:** `src/services/underwriting/decisionEngine.ts`
**Changes:**
1. Added `batchFetchPremiumMatrices()` function (lines 802-847)
2. Added `premiumMatrixMap` to `ProductEvaluationContext`
3. Parallel fetch of criteria + matrices in `getRecommendations()`
4. `evaluateSingleProduct()` uses prefetched matrix from Map

**BUG:** Only Mutual of Omaha products returning. Likely cause: Supabase 1000 row default limit on batch query truncating results. Need to add `.limit(50000)` or implement pagination.

**See:** `plans/active/CONTINUATION_uw_wizard_perf_phase3.md` for fix instructions.

## Expected Performance Improvement
- **Before Phase 3:** ~4-5 seconds for 50 products
- **After Phase 3:** ~1.5-2 seconds for 50 products (estimated 50-70% improvement)
- **Total improvement from original:** ~80% (from 10s to ~1.5-2s)

## Files Modified
1. `scripts/benchmark-decision-engine.ts` - Fixed TypeScript errors, added benchmark tests
2. `src/services/underwriting/decisionEngine.ts` - Added PremiumMatrix import, modified getPremium() signature, parallel matrix+criteria fetch
3. `src/services/underwriting/premiumMatrixService.ts` - Removed COUNT query in getPremiumMatrixForProduct()