# Utils Directory Audit & Cleanup Plan

**Created**: 2025-01-20
**Status**: In Progress
**Priority**: High
**Scope**: Audit and clean up src/utils directory to remove unused/redundant files

---

## Executive Summary

Comprehensive audit of the `src/utils/` directory revealed:
- **2 files violating project rules** (localStorage usage, unused code)
- **3 files redundant with existing solutions** (TanStack Query, lib/format.ts)
- **1 legacy migration file** (can be removed after migration complete)
- **8 files that should be kept** (actively used, purpose-specific)

**User's instinct was CORRECT**: cache.ts is redundant with TanStack Query!

---

## Current State Analysis

### Files in src/utils/ (14 total)

| File | Status | Usage Count | Action |
|------|--------|-------------|--------|
| test-add-policy.js | 🚨 VIOLATION | 0 | DELETE - violates localStorage rules |
| calculationUtils.ts | ❌ UNUSED | 0 | DELETE - no imports found |
| cache.ts | ⚠️ REDUNDANT | 4 files | MIGRATE then DELETE |
| queryBatch.ts | ⚠️ REDUNDANT | 1 file | EVALUATE then possibly DELETE |
| formatting.ts | 🔄 DUPLICATE | 5 files | CONSOLIDATE with lib/format.ts |
| dataMigration.ts | 📦 LEGACY | 1 file | MARK for future removal |
| policyCalculations.ts | ✅ KEEP | 5 files | Active, domain-specific |
| dashboardCalculations.ts | ✅ KEEP | 6 files | Active, dashboard-specific |
| dateRange.ts | ✅ KEEP | 15 files | Heavily used |
| exportHelpers.ts | ✅ KEEP | 1 file | Export functionality |
| toast.ts | ✅ KEEP | 6 files | UI abstraction |
| stringUtils.ts | ✅ KEEP | 1 file | Consider moving to lib/ |
| retry.ts | ✅ KEEP | 3 files | Error handling |
| performance.ts | ✅ KEEP | 3 files | Observability |

---

## Critical Issues Detailed

### 1. test-add-policy.js - CRITICAL VIOLATION

**Problem**:
- Uses localStorage for policy data (lines 27-35)
- Directly violates project rule: "ZERO LOCAL STORAGE FOR APPLICATION DATA"
- Test script that shouldn't be in src/utils/

**Code Evidence**:
```javascript
const storageKey = 'commission_tracker_policies';
const existing = localStorage.getItem(storageKey);
localStorage.setItem(storageKey, JSON.stringify(policies));
```

**Action**: DELETE immediately

---

### 2. calculationUtils.ts - UNUSED CODE

**Problem**:
- Zero imports found in codebase
- Simple helper functions for finding calculation results
- No references in production code

**Functions**:
- `findCalculationByScenario()` - unused
- `getBreakevenCalculation()` - unused
- `getTargetCalculation()` - unused
- `createDefaultCalculation()` - unused
- `getCalculationSafely()` - unused

**Action**: DELETE (safe removal, no impact)

---

### 3. cache.ts - REDUNDANT WITH TANSTACK QUERY

