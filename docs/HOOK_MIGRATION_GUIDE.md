# Hook Migration Guide

## Overview

This guide explains how to migrate from the old monolithic hooks to the new modular hooks architecture introduced in the React 19.1 refactoring.

## Key Changes

### React 19.1 Optimizations
- **Removed all `useCallback` and `useMemo`** - React 19.1 handles these optimizations automatically
- **Cleaner function definitions** - No more manual memoization wrappers
- **Better performance** - Let React Compiler handle re-render optimizations

### Architecture Changes
- **Modular hooks** - Each entity (policies, commissions, expenses) now has 6 focused hooks instead of one monolithic hook
- **Built-in pagination** - All list hooks now include pagination with configurable page sizes
- **Advanced filtering** - Powerful filter system with multiple operators
- **Flexible sorting** - Single and multi-field sorting capabilities
- **Consistent patterns** - All entities follow the same hook structure

## Migration Examples

### Policies

#### Old Way (usePolicy)
```typescript
const {
  policies,
  addPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyById
} = usePolicy();

// All operations in one hook
const policy = getPolicyById(id);
```

#### New Way (Modular Hooks)
```typescript
// Import only what you need
import {
  usePolicies,
  usePolicy,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy
} from '@/hooks/policies';

// List with pagination/filtering/sorting
const { paginatedPolicies, setFilters, toggleSort } = usePolicies();

// Single policy
const { policy } = usePolicy(id);

// Create operations
const { createPolicy } = useCreatePolicy();

// Update operations
const { updatePolicy } = useUpdatePolicy();

// Delete operations
const { deletePolicy } = useDeletePolicy();
```

### Commissions

#### Old Way
```typescript
const {
  commissions,
  addCommission,
  updateCommission,
  deleteCommission,
  getFilteredCommissions,
  commissionSummary
} = useCommissions();

// Filtering was manual
const filtered = getFilteredCommissions({ carrierId: 'xyz' });
```

#### New Way
```typescript
import {
  useCommissions,
  useCommissionMetrics,
  useCreateCommission
} from '@/hooks/commissions';

// Built-in filtering and pagination
const {
  paginatedCommissions,
  setFilters,
  currentPage,
  goToPage
} = useCommissions();

// Apply filters
setFilters({ carrierId: 'xyz', status: 'pending' });

// Metrics in separate hook
const { metrics } = useCommissionMetrics();

// Create in separate hook
const { createCommission } = useCreateCommission();
```

### Expenses

#### Old Way
```typescript
const {
  expenses,
  constants,
  totals,
  calculations,
  performanceMetrics,
  addExpense,
  updateExpense,
  deleteExpense,
  updateConstant,
  exportToCSV
} = useExpenses();
```

#### New Way
```typescript
import {
  useExpenses,
  useExpenseMetrics,
  useConstants,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense
} from '@/hooks/expenses';

// List operations
const { paginatedExpenses, setFilters } = useExpenses();

// Metrics and calculations
const {
  totals,
  calculations,
  performanceMetrics,
  exportToCSV
} = useExpenseMetrics();

// Constants management
const { constants, updateConstant } = useConstants();

// CRUD operations
const { createExpense } = useCreateExpense();
const { updateExpense } = useUpdateExpense();
const { deleteExpense } = useDeleteExpense();
```

## Pagination Usage

All list hooks now include pagination:

```typescript
const {
  paginatedPolicies,  // Current page data
  currentPage,         // Current page number (1-based)
  totalPages,          // Total number of pages
  pageSize,            // Items per page
  totalItems,          // Total items count
  goToPage,            // Navigate to specific page
  nextPage,            // Go to next page
  previousPage,        // Go to previous page
  setPageSize,         // Change page size
  pageSizeOptions      // Available page sizes [10, 25, 50, 100]
} = usePolicies();

// Navigate to page 3
goToPage(3);

// Change page size to 25
setPageSize(25);
```

## Filtering Usage

Advanced filtering with multiple operators:

```typescript
const { setFilters, clearFilters, filterCount } = usePolicies();

// Apply filters
setFilters({
  status: 'active',
  minPremium: 1000,
  maxPremium: 5000,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Clear all filters
clearFilters();

// Check active filter count
console.log(`${filterCount} filters applied`);
```

## Sorting Usage

Flexible sorting system:

```typescript
const { toggleSort, setSortConfig, clearSort } = usePolicies();

// Toggle sort on a field
toggleSort('effectiveDate'); // Toggles between asc/desc/none

// Set specific sort
setSortConfig({ field: 'annualPremium', direction: 'desc' });

// Clear sorting
clearSort();
```

## Error Handling

All mutation hooks include error handling:

```typescript
const { createPolicy, isCreating, error, clearError } = useCreatePolicy();

const handleCreate = async (formData) => {
  const policy = createPolicy(formData);

  if (policy) {
    console.log('Created successfully:', policy);
  } else {
    console.error('Creation failed:', error);
    // Clear error after showing to user
    setTimeout(clearError, 3000);
  }
};
```

## Benefits of New Architecture

1. **Better Performance**
   - React 19.1 optimizations eliminate manual memoization
   - Pagination reduces initial render size
   - Modular imports reduce bundle size

2. **Improved Developer Experience**
   - Use only the hooks you need
   - Clearer separation of concerns
   - Consistent patterns across all entities
   - Better TypeScript support

3. **Enhanced Features**
   - Built-in pagination
   - Advanced filtering
   - Flexible sorting
   - Better error handling
   - Conflict detection on updates

4. **Maintainability**
   - Smaller, focused hooks are easier to test
   - Changes to one operation don't affect others
   - Clear single responsibility principle

## Breaking Changes

1. **Import Paths**: Update all imports to use new modular paths
2. **Hook Names**: Some hooks renamed for consistency (e.g., `usePolicy` → `usePolicies` for list)
3. **Function Signatures**: CRUD functions now in separate hooks
4. **Pagination Required**: List data now paginated by default
5. **No useCallback/useMemo**: Remove all manual memoization

## Rollback Instructions

If you need to rollback:
1. Restore old hook files from git history
2. Update imports back to original paths
3. Add back useCallback/useMemo if on React < 19.1

## Support

For questions or issues with the migration, please refer to:
- This migration guide
- The test files for usage examples
- The TypeScript types for API documentation