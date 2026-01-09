# AI Underwriting Wizard - Code Review Fixes

## Context
Phase 2 of the AI Underwriting Wizard has been implemented but requires fixes based on code review findings. This prompt addresses critical, high, and medium priority issues.

## Branch
`feature/underwriting-wizard`

## Critical Issues (Must Fix)

### 1. Race Condition in `useSetDefaultDecisionTree`
**File**: `src/features/underwriting/hooks/useDecisionTrees.ts:200-230`

**Problem**: Non-atomic operation - if second query fails, no default tree exists.

**Fix**: Create an RPC function in Supabase that handles this atomically:
```sql
-- Migration: 20260109_003_set_default_decision_tree_rpc.sql
CREATE OR REPLACE FUNCTION set_default_decision_tree(
  p_tree_id UUID,
  p_imo_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Unset all defaults and set new one in single transaction
  UPDATE underwriting_decision_trees
  SET is_default = (id = p_tree_id)
  WHERE imo_id = p_imo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then update the hook to use the RPC.

### 2. Security: String Interpolation in Query
**File**: `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx:61`

**Problem**: `.or(\`imo_id.eq.${imoId},imo_id.is.null\`)` - String interpolation is risky.

**Fix**: Use proper Supabase filter syntax:
```typescript
.or('imo_id.is.null')
.eq('imo_id', imoId)
// OR use the in() operator with proper parameterization
```

### 3. Missing Repository Layer
**Problem**: `useDecisionTrees.ts` makes direct Supabase calls, violating the established BaseRepository pattern.

**Fix**: Create `src/services/underwriting/decisionTreeRepository.ts`:
- Extend `BaseRepository<DecisionTree, DecisionTreeCreate, DecisionTreeUpdate>`
- Implement `transformFromDB()` and `transformToDB()`
- Move all Supabase operations to repository
- Update hooks to use repository

---

## High Priority Issues

### 4. Extract Inline Hook to Proper Location
**File**: `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx:37-78`

**Problem**: `useCarriersWithProducts` is defined inside the component file.

**Fix**:
- Create `src/features/underwriting/hooks/useCarriersWithProducts.ts`
- Export from hooks index
- Import in DecisionTreeEditor

### 5. Replace window.confirm with Dialog
**File**: `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx:175`
**File**: `src/features/underwriting/components/DecisionTreeEditor/RuleBuilder.tsx` (similar usage)

**Problem**: `window.confirm` is blocking and poor UX.

**Fix**: Use the existing AlertDialog component pattern from the codebase.

### 6. Add Input Validation/Sanitization
**File**: `src/features/underwriting/components/DecisionTreeEditor/RuleConditionRow.tsx`

**Problem**: User input goes directly into rule JSON without validation.

**Fix**:
- Add validation for numeric inputs (handle NaN, empty, out-of-range)
- Sanitize text inputs before storing
- Add proper error states for invalid inputs

---

## Medium Priority Issues

### 7. Memoize Expensive Computations
**File**: `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx:140-153`

**Problem**: JSON.stringify comparison on every render for change detection.

**Fix**: Use `useMemo` with proper dependencies or implement shallow comparison for top-level changes.

### 8. Extract Duplicated Types
**Files**:
- `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx`
- `src/features/underwriting/components/DecisionTreeEditor/RuleActionConfig.tsx`

**Problem**: `CarrierWithProducts` interface is duplicated.

**Fix**:
- Add to `src/features/underwriting/types/underwriting.types.ts`
- Export and import in both files

### 9. Extract Switch Statement to Utility
**File**: `src/features/underwriting/components/DecisionTreeEditor/RuleConditionRow.tsx:83-104`

**Problem**: `getOperatorsForField` logic is coupled to UI component.

**Fix**: Move to `src/features/underwriting/utils/ruleUtils.ts` for testability.

### 10. Add Query Limits
**File**: `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx:47-58`

**Problem**: Fetches all carriers with all products without pagination.

**Fix**: Add `.limit(100)` or implement pagination if carrier count could exceed reasonable limits.

---

## Implementation Order

1. **Create migration for RPC** (Critical #1)
2. **Create DecisionTreeRepository** (Critical #3)
3. **Fix string interpolation** (Critical #2)
4. **Extract useCarriersWithProducts hook** (High #4)
5. **Add input validation** (High #6)
6. **Replace window.confirm** (High #5)
7. **Memoization & type extraction** (Medium #7, #8)
8. **Extract utilities** (Medium #9, #10)

---

## Files to Create
```
supabase/migrations/20260109_003_set_default_decision_tree_rpc.sql
src/services/underwriting/decisionTreeRepository.ts
src/features/underwriting/hooks/useCarriersWithProducts.ts
src/features/underwriting/utils/ruleUtils.ts
```

## Files to Modify
```
src/features/underwriting/hooks/useDecisionTrees.ts
src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx
src/features/underwriting/components/DecisionTreeEditor/RuleConditionRow.tsx
src/features/underwriting/components/DecisionTreeEditor/RuleActionConfig.tsx
src/features/underwriting/components/DecisionTreeEditor/RuleBuilder.tsx
src/features/underwriting/types/underwriting.types.ts
src/features/underwriting/hooks/index.ts
```

---

## Validation Checklist
After fixes:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Migration applied: `scripts/apply-migration.sh`
- [ ] Types regenerated: `npx supabase gen types typescript --project-id <id> > src/types/database.types.ts`
- [ ] No direct Supabase calls in hooks (use repository)
- [ ] No string interpolation in queries
- [ ] All hooks in proper `/hooks` directories
- [ ] Duplicated types removed

---

## To Continue
```
Fix code review issues for the AI Underwriting Wizard on branch feature/underwriting-wizard.

See plans/active/underwriting-wizard-code-review-fixes.md for the full list of issues and fixes.

Priority order:
1. Create RPC migration for atomic set-default operation
2. Create DecisionTreeRepository following BaseRepository pattern
3. Fix security issue with string interpolation in query
4. Extract inline hook to proper location
5. Add input validation to RuleConditionRow
6. Replace window.confirm with AlertDialog

Read the code review fixes file first, then implement in order.
```
