# Toast Pattern Audit Plan

## Objective
Review all TanStack Query hooks and ensure consistent toast notification patterns across the codebase.

## Toast Pattern Rules

| Operation Type | Toast Location | Example |
|---------------|----------------|---------|
| Single mutation (one call) | Hook `onSuccess`/`onError` | `useDeletePolicy()` called once per delete |
| Batch/loop mutations | Component after all complete | `handleSaveRates()` calling `updateRate` in a loop |
| Error toasts | Hook `onError` (always) | Individual failure debugging is always useful |

### Decision Tree
```
Is this mutation called in a loop or Promise.all?
├── YES → Remove success toast from hook, add to component after batch completes
└── NO → Keep success toast in hook onSuccess
```

## Audit Checklist

### Phase 1: Identify All Hooks with Toasts
- [ ] Find all hooks importing `toast` from `sonner`
- [ ] Document which mutations have `toast.success()` in callbacks
- [ ] Document which mutations have `toast.error()` in callbacks

### Phase 2: Identify Batch Usage Patterns
For each hook with toasts, check all component usages:
- [ ] Is `mutateAsync` called in a `for` loop?
- [ ] Is `mutateAsync` called in `Promise.all`?
- [ ] Is `mutateAsync` called in `.map()` with Promise handling?

### Phase 3: Apply Fixes
For hooks used in batch operations:
1. Remove `toast.success()` from hook `onSuccess`
2. Add consolidated success toast in component after batch completes
3. Keep `toast.error()` in hook for individual failure tracking
4. Add comment explaining pattern: `// Note: No success toast here - component handles batch success notifications`

### Phase 4: Document Pattern
- [ ] Update CLAUDE.md or create a patterns doc with toast guidelines
- [ ] Ensure new hooks follow the pattern

## Files to Audit

### Hooks with Toasts (18 files)

| File | Toast Count | Batch Usage? | Status |
|------|-------------|--------------|--------|
| `src/hooks/reports/scheduled/useScheduledReports.ts` | 4 success | No | ✅ OK |
| `src/hooks/expenses/useGenerateRecurring.ts` | 2 success | No (internal batch) | ✅ OK |
| `src/hooks/expenses/useUpdateExpense.ts` | 1 success | No | ✅ OK |
| `src/hooks/expenses/useCreateExpense.ts` | 2 success | No | ✅ OK |
| `src/hooks/expenses/useDeleteExpense.ts` | 1 success | No | ✅ OK |
| `src/hooks/expenses/useExpenseTemplates.ts` | 3 success | No | ✅ OK |
| `src/hooks/expenses/useExpenseCategories.ts` | 4 success | No (server batch) | ✅ OK |
| `src/hooks/workflows/useWorkflows.ts` | 15 success | No | ✅ OK |
| `src/hooks/hierarchy/useInvitations.ts` | 5 success | No | ✅ OK |
| `src/hooks/commissions/useMarkCommissionPaid.ts` | 1 success | No (not used) | ✅ OK |
| `src/features/contracting/hooks/useContracts.ts` | 3 success | No | ✅ OK |
| `src/features/email/hooks/useEmailTemplates.ts` | 5 success | No | ✅ OK |
| `src/features/recruiting/hooks/useRecruitMutations.ts` | 2 success | No | ✅ OK |
| `src/features/recruiting/hooks/useRecruitInvitations.ts` | 5 success | No (single calls) | ✅ OK |
| `src/features/recruiting/hooks/useLeads.ts` | 1 success | No | ✅ OK |
| `src/features/settings/carriers/hooks/useCarriers.ts` | 3 success | No (single calls) | ✅ OK |
| `src/features/settings/commission-rates/hooks/useCommissionRates.ts` | Fixed | Yes | ✅ Fixed |
| `src/features/settings/products/hooks/useProducts.ts` | 4 success | No (bulk is server-side) | ✅ OK |

### Batch Usage Found and Fixed
- [x] `src/features/settings/commission-rates/CommissionRatesManagement.tsx` - calls `updateRate.mutateAsync` and `createRate.mutateAsync` in loops → **FIXED**

