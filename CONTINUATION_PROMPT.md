# Hooks Refactoring - Continuation Tasks

## Context
We've been refactoring the hooks architecture to follow a consistent TanStack Query pattern. The base work is done but there are remaining issues where components are still using old hook patterns.

## What's Been Completed
1. ✅ Deleted all bloated `useState/useEffect` hooks (useCommissions, usePolicies, useExpenses with 150+ lines)
2. ✅ Renamed `useXList` hooks to `useX` (e.g., `useCommissionsList` → `useCommissions`)
3. ✅ Created `src/hooks/base/useTableData.ts` - generic composable hook for filter/sort/pagination
4. ✅ Converted all main hooks to TanStack Query pattern
5. ✅ Fixed most import errors
6. ✅ Deleted `useLegacyCarriers` wrapper
7. ✅ Fixed `useMetrics.ts` to use TanStack Query results properly

## Current Architecture
```
src/hooks/
├── base/                    # Generic reusable utilities
│   ├── useFilter.ts        # Generic filtering
│   ├── useSort.ts          # Generic sorting
│   ├── usePagination.ts    # Generic pagination
│   └── useTableData.ts     # Composable: combines all three above
├── commissions/            # ALL use TanStack Query
│   ├── useCommissions.ts   # Returns: { data, isLoading, error, refetch }
│   ├── useCommission.ts
│   ├── useCommissionMetrics.ts
│   └── mutations...
├── policies/, expenses/, carriers/, products/, comps/  # Same pattern
```

## Standard Hook Pattern (TanStack Query)
```typescript
// ✅ CORRECT - Data fetching hook
export const useCommissions = (options?: UseCommissionsOptions) => {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => await commissionService.getAll(),
    staleTime: 5 * 60 * 1000,
    // ... TanStack Query options
  });
};

// ✅ CORRECT - Component usage
const { data: commissions = [], isLoading, error, refetch } = useCommissions();
const getCarrierById = (id: string) => carriers.find(c => c.id === id);

// ❌ WRONG - Old pattern (DO NOT USE)
const { commissions, getCarrierById, refresh } = useCommissions();
```

## Remaining Issues to Fix

### 1. Check `usePolicyCount` in PolicyListInfinite
- File: `src/features/policies/PolicyListInfinite.tsx`
- Line 79: `const { count } = usePolicyCount(filters);`
- Verify it returns TanStack Query result, not `{ count }`

### 2. Verify ALL components use correct pattern
Search for these patterns and fix:
```bash
# Find destructuring that's NOT using 'data'
grep -r "const.*{.*}.*=.*use(Commissions|Policies|Expenses|Carriers)" src/features --include="*.tsx" | grep -v "data:"
```

### 3. Common mistakes to find and fix:
- `const { carriers } = useCarriers()` → `const { data: carriers = [] } = useCarriers()`
- `const { metrics } = useMetrics()` → `const { data: metrics } = useMetrics()`
- `const { refresh } = useX()` → `const { refetch } = useX()`
- `const { getCarrierById } = useCarriers()` → create helper function from data array

### 4. Files that definitely need review:
- `src/features/policies/PolicyListInfinite.tsx` - check usePolicyCount
- `src/hooks/policies/useInfinitePolicies.ts` - might have custom pattern
- Any file using `useConstants` - verify it returns TanStack Query result

## How to Test

1. **Run dev server and check for errors:**
```bash
npm run dev
# Visit every page in the app
# - Dashboard
# - Policies list
# - Commissions list
# - Expenses
# Check browser console for errors
```

2. **Run typecheck:**
```bash
npm run typecheck
# Should have NO import errors
# Other type errors are pre-existing and OK for now
```

3. **Test data flow:**
- Create/update/delete data in each section
- Verify lists refresh properly
- Check that filter/sort/pagination works

## Testing Checklist
- [ ] Dashboard loads without errors
- [ ] Policies page loads and displays data
- [ ] Commissions page loads and displays data
- [ ] Expenses page loads and displays data
- [ ] Can create new items in each section
- [ ] Lists refresh after mutations
- [ ] No "Cannot read properties of undefined" errors
- [ ] No "X is not a function" errors

## Quick Fixes Reference

**Pattern 1: Hook returns object with properties**
```typescript
// BEFORE (WRONG)
const { carriers, getCarrierById } = useCarriers();

// AFTER (CORRECT)
const { data: carriers = [] } = useCarriers();
const getCarrierById = (id: string) => carriers.find(c => c.id === id);
```

**Pattern 2: Hook returns metrics/data**
```typescript
// BEFORE (WRONG)
const { metrics } = useExpenseMetrics();

// AFTER (CORRECT)
const { data: metrics } = useExpenseMetrics();
```

**Pattern 3: Refresh function**
```typescript
// BEFORE (WRONG)
const { refresh } = useCommissions();
refresh();

// AFTER (CORRECT)
const { refetch } = useCommissions();
refetch();
```

## Command to Start Investigation
```bash
# Find all non-standard hook usage
grep -r "const.*{.*}.*=.*use" src/features --include="*.tsx" | \
  grep -E "(useCommission|useExpense|useCarrier|usePolicy|usePolicies)" | \
  grep -v "import" | grep -v "data:"
```

## Next Steps
1. Run the investigation command above
2. Fix each file found to use correct TanStack Query pattern
3. Test each page after fixing
4. Run typecheck to verify no new errors
5. Commit when all pages work without errors
