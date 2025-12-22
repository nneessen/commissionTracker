# Continuation: IMO/Agency Service Alignment - Phase 4

## Session Context

Multi-IMO/Agency architecture implementation across all services. Phases 1-3 complete and deployed, Phase 4 remaining.

**Completed Commits:**
- `03d2ccf` Phase 1: Clients hierarchy visibility
- `8a0de4c` Phase 2: Expenses org awareness
- `fb98084` Phase 3: User Targets team visibility
- `149ab39` Chore: Export client hooks, invalidate hierarchy cache

---

## Phase 4: Workflow Org Templates

**Goal:** Allow IMO-level workflow templates to be shared across the organization.

### Scope

1. **Migration:** Add org columns to workflows table
   - Add `imo_id uuid REFERENCES imos(id)` column
   - Add `is_org_template boolean DEFAULT false` column
   - Add RLS policies for IMO template visibility
   - Create `get_imo_workflow_templates()` function

2. **Repository:** Add template query methods
   - `findImoTemplates()` - get all templates in user's IMO
   - `createAsOrgTemplate()` - create workflow as org template
   - `cloneFromTemplate()` - clone org template to personal workflow

3. **Service:** Add template operations
   - `getImoWorkflowTemplates()`
   - `saveAsOrgTemplate(workflowId)`
   - `cloneOrgTemplate(templateId)`

4. **Hooks:** Create org template hooks
   - `useImoWorkflowTemplates`
   - `useSaveAsOrgTemplate`
   - `useCloneOrgTemplate`

5. **UI:** Add template management
   - "Save as Org Template" option in workflow editor
   - "Org Templates" tab in workflow list
   - Clone template action

---

## Key Patterns (from Phases 1-3)

### RLS Policy Pattern
```sql
-- IMO admin can manage org templates
CREATE POLICY "IMO admins can manage org templates" ON workflows
FOR ALL USING (
  is_org_template = true
  AND is_imo_admin()
  AND imo_id = get_my_imo_id()
);

-- All IMO members can view org templates
CREATE POLICY "IMO members can view org templates" ON workflows
FOR SELECT USING (
  is_org_template = true
  AND imo_id IN (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);
```

### Hook Pattern with IMO Admin Guard
```typescript
export function useImoWorkflowTemplates(options?: { isImoAdmin?: boolean }) {
  const shouldFetch = options?.isImoAdmin === true;
  return useQuery({
    enabled: shouldFetch,
    // ...
  });
}
```

---

## Files to Reference

**Existing Workflow Files:**
- `src/services/workflowService.ts` - Current workflow service
- `src/hooks/workflows/useWorkflows.ts` - Current workflow hooks
- `src/types/workflow.types.ts` - Workflow types

**Pattern References:**
- `supabase/migrations/20251222_003_expenses_org_awareness.sql` - Migration pattern
- `src/hooks/targets/useTeamTargets.ts` - Hook pattern
- `src/services/targets/userTargetsService.ts` - Service pattern

---

## Helper Functions Available

| Function | Purpose |
|----------|---------|
| `is_imo_admin()` | Check if current user is IMO admin/owner |
| `is_super_admin()` | Check if current user is super admin |
| `get_my_imo_id()` | Get current user's IMO ID |
| `check_is_imo_admin()` | Public wrapper for UI permission checks |

---

## Start Command

```
Continue from plans/active/org-awareness-continuation.md - implement Phase 4: Workflow Org Templates

Context: Phases 1-3 (Clients, Expenses, Targets) are complete with:
- RLS policies for hierarchy/IMO visibility
- DB functions for downline/IMO queries
- Repository/Service/Hook layers

Phase 4 needs:
1. Migration: Add imo_id, is_org_template to workflows + RLS policies
2. DB function: get_imo_workflow_templates()
3. Repository: Add template query/create/clone methods
4. Service: Add template operations
5. Hooks: useImoWorkflowTemplates, useSaveAsOrgTemplate, useCloneOrgTemplate
6. UI: Template management in workflow editor
7. Build verification
```

---

## Build Status

✅ `npm run build` passes with zero TypeScript errors
