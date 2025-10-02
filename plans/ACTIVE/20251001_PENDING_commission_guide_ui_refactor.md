# Commission Guide UI Component Refactor

**Status**: Not Started
**Date**: 2025-10-01
**Priority**: Low
**Dependencies**: Supabase Integration Complete

## Context

The Commission Guide UI components (`CommissionGuide.tsx`, `CommissionStats.tsx`, `CommissionTable.tsx`, `CommissionFilters.tsx`) are using an older service-based pattern with pagination and complex query results. The core CRUD hooks have been updated to use TanStack Query best practices, but the UI components haven't been fully migrated yet.

## Current State

### What Works ✅
- Core CRUD hooks (`useCompsList`, `useCreateComp`, `useUpdateComp`, `useDeleteComp`)
- Type definitions (`Comp`, `CreateCompData`, `UpdateCompData`, `CompFilters`)
- Supabase service layer (`compGuideService`)
- All other entities (carriers, policies, commissions, expenses)

### What Needs Work ⚠️

The following TypeScript errors exist in Commission Guide components:

```
src/features/commission-guide/CommissionGuide.tsx(111,17): Type 'CompFilters' has no properties in common with type 'CompGuideFilters'
src/features/commission-guide/CommissionGuide.tsx(119,17): Type 'any[]' is missing properties from 'CompGuideQueryResult'
src/features/commission-guide/CommissionStats.tsx(45,20): Property 'totalRecords' does not exist
src/features/commission-guide/CommissionStats.tsx(53,20): Property 'uniqueCarriers' does not exist
src/features/commission-guide/CommissionStats.tsx(61,20): Property 'productTypes' does not exist
src/features/commission-guide/CommissionStats.tsx(69,23): Property 'averageCommission' does not exist
```

### Test-Only Issues (Lower Priority)
```
src/hooks/policies/__tests__/useCreatePolicy.test.tsx: Property 'client' is missing in type 'NewPolicyForm'
```

## Problems to Solve

1. **Type Mismatch**: Components expect `CompGuideQueryResult` (with pagination metadata) but hooks return `Comp[]`
2. **Service Types vs Hook Types**: `CompGuideFilters` from old service vs `CompFilters` from new types
3. **Stats Calculation**: Components expect pre-calculated stats, but now need to calculate from array data
4. **Pagination**: Old pattern had server-side pagination, new hooks need client-side pagination or service updates

## Proposed Solution

### Option A: Update Components to Match New Hooks (Recommended)

**Pros**:
- Clean separation of concerns
- Components control their own filtering/pagination
- Simpler hook design
- Better for small datasets

**Cons**:
- More work in components
- Client-side pagination only

**Steps**:
1. Update `CommissionFilters.tsx` to use `CompFilters` type
2. Update `CommissionTable.tsx` to:
   - Accept `Comp[]` instead of `CompGuideQueryResult`
   - Implement client-side pagination
   - Handle sorting/filtering locally
3. Update `CommissionStats.tsx` to calculate stats from `Comp[]`:
   ```typescript
   const stats = {
     totalRecords: comps.length,
     uniqueCarriers: new Set(comps.map(c => c.carrier_id)).size,
     productTypes: new Set(comps.map(c => c.product_type)).size,
     averageCommission: comps.reduce((sum, c) => sum + c.commission_percentage, 0) / comps.length
   }
   ```
4. Update `CommissionGuide.tsx` to pass correct types

### Option B: Create Advanced Hooks with Pagination (If Needed)

**Pros**:
- Server-side pagination for large datasets
- Better performance with thousands of records
- Pre-calculated statistics

**Cons**:
- More complex hooks
- May not be needed for small datasets

**Steps**:
1. Create `useCompsWithPagination.ts`:
   ```typescript
   export const useCompsWithPagination = (
     filters: CompFilters,
     pagination: PaginationOptions
   ) => {
     return useQuery({
       queryKey: ['comps', 'paginated', filters, pagination],
       queryFn: async () => {
         // Call service with pagination params
         const result = await compGuideService.getCompGuideData(filters, pagination);
         return result; // Returns { data, total, page, pageSize, totalPages }
       }
     });
   };
   ```
2. Create `useCompsStats.ts` for pre-calculated statistics
3. Update components to use these advanced hooks

## Recommendation

**Start with Option A** because:
- Compensation guides are typically small datasets (< 1000 records)
- Simpler to maintain
- Follows modern React patterns
- Can always add server-side pagination later if needed

## Acceptance Criteria

- [ ] TypeScript compiles with 0 errors
- [ ] All Commission Guide components work with new hook types
- [ ] Filtering works correctly
- [ ] Pagination works (client-side or server-side)
- [ ] Statistics display correctly
- [ ] No performance regressions
- [ ] Tests pass (if applicable)

## Estimated Effort

- **Option A**: 1-2 hours
- **Option B**: 3-4 hours

## Notes

- This is a UI-only refactor, no database changes needed
- Can be done incrementally (one component at a time)
- Not blocking any other features
- Consider adding tests for the Commission Guide components while refactoring