**Problem** (User's concern is VALID):
- Custom Cache class with TTL, LRU eviction, size limits
- DataLoader class for batching
- memoize() function for async caching
- **TanStack Query already provides all of this!**

**Current Usage**:
1. `CommissionCRUDService.ts` - imports cache
2. `CommissionRepository.ts` - imports cache
3. `MetricsService.ts` - imports cache
4. `__tests__/utils/cache.test.ts` - test file

**Why TanStack Query is Better**:
- Automatic cache invalidation
- React-integrated lifecycle
- Built-in stale-while-revalidate
- Automatic background refetching
- Request deduplication
- Optimistic updates
- DevTools for debugging

**Global Cache Instances** (lines 338-344):
```typescript
export const caches = {
  commissions: new Cache({ ttlMs: 5 * 60 * 1000 }),
  policies: new Cache({ ttlMs: 10 * 60 * 1000 }),
  carriers: new Cache({ ttlMs: 30 * 60 * 1000 }),
  users: new Cache({ ttlMs: 15 * 60 * 1000 }),
  compGuide: new Cache({ ttlMs: 60 * 60 * 1000 }),
};
```

**Migration Strategy**:
1. Audit usage in CommissionCRUDService
2. Audit usage in CommissionRepository
3. Audit usage in MetricsService
4. Replace with TanStack Query's built-in caching (queryClient configuration)
5. Update tests to use TanStack Query testing utilities
6. Remove cache.ts

**TanStack Query Equivalent**:
```typescript
// Instead of custom cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (was cacheTime)
    },
  },
});
```

---

### 4. queryBatch.ts - POTENTIALLY REDUNDANT

**Problem**:
- Custom batching utilities for N+1 prevention
- TanStack Query has built-in request deduplication
- Used by only 1 file: `CommissionRepository.ts`

**Functions**:
- `batchLoadByIds()` - batch load by IDs
- `batchLoadByForeignKey()` - batch load by FK
- `parallelQueries()` - parallel execution
- `batchUpdate()` - batch updates
- `batchInsert()` - batch inserts
- `buildOptimizedQuery()` - query optimization
- `compoundQuery()` - aggregate multiple queries

**Current Usage**: CommissionRepository.ts

**Evaluation Needed**:
1. Check if CommissionRepository actually needs custom batching
2. Compare with TanStack Query's `useQueries()` hook
3. Assess if Supabase batch queries provide better patterns
4. Determine if this adds measurable value

**TanStack Query Alternatives**:
```typescript
// Instead of parallelQueries
const results = useQueries({
  queries: [
    { queryKey: ['policies'], queryFn: fetchPolicies },
    { queryKey: ['commissions'], queryFn: fetchCommissions },
  ],
});

// Automatic request deduplication
// Multiple components calling same query = single network request
```

---

### 5. formatting.ts - DUPLICATE OF lib/format.ts

**Problem**: Two formatting files with overlapping functions!

**Comparison**:

| Function | utils/formatting.ts | lib/format.ts | Winner |
|----------|---------------------|---------------|--------|
| formatCurrency | ✓ | ✓ | lib (uses Intl.NumberFormat) |
| formatPercent | ✓ | ✓ | both identical |
| formatNumber | ✓ | ✓ | both identical |
| formatDate | ✓ | ✓ | both identical |
| formatNumberWithCommas | ✓ | ✗ | MOVE to lib |
| abbreviateNumber | ✓ | ✗ | MOVE to lib |
| formatDateTime | ✓ | ✗ | MOVE to lib |
| formatMonthYear | ✗ | ✓ | lib only |

**Current Usage of utils/formatting.ts**:
1. `src/features/dashboard/config/kpiConfig.ts`
2. `src/features/dashboard/config/statsConfig.ts`
3. `src/features/dashboard/config/alertsConfig.ts`
4. `src/features/dashboard/components/PerformanceOverviewCard.tsx`
5. (Plus 1 completed plan document reference)

**Consolidation Plan**:
1. Add missing functions to `lib/format.ts`:
   - `formatNumberWithCommas()`
   - `abbreviateNumber()`
   - `formatDateTime()`
2. Update imports in 4 production files
3. Delete `utils/formatting.ts`
4. Update any barrel exports if needed

---

### 6. dataMigration.ts - LEGACY CODE

**Purpose**: Migrate data from localStorage to Supabase database

**Current Usage**:
- `src/hooks/useMigration.ts` - migration hook

**Why it's Legacy**:
- Project rule: "ZERO LOCAL STORAGE FOR APPLICATION DATA"
- Migration should be one-time operation
- Once users migrate, this code is never used again

**Functions**:
- `migrateFromLocalStorage()` - main migration
- `checkDatabaseEmpty()` - pre-migration check
- `clearLocalStorageData()` - post-migration cleanup
- Private helpers for each entity type

**Action**:
- Mark for future removal
- Add comment: "// TODO: Remove after all users migrated (target: Q2 2025)"
- Keep for now as some users may still have localStorage data

---

## Files to KEEP (Well-Organized & Necessary)

### 7. policyCalculations.ts ✅
- **Purpose**: Insurance-specific premium and commission calculations
- **Usage**: 5 files (PolicyList, PolicyForm, PolicyFormUpdated, PolicyListInfinite, useMetrics)
- **Why Keep**: Domain-specific business logic, well-documented
- **Functions**:
  - `calculateAnnualPremium()` - frequency conversions
  - `calculatePaymentAmount()` - payment splits
  - `calculateExpectedCommission()` - advance calculations
  - `validateCommissionPercentage()` - validation

### 8. dashboardCalculations.ts ✅
- **Purpose**: Dashboard metric scaling and calculations
- **Usage**: 6 files (dashboard configs, DashboardHome, PerformanceOverviewCard)
- **Why Keep**: Dashboard-specific logic, time period scaling
- **Functions**:
  - `scaleToDisplayPeriod()` - metric scaling
  - `getPoliciesNeededDisplay()` - pace calculations
  - `calculateMonthProgress()` - progress tracking
  - `getPerformanceStatus()` - status indicators

### 9. dateRange.ts ✅
- **Purpose**: Time period utilities (daily, weekly, monthly, yearly)
- **Usage**: 15 files (HEAVILY USED)
- **Why Keep**: Core app functionality, no overlap with lib/date.ts
- **Key Exports**:
  - `TimePeriod` type
  - `getDateRange()` - range calculation
  - `getDaysInPeriod()` - period conversions
  - `DAYS_PER_PERIOD` - constants

### 10. exportHelpers.ts ✅
- **Purpose**: CSV and PDF export functionality
- **Usage**: 1 file (AnalyticsDashboard)
- **Why Keep**: Specific export functionality
- **Functions**:
  - `convertToCSV()` - CSV generation
  - `downloadCSV()` - file download
  - `copyToClipboardAsCSV()` - clipboard
  - `printAnalyticsToPDF()` - PDF export

### 11. toast.ts ✅
- **Purpose**: Wrapper for react-hot-toast with consistent styling
- **Usage**: 6 files (ExpenseDashboard, ExpenseDialog, PolicyDashboard, DashboardHome, useMarkCommissionPaid)
- **Why Keep**: Good abstraction layer, consistent UI
- **API**:
  - `showToast.success()`
  - `showToast.error()`
  - `showToast.loading()`
  - `showToast.promise()`

### 12. stringUtils.ts ✅ (Consider moving to lib/)
- **Purpose**: String manipulation utilities
- **Usage**: 1 file (RateEditDialog)
- **Why Keep**: General utility functions
- **Functions**:
  - `capitalizeWords()` - title case
  - `capitalize()` - sentence case
- **Consideration**: Move to `lib/string.ts` if it's app-wide utility

### 13. retry.ts ✅
- **Purpose**: Retry logic with exponential backoff and circuit breaker
- **Usage**: 3 files (CommissionCRUDService, CommissionCalculationService, test)
- **Why Keep**: Robust error handling, production-ready
- **Features**:
  - `withRetry()` - retry wrapper
  - `@Retry()` - decorator
  - `CircuitBreaker` class

### 14. performance.ts ✅
- **Purpose**: Performance monitoring for tracking query timing
- **Usage**: 3 files (CommissionRepository, MetricsService, monitoring/index.ts)
- **Why Keep**: Observability and debugging
- **Features**:
  - `measureAsync()` - async timing
  - `performanceMonitor` - global metrics
  - `queryPerformance` - DB query tracking

---

## Implementation Plan

### Phase 1: Immediate Cleanup (Priority: CRITICAL) ✅ READY TO START

**Tasks**:
1. ✅ Delete `test-add-policy.js`
   - No imports to update
   - Direct violation of project rules
   - **Risk**: None

2. ✅ Delete `calculationUtils.ts`
   - No imports to update
   - Confirmed unused via grep
   - **Risk**: None

3. ✅ Create archive if needed
   - Move deleted files to `archive/utils/` for reference
   - Add README explaining why removed

**Testing**: None needed (unused files)

**Estimated Time**: 15 minutes

---

### Phase 2: Consolidate Formatting (Priority: HIGH) 🔄 READY TO START

**Tasks**:
1. ✅ Add missing functions to `lib/format.ts`:
   ```typescript
   // Add these functions from utils/formatting.ts:
   export function formatNumberWithCommas(value: number, decimals: number = 0): string
   export function abbreviateNumber(value: number): string
   export function formatDateTime(date: Date | string): string
   ```

2. ✅ Update imports in 4 files:
   - `src/features/dashboard/config/kpiConfig.ts`
   - `src/features/dashboard/config/statsConfig.ts`
   - `src/features/dashboard/config/alertsConfig.ts`
   - `src/features/dashboard/components/PerformanceOverviewCard.tsx`

   Change:
   ```typescript
   // Before
   import { formatCurrency, formatPercent } from '@/utils/formatting';

   // After
   import { formatCurrency, formatPercent } from '@/lib/format';
   ```

3. ✅ Delete `utils/formatting.ts`

4. ✅ Run typecheck to verify

**Testing**:
- Run `npm run typecheck`
- Manually verify dashboard displays correctly
- Check formatting in dashboard components

**Estimated Time**: 30 minutes

---

### Phase 3: Evaluate Cache & Query Batch (Priority: MEDIUM) 🔍 NEEDS INVESTIGATION

#### Step 3A: Audit cache.ts Usage

**Files to Review**:
1. `CommissionCRUDService.ts`
   - Check what's being cached
   - Identify cache invalidation patterns
   - Document TanStack Query equivalent

2. `CommissionRepository.ts`
   - Check repository-level caching
   - Assess if needed vs TanStack Query

3. `MetricsService.ts`
   - Check metrics caching
   - Evaluate staleness requirements

4. `cache.test.ts`
   - Review test coverage
   - Plan migration to TanStack Query testing

**Questions to Answer**:
- What data is being cached?
- What are the TTL requirements?
- Are there cache dependencies?
- What invalidation patterns are used?
- Can TanStack Query handle all use cases?

**Estimated Time**: 2 hours investigation

#### Step 3B: Plan Cache Migration

**Approach**:
1. Configure TanStack Query with appropriate cache times
2. Update service layer to use query keys
3. Replace cache calls with useQuery hooks
4. Test cache invalidation
5. Remove cache.ts

**TanStack Query Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min (was cache.ttl)
      gcTime: 10 * 60 * 1000,       // 10 min garbage collection
      refetchOnWindowFocus: false,  // Prevent aggressive refetching
      retry: 1,                     // Use retry.ts for custom retry logic
    },
  },
});
```

**Estimated Time**: 4-6 hours implementation

#### Step 3C: Evaluate queryBatch.ts

**Questions**:
- Does CommissionRepository benefit from custom batching?
- Can Supabase handle batch queries natively?
- Does TanStack Query's deduplication cover use cases?
- Performance benchmarks: custom batching vs TanStack Query?

**Approach**:
1. Review CommissionRepository.ts usage
2. Test with TanStack Query's `useQueries()`
3. Benchmark performance
4. Decide: keep or remove

**Estimated Time**: 2-3 hours investigation

---

### Phase 4: Documentation (Priority: LOW) 📝 FINAL STEP

**Tasks**:
1. ✅ Create `src/utils/README.md`:
   ```markdown
   # Utils Directory Organization

   ## Purpose
   Utils contains **domain-specific** utilities for the insurance commission tracker.

   ## When to use utils/ vs lib/
   - **lib/**: General-purpose utilities (date, format, validation)
   - **utils/**: Domain-specific utilities (policy calculations, dashboard metrics)

   ## File Inventory
   [List each file with purpose and usage]
   ```

2. ✅ Update `CLAUDE.md` if needed:
   - Add utils organization rules
   - Document formatting function locations
   - Add note about cache.ts removal

3. ✅ Add JSDoc comments to all utils files
   - Ensure every function has proper documentation
   - Add usage examples
   - Document when to use each utility

**Estimated Time**: 1 hour

---

## Success Criteria

### Immediate Goals (Phase 1-2)
- [ ] test-add-policy.js deleted
- [ ] calculationUtils.ts deleted
- [ ] formatting.ts consolidated into lib/format.ts
- [ ] All imports updated and working
- [ ] Typecheck passes
- [ ] Dashboard displays correctly

### Long-term Goals (Phase 3)
- [ ] cache.ts usage migrated to TanStack Query
- [ ] cache.ts deleted
- [ ] queryBatch.ts evaluated and decision made
- [ ] All tests passing
- [ ] Performance maintained or improved

### Documentation Goals (Phase 4)
- [ ] README.md created in src/utils/
- [ ] CLAUDE.md updated with utils organization
- [ ] All functions have proper JSDoc comments

---

## Risk Assessment

### Low Risk
- Deleting test-add-policy.js (unused, violates rules)
- Deleting calculationUtils.ts (unused, zero imports)
- Consolidating formatting.ts (simple find/replace imports)

### Medium Risk
- Migrating cache.ts usage (affects 3 production files + 1 test)
- Requires careful testing of caching behavior
- Must verify TanStack Query handles all use cases

### High Risk
- None identified (all changes are well-scoped)

---

## Rollback Plan

### If Phase 1-2 Issues
- Restore files from git history
- Revert import changes
- Run `npm run typecheck` to verify

### If Phase 3 Issues (Cache Migration)
- Keep cache.ts alongside TanStack Query temporarily
- Gradual migration per service
- Compare performance metrics
- Roll back if performance degrades

---

## Testing Checklist

### Phase 1-2 Testing
- [ ] TypeScript compilation succeeds
- [ ] No import errors
- [ ] Dashboard loads without errors
- [ ] Dashboard formatting displays correctly
- [ ] KPI cards show proper currency/percent formatting
- [ ] No console errors

### Phase 3 Testing (Cache Migration)
- [ ] Commission data loads correctly
- [ ] Metrics refresh properly
- [ ] Cache invalidation works (edit → reload → see changes)
- [ ] No performance degradation
- [ ] DevTools shows proper cache behavior
- [ ] All existing tests pass
- [ ] Add new tests for TanStack Query integration

---

## Notes

### Why This Matters
- **Code Quality**: Reduces confusion about where formatting/caching lives
- **Maintainability**: Single source of truth for each utility type
- **Performance**: TanStack Query is battle-tested and optimized
- **Best Practices**: Aligns with React Query patterns used across the ecosystem
- **Project Compliance**: Removes localStorage violations

### User's Original Question
> "why do we have this file [cache.ts]? we're using Tanstack query for the hooks, so thats already got caching built in"

**Answer**: You're absolutely right! The cache.ts file duplicates TanStack Query's functionality. It was likely created before full TanStack Query adoption. We'll migrate away from it and remove the file.

---

## Completion Checklist

- [ ] Phase 1: Immediate cleanup complete
- [ ] Phase 2: Formatting consolidation complete
- [ ] Phase 3: Cache evaluation and migration complete
- [ ] Phase 4: Documentation complete
- [ ] All tests passing
- [ ] README updated
- [ ] CLAUDE.md updated
- [ ] Plan moved to `plans/completed/`

---

**Last Updated**: 2025-01-20
**Next Review**: After Phase 1-2 completion
