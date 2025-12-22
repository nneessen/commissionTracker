# Continuation: IMO/Agency Service Alignment

## Session Context

Multi-IMO/Agency architecture implementation across all services. Phases 1-3 complete, Phase 4 remaining.

**Last Commits (not yet committed):**
- Phase 1: Clients hierarchy visibility
- Phase 1 Fixes: Code review fixes (NULL safety, indexes, guards)
- Phase 2: Expenses org awareness
- Phase 3: User Targets team visibility

---

## Completed Work

### Phase 1: Clients Hierarchy Visibility ✅

**Migration:** `20251222_001_clients_hierarchy_visibility.sql`
**Fix Migration:** `20251222_002_fix_clients_hierarchy_issues.sql`

- Added RLS policies: uplines view downline clients, IMO admins view all, super admins view all
- DB functions: `get_downline_clients_with_stats()`, `get_imo_clients_with_stats()`, `has_downlines()`, `check_is_imo_admin()`
- Added `pg_trgm` GIN index on `hierarchy_path` for LIKE query performance
- Types: `DownlineClientWithStats`, `ClientViewMode`
- Repository: `findDownlineWithStats()`, `findImoWithStats()`, `hasDownlines()`
- Service: `getDownlineClientsWithStats()`, `getImoClientsWithStats()`, `hasDownlines()`
- Hooks: `useDownlineClients`, `useImoClients`, `useHasDownlines`, `useIsImoAdmin`, `useInvalidateClientHierarchy`

### Phase 2: Expenses Org Awareness ✅

**Migration:** `20251222_003_expenses_org_awareness.sql`

- Added columns: `expenses.imo_id`, `expenses.agency_id` with FK constraints
- Backfilled existing expenses from user_profiles
- Trigger: `trigger_set_expense_org_ids` auto-populates on insert
- Added RLS policies for hierarchy/IMO visibility
- DB functions: `get_downline_expenses()`, `get_downline_expense_summary()`, `get_imo_expense_summary()`, `get_imo_expense_by_category()`
- Types: `DownlineExpense`, `AgentExpenseSummary`, `CategoryExpenseSummary`, `ExpenseDateRange`, `ExpenseViewMode`
- Repository: 4 new hierarchy methods
- Service: 4 new hierarchy methods
- Hooks: `useDownlineExpenses`, `useDownlineExpenseSummary`, `useImoExpenseSummary`, `useImoExpenseByCategory`, `useInvalidateTeamExpenses`

### Phase 3: User Targets Team Visibility ✅

**Migration:** `20251222_004_user_targets_team_visibility.sql`

- Added RLS policies: uplines view downline targets, IMO admins view all, super admins view all
- DB functions: `get_downline_targets()`, `get_imo_targets()`
- Types: `DownlineTarget`, `ImoTarget`, `TargetViewMode`
- Repository: `findDownlineWithOwner()`, `findImoWithOwner()`
- Service: `getDownlineTargets()`, `getImoTargets()`
- Hooks: `useDownlineTargets`, `useImoTargets`, `useInvalidateTeamTargets`

---

## Remaining Work

### Phase 4: Workflow Org Templates (Lower Priority)

**Scope:**
- Add `imo_id` and `is_org_template` columns to `workflows` table
- Allow IMO-level workflow templates to be shared
- Update WorkflowService for org template CRUD
- UI for "Save as Org Template" option

---

## Key Patterns Established

### RLS Policy Pattern
```sql
-- Upline visibility
CREATE POLICY "Uplines can view downline X" ON table FOR SELECT
USING (is_upline_of(user_id));

-- IMO admin visibility
CREATE POLICY "IMO admins can view all X in own IMO" ON table FOR SELECT
USING (is_imo_admin() AND imo_id = get_my_imo_id());

-- Super admin visibility
CREATE POLICY "Super admins can view all X" ON table FOR SELECT
USING (is_super_admin());
```

### Hook Pattern with IMO Admin Guard
```typescript
export function useImoData(options?: { isImoAdmin?: boolean }) {
  const shouldFetch = options?.isImoAdmin === true;
  return useQuery({
    enabled: shouldFetch,
    // ...
  });
}
```

### NULL-Safe Owner Name Pattern
```sql
COALESCE(
  NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
  up.email,
  'Unknown'
) as owner_name
```

---

## Helper Functions Available

| Function | Purpose |
|----------|---------|
| `is_upline_of(uuid)` | Check if current user is upline of target |
| `is_imo_admin()` | Check if current user is IMO admin/owner |
| `is_super_admin()` | Check if current user is super admin |
| `get_my_imo_id()` | Get current user's IMO ID |
| `get_my_agency_id()` | Get current user's agency ID |
| `has_downlines()` | Check if current user has any downlines |
| `check_is_imo_admin()` | Public wrapper for UI permission checks |

---

## Files to Reference

**Types:**
- `src/types/client.types.ts` - DownlineClientWithStats, ClientViewMode
- `src/types/expense.types.ts` - DownlineExpense, AgentExpenseSummary, etc.
- `src/types/targets.types.ts` - DownlineTarget, ImoTarget, TargetViewMode

**Hooks:**
- `src/hooks/clients/useDownlineClients.ts` - Client hierarchy hooks
- `src/hooks/expenses/useTeamExpenses.ts` - Expense hierarchy hooks
- `src/hooks/targets/useTeamTargets.ts` - Target hierarchy hooks

**Services:**
- `src/services/clients/client/ClientRepository.ts` - Hierarchy methods
- `src/services/expenses/expense/ExpenseRepository.ts` - Hierarchy methods
- `src/services/targets/UserTargetsRepository.ts` - Hierarchy methods

---

## Start Command (for Phase 4)

```
Continue from plans/active/org-awareness-continuation.md - implement Phase 4: Workflow Org Templates
```

---

## Build Status

✅ `npm run build` passes with zero TypeScript errors
