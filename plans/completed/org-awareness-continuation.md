# Continuation: IMO/Agency Service Alignment - COMPLETED

## Session Context

Multi-IMO/Agency architecture implementation across all services. All 4 phases complete and deployed.

**Completed Commits:**
- `03d2ccf` Phase 1: Clients hierarchy visibility
- `8a0de4c` Phase 2: Expenses org awareness
- `fb98084` Phase 3: User Targets team visibility
- `149ab39` Chore: Export client hooks, invalidate hierarchy cache
- Phase 4: Workflow Org Templates (pending commit)

---

## Phase 4: Workflow Org Templates - COMPLETED

### Implementation Summary

1. **Migration:** `20251222_005_workflow_org_templates.sql`
   - Added `imo_id uuid` and `is_org_template boolean` columns to workflows
   - Created indexes for org template queries
   - Added RLS policies for IMO member visibility and admin management
   - Created 4 DB functions:
     - `get_imo_workflow_templates()` - Returns templates in user's IMO
     - `save_workflow_as_org_template(uuid)` - Converts workflow to template
     - `clone_org_template(uuid, text)` - Clones template to personal workflow
     - `create_org_workflow_template(...)` - Creates new template directly

2. **Repository:** `src/services/workflows/WorkflowRepository.ts`
   - Added `findImoTemplates()`, `saveAsOrgTemplate()`, `cloneOrgTemplate()` methods
   - Updated `transformWorkflowFromDB()` to include `imoId`, `isOrgTemplate`, `createdByName`

3. **Service:** `src/services/workflows/workflowService.ts`
   - Added `getImoWorkflowTemplates()`, `saveAsOrgTemplate()`, `cloneOrgTemplate()` methods

4. **Types:** `src/types/workflow.types.ts`
   - Added `imoId`, `isOrgTemplate`, `createdByName` to Workflow interface

5. **Hooks:** `src/hooks/workflows/useWorkflows.ts`
   - Added `useImoWorkflowTemplates()` - Fetch IMO templates
   - Added `useSaveAsOrgTemplate()` - Convert workflow to template
   - Added `useCloneOrgTemplate()` - Clone template to workflow

### Build Status

✅ `npm run build` passes with zero TypeScript errors
✅ Dev server starts without runtime errors

---

## Files Changed in Phase 4

| File | Change |
|------|--------|
| `supabase/migrations/20251222_005_workflow_org_templates.sql` | New migration |
| `src/types/database.types.ts` | Regenerated |
| `src/types/workflow.types.ts` | Added org template fields |
| `src/services/workflows/WorkflowRepository.ts` | Added org template methods |
| `src/services/workflows/workflowService.ts` | Added org template methods |
| `src/hooks/workflows/useWorkflows.ts` | Added org template hooks |

---

## Next Steps (Optional UI Work)

Phase 4 backend is complete. Optional UI enhancements:
- Add "Org Templates" tab in workflow list
- Add "Save as Org Template" button in workflow editor (IMO admin only)
- Add "Clone" action on org template cards

---

## Available Hooks for UI Integration

```typescript
// Fetch org templates (enabled based on isImoAdmin check)
const { data: templates } = useImoWorkflowTemplates({ enabled: isImoAdmin });

// Save workflow as org template
const saveAsTemplate = useSaveAsOrgTemplate();
saveAsTemplate.mutate(workflowId);

// Clone template to personal workflow
const cloneTemplate = useCloneOrgTemplate();
cloneTemplate.mutate({ templateId, newName: "My Workflow Copy" });
```
