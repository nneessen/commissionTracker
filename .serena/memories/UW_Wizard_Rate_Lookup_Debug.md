# UW Wizard Rate Lookup Debugging Guide

## Problem: "No rate table matches found" 

The deterministic engine (Eligibility + Pricing Engine) has a **4-stage pipeline**:
1. **Stage 1 (Eligibility)**: Age, face amount, knockouts, state checks
2. **Stage 2 (Approval)**: Condition acceptance rules, health class assignment  
3. **Stage 3 (Premium)**: Query `premium_matrix` table
4. **Stage 4 (Ranking)**: Score and select top products

## Health Class Fallback Implementation (Completed)

### New Types Added to `premiumMatrixService.ts`

- `RateableHealthClass`: `preferred_plus | preferred | standard_plus | standard | table_rated`
- `NonRateableHealthClass`: `decline | refer`
- `HEALTH_CLASS_FALLBACK_ORDER`: Array from best to worst
- `PremiumLookupResult`: Discriminated union with success/failure cases

### Normalization Function `normalizeHealthClass()`

Maps raw health classes to rateable classes:
- `substandard` → `table_rated`
- `unknown` → `standard`
- `decline`, `refer` → `null` (non-rateable, requires manual underwriting)

### Fallback Logic in `interpolatePremium()`

1. Normalize input health class
2. If null (decline/refer), return `{ premium: null, reason: "NON_RATEABLE_CLASS" }`
3. Try each class in fallback order starting from normalized class
4. Return first match with metadata: `{ premium, requested, used, wasExact }`

### Updated Types in `decisionEngine.ts`

`Recommendation` and `EvaluatedProduct` interfaces now include:
- `healthClassRequested?: RateableHealthClass`
- `healthClassUsed?: RateableHealthClass`
- `wasFallback?: boolean`

## Debug Logging

In browser console, you'll see:
- `[normalizeHealthClass]` - Unknown class warnings
- `[InterpolatePremium]` - Fallback used: `preferred_plus → standard`
- `[InterpolatePremium]` - No rates found after fallback (with debug info)
- `[DecisionEngine Stage 3]` - Premium found with fallback info

## Required `premium_matrix` Dimensions

For each product, need rows covering:
- Both genders: `male`, `female`
- Both tobacco: `tobacco`, `non_tobacco`  
- At least one rateable health class (fallback will handle mismatches)
- Age grid: e.g., 25, 30, 35, 40... up to 85
- Face amount grid: e.g., 50000, 100000, 150000, 250000...
- `term_years`: NULL for permanent, specific year for term

## Files Modified

### Premium Matrix Service
- `src/services/underwriting/premiumMatrixService.ts:26-94` - New types, constants, functions
- `src/services/underwriting/premiumMatrixService.ts:686-870` - Refactored interpolatePremium with fallback

### Decision Engine
- `src/services/underwriting/decisionEngine.ts:117-121` - Updated Recommendation interface
- `src/services/underwriting/decisionEngine.ts:519-578` - Updated getPremium()
- `src/services/underwriting/decisionEngine.ts:756-765` - Updated EvaluatedProduct interface
- `src/services/underwriting/decisionEngine.ts:835-865` - Premium result extraction with fallback

### Other Callers
- `src/services/underwriting/quotingService.ts:402-433` - Updated to extract premium from result
- `src/features/underwriting/hooks/usePremiumMatrix.ts:328-340` - Updated to extract premium from result
