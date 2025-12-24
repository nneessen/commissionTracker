# CommissionService Refactoring to BaseRepository Pattern

## Session Continuation Prompt

Continue refactoring the commission services to use the BaseRepository pattern.

---

## Bugs Fixed (Completed)

### Bug 1: Wrong property access for contract_level
- **Fixed:** `user.contractCompLevel` → `user.contract_level` (line 143)
- Database returns snake_case columns

### Bug 2: Missing comp_guide data crashes policy creation
- **Fixed:** Changed from throwing error to returning null (lines 178-191)
- Policy creation now succeeds with `isAutoCalculated: false` when no comp_guide rate exists
- Warning logged for visibility

---

## Data Requirement: comp_guide Table

For auto-commission calculation to work, the `comp_guide` table must contain entries for:
- carrier_id
- product_type (enum: whole_life, term, indexed_ul, etc.)
- contract_level (80, 100, 110, 120, etc.)
- commission_percentage

Without this data, policies will be created but commissions won't be auto-calculated.

---

## Current Commission Service Architecture

Located in `src/services/commissions/`:

| File | Purpose | Refactor Priority |
|------|---------|-------------------|
| `CommissionRepository.ts` | Already created - base repo for commissions table | Done |
| `CommissionCRUDService.ts` | Create/Read/Update/Delete operations | Medium |
| `CommissionCalculationService.ts` | Commission auto-calculation logic | High (has bug) |
| `CommissionLifecycleService.ts` | Status transitions, chargebacks | Medium |
| `CommissionAnalyticsService.ts` | Reporting, aggregations | Low |
| `CommissionStatusService.ts` | Status management | Medium |
| `commissionService.ts` | Legacy facade - delegates to above | To be updated |
| `commissionRateService.ts` | Rate lookups | Low |
| `chargebackService.ts` | Chargeback handling | Low |
| `index.ts` | Barrel exports | Update after refactor |

---

## Refactoring Plan

### Phase 1: Fix Critical Bug
1. Fix `user.contractCompLevel` → `user.contract_level` in CommissionCalculationService
2. Verify policy creation works

### Phase 2: Update CommissionCRUDService to use Repository
1. Inject `CommissionRepository` via composition (not inheritance)
2. Update methods to use repository instead of direct Supabase calls
3. Ensure ServiceResponse pattern is used consistently

### Phase 3: Update CommissionCalculationService
1. Fix property access for contract_level
2. Ensure proper error handling
3. Use ServiceResponse pattern where applicable

### Phase 4: Update CommissionLifecycleService
1. Use repository for database operations
2. Ensure status transitions are consistent

### Phase 5: Update Legacy Facade
1. Update `commissionService.ts` to use refactored services
2. Ensure backward compatibility
3. Update barrel exports

---

## Files to Modify

1. `src/services/commissions/CommissionCalculationService.ts`
   - Fix `user.contractCompLevel` → `user.contract_level`

2. `src/services/commissions/CommissionCRUDService.ts`
   - Add repository injection
   - Use repository methods

3. `src/services/commissions/CommissionLifecycleService.ts`
   - Add repository injection
   - Use repository methods

4. `src/services/commissions/index.ts`
   - Update exports

---

## Existing Repository Reference

The `CommissionRepository` already exists at `src/services/commissions/CommissionRepository.ts`. Check its implementation before refactoring services.

---

## Testing Requirements

After refactoring:
1. Run `npm run build` - must pass with zero errors
2. Test policy creation in UI - verify commission auto-calculation works
3. Verify no TypeScript errors related to property access

---

## Pattern Reference

Follow the same pattern used in recently refactored services:
- `src/services/notifications/notification/NotificationService.ts`
- `src/services/messaging/message/MessagingService.ts`
- `src/services/expenses/expense/ExpenseService.ts`

Each service:
1. Has a repository (data access layer)
2. Has a service class (business logic layer)
3. Uses ServiceResponse pattern: `{ success: boolean, data?: T, error?: Error }`
4. Has barrel exports via `index.ts`

---

## Start Command

Begin by:
1. Reading `CommissionCalculationService.ts` to understand the bug context
2. Fix the `contract_level` property access
3. Run build to verify fix
4. Then proceed with repository pattern refactoring
