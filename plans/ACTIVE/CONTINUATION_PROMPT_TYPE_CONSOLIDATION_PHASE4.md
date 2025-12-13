# Type Consolidation Continuation Prompt - Phase 5+

## Context

You are continuing the Type Architecture Consolidation project for the Commission Tracker application.

**Branch**: `type-consolidation-phase1`
**Plan**: `plans/ACTIVE/type-consolidation-plan.md`

## Completed Work (Phases 1-4)

### Phase 1: Audit ✅
- Created `docs/type-audit.md` - Complete inventory of 31 type files
- Created `docs/type-audit-findings.md` - Detailed field comparisons
- Identified 3 UserProfile duplicates, 3 Carrier duplicates, 2 Client duplicates

### Phase 2: Database-First Migration ✅
- `user.types.ts`: UserProfile extends `Database['public']['Tables']['user_profiles']['Row']`
- `carrier.types.ts`: Carrier extends `CarrierRow` from database.types
- `policy.types.ts`: Added PolicyRow, PolicyInsert, PolicyUpdate, helper functions
- `commission.types.ts`: Renamed Client → CommissionClientInfo

### Phase 3: Remove Duplicates ✅
- Deleted `recruiting.ts` (unused duplicate)
- Deleted `agent.types.ts` (merged into user.types.ts)
- Renamed `database.ts` → `db-helpers.types.ts`
- Deleted `TODO.md` from types directory
- **Type file count: 31 → 27 (-4 files)**

### Phase 4: Consolidate Files ✅
- Merged `comp.types.ts` into `commission.types.ts`
- Added DB-first types: CompGuideRow, CompGuideInsert, CompGuideUpdate
- Comp interface now extends CompGuideRow
- Updated 8 files to import from commission.types.ts
- Fixed null handling in CompTable sorting
- Deleted `comp.types.ts`
- **Type file count: 27 (comp.types.ts merged, not separately counted)**

## Current State

```
src/types/ (27 files)
├── database.types.ts      # Auto-generated Supabase types (SOURCE OF TRUTH)
├── user.types.ts          # Canonical UserProfile + AgentSettings + US_STATES
├── hierarchy.types.ts     # Imports UserProfile from user.types
├── messaging.types.ts     # Uses UserProfileMinimal from user.types
├── policy.types.ts        # PolicyRow + Policy + helpers
├── carrier.types.ts       # CarrierRow + Carrier
├── commission.types.ts    # CommissionClientInfo + Comp types (merged from comp.types.ts)
├── client.types.ts        # Canonical Client entity
├── product.types.ts       # Uses DB enums
├── recruiting.types.ts    # Uses DB enums (AgentStatus)
├── agent-detail.types.ts  # UI view models for AgentDetailModal
├── db-helpers.types.ts    # Generic DB transformation helpers
├── ... (remaining files)
```

## Remaining Work

### Phase 5: Remove Deprecated Cruft
1. **Create legacy directory**
   - `mkdir src/types/legacy`
   - Move deprecated fields from Commission interface
   - Add @deprecated JSDoc comments
   - Create migration helpers if needed

2. **Deprecated fields in Commission**:
   - `advanceAmount` → use `amount`
   - `paidDate` → use `paymentDate`
   - `created_at`/`updated_at` → use `createdAt`/`updatedAt`

### Phase 6: Add Validation Tests
- Create `src/types/__tests__/database-alignment.test.ts`
- Add compile-time type compatibility tests
- Verify UserProfile extends database row correctly

### Phase 7: Update All Imports
- Find remaining imports from old locations
- Update to use canonical sources
- Run type check: `npx tsc --noEmit`

### Phase 8: Verify & Deploy
- Run full build: `npm run build`
- Run tests: `npm run test:run`
- Merge branch to main
- Move plan to `plans/COMPLETED/`

## Pre-existing Issues (Not in Scope)

There are ~187 pre-existing TypeScript errors unrelated to this consolidation:
- Missing icon imports in various components
- Undefined variables in expense/email features
- RoleName type mismatches in admin components

These should be addressed in a separate cleanup task.

## Commands to Start

```bash
# Check current branch
git branch --show-current

# Check status
git status

# Continue with Phase 5
# 1. Create legacy directory
mkdir -p src/types/legacy

# 2. Check deprecated fields in commission.types.ts
grep -n "@deprecated" src/types/commission.types.ts
```

## Success Criteria

- [ ] Legacy directory created with deprecated types
- [ ] Database alignment tests added
- [ ] All imports updated to canonical sources
- [ ] `npx tsc --noEmit` shows no NEW errors (187 pre-existing)
- [ ] Build passes: `npm run build`
