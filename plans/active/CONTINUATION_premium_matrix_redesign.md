# Continuation: Premium Matrix Redesign

## Context
Redesigning the Rate Entry page to use a grid-based premium entry system (age × face amount) instead of the old rate-per-thousand approach.

## Completed
1. ✅ Migration `20260110_015_premium_matrix.sql` - Applied successfully
2. ✅ Types regenerated
3. ✅ Service layer `src/services/underwriting/premiumMatrixService.ts`
4. ✅ React Query hooks `src/features/underwriting/hooks/usePremiumMatrix.ts`
5. ✅ Grid component `src/features/underwriting/components/RateEntry/PremiumMatrixGrid.tsx`
6. 🔄 **IN PROGRESS**: Updating `RateEntryTab.tsx` - partially done

## Remaining Tasks

### 1. Finish RateEntryTab.tsx Updates
File: `src/features/underwriting/components/RateEntry/RateEntryTab.tsx`

Need to update:
- Product selector: Change `productHasRates` → `productHasPremiums`
- Component: Change `RateEntryForm` → `PremiumMatrixGrid`
- Quick Stats section: Change `productsWithRates` → `productsWithPremiums`
- Change `getCarrierRateCount` → `getCarrierPremiumCount` in stats section

### 2. Update index.ts export
File: `src/features/underwriting/components/RateEntry/index.ts`
- Add export for `PremiumMatrixGrid`

### 3. Run typecheck and build
```bash
npm run typecheck
npm run build
```

### 4. User mentioned: Delete the decision tree
The user said the decision tree is "100% not how it's supposed to have been designed" and needs to be deleted. This is a separate task to discuss after completing the premium matrix.

## Grid Design Specs
- **Ages (rows)**: 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85
- **Face amounts (columns)**: $25k, $50k, $75k, $100k, $150k, $200k, $250k, $500k, $1M
- **Filters**: Gender, Tobacco Class, Health Class (one class per grid view)
- **Entry**: Manual cell-by-cell, Tab/Arrow navigation
- **Interpolation**: Bilinear interpolation for values between grid points

## Key Files
- `supabase/migrations/20260110_015_premium_matrix.sql`
- `src/services/underwriting/premiumMatrixService.ts`
- `src/features/underwriting/hooks/usePremiumMatrix.ts`
- `src/features/underwriting/components/RateEntry/PremiumMatrixGrid.tsx`
- `src/features/underwriting/components/RateEntry/RateEntryTab.tsx` (in progress)

## Plan File
Full plan at: `/home/nneessen/.claude/plans/parallel-orbiting-piglet.md`