### Audit Results (2026-01-08)
All 6 flagged hooks were reviewed - **no issues found**:
1. ✅ `useGenerateRecurring` - Server handles batch internally, returns count for toast
2. ✅ `useExpenseCategories` - Reorder passes array to server in single call
3. ✅ `useMarkCommissionPaid` - Not used anywhere in components yet
4. ✅ `useRecruitInvitations` - All mutations called as single operations
5. ✅ `useCarriers` - All mutations called as single operations
6. ✅ `useProducts` - `bulkImportProducts` handles bulk server-side correctly

## Commands to Find Hooks with Toasts

```bash
# Find all hooks importing toast
grep -r "import.*toast.*from.*sonner" src/hooks src/features/**/hooks --include="*.ts" --include="*.tsx"

# Find all toast.success calls in hooks
grep -r "toast\.success" src/hooks src/features/**/hooks --include="*.ts" --include="*.tsx"

# Find all mutateAsync calls in loops
grep -r "\.mutateAsync" src/features src/components --include="*.tsx" -B2 -A2 | grep -E "(for|map|Promise\.all)"
```

## Implementation Steps

### Step 1: Review Flagged Hooks (⚠️ Check)
For each hook marked "⚠️ Check", inspect:
1. The hook file to see what mutations exist
2. All component files that import/use the hook
3. Whether any component calls mutations in loops

### Step 2: Apply Fixes Where Needed
For any hook found to be used in batch operations:
```typescript
// BEFORE (in hook)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["data"] });
  toast.success("Item updated"); // REMOVE THIS
},

// AFTER (in hook)
// Note: No success toast here - component handles batch success notifications
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["data"] });
},

// ADD to component after batch completes:
await Promise.all(promises);
toast.success(`Successfully updated ${promises.length} items`);
```

### Step 3: Add Pattern to CLAUDE.md
Add this section to project CLAUDE.md:
```markdown
## Toast Notification Pattern

### Rules
- Single mutations: Toast in hook `onSuccess` is OK
- Batch/loop mutations: Toast in component AFTER all complete
- Error toasts: Always in hook `onError` for debugging

### Example
```typescript
// Hook - no success toast for batch-used mutations
const updateItem = useMutation({
  mutationFn: async (data) => { ... },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
    // NO toast.success() here if used in batches
  },
  onError: (error) => {
    toast.error(`Failed: ${error.message}`); // Keep error toasts
  },
});

// Component - consolidated success toast
const handleBatchUpdate = async (items) => {
  await Promise.all(items.map(item => updateItem.mutateAsync(item)));
  toast.success(`Updated ${items.length} items`);
};
```
```

## Success Criteria
- [x] All hooks follow consistent toast pattern
- [x] No duplicate toasts appear for batch operations (only issue was `useCommissionRates` - **FIXED**)
- [x] Error toasts remain in hooks for debugging
- [ ] Pattern documented in CLAUDE.md for future development

## Audit Complete ✅
**Date:** 2026-01-08
**Result:** Only 1 issue found (`useCommissionRates`) - already fixed.
**Status:** All 18 hooks reviewed and verified.

### Comprehensive Audit (222 Mutation Calls Reviewed)

**Total mutation calls in codebase:** 222
**Files with mutations:** 87 components

**Search patterns used:**
```bash
# Find mutations inside .map() callbacks
grep -rn ".map.*=>" ... -A5 | grep "mutateAsync"
# Result: Only CommissionRatesManagement.tsx (fixed)

# Find mutations inside for loops
grep -rn "for (" ... -A10 | grep "mutateAsync"
# Result: RecruitDetailPanel.tsx (OK - returns after single mutation), CommissionRatesManagement.tsx (fixed)

# Find mutations in Promise.all
grep -rn "Promise.all" ... -A3 | grep "mutateAsync"
# Result: No matches

# Find mutations in forEach
grep -rn ".forEach" ... -A5 | grep "mutateAsync"
# Result: No matches
```

**Conclusion:** The codebase properly handles mutations. The only violation was in `CommissionRatesManagement.tsx` where `updateRate`, `createRate`, and `deleteRate` were called in loops - this has been fixed.

**Note on RecruitDetailPanel.tsx:** This file has a for loop with a mutation, but it's NOT a batch operation - it finds the first completed phase and reverts only that one, then immediately returns.
