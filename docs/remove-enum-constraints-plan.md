# Database Constraint Cleanup Plan
**Remove All Enum-Style CHECK Constraints**

---

## Executive Summary

**Problem**: 18+ enum-style CHECK constraints on TEXT fields make it painful to add/modify enum values. Every time we want to add a new phase, status, or document type, we need a database migration.

**Solution**: Remove all enum-style constraints and rely on TypeScript type validation at the application layer.

**Risk Level**: ⚠️ **VERY LOW**
- TypeScript validation already exists and is working
- Single-user application with controlled access
- Constraints are redundant, not the primary defense
- No existing data will be affected (it's already valid)

**Time Estimate**: ~30 minutes total

**Immediate Benefit**: No more constraint violation errors when adding new enum values

**Long-term Benefit**: Flexible, maintainable codebase that evolves without database migrations for simple value changes

---

## Constraints Analysis

### ✅ Already Removed

1. **`user_profiles.onboarding_status`**
   - Fixed: 2025-11-28
   - Migration: `20251129000407_remove_onboarding_status_constraint.sql`

### 🔴 To Remove (18 constraints)

#### Recruiting/Onboarding System (11 constraints)

| Table | Column | Current Values | Reason to Remove |
|-------|--------|---------------|------------------|
| `user_profiles` | `approval_status` | 'pending', 'approved', 'denied' | May add more statuses |
| `onboarding_phases` | `phase_name` | 'Interview 1', 'Zoom Interview', etc. | User may customize phases |
| `onboarding_phases` | `status` | 'not_started', 'in_progress', 'completed', 'blocked' | May add more statuses |
| `user_documents` | `document_type` | 'application', 'background_check', 'license', etc. | May add custom doc types |
| `user_documents` | `status` | 'pending', 'received', 'approved', 'rejected', 'expired' | May add more statuses |
| `user_emails` | `status` | 'draft', 'sending', 'sent', 'delivered', 'opened', 'failed' | May add more statuses |
| `user_activity_log` | `action_type` | 'created', 'updated', 'deleted', etc. | New actions over time |
| `phase_checklist_items` | `item_type` | 'document_upload', 'task_completion', etc. | May add custom types |
| `phase_checklist_items` | `can_be_completed_by` | 'recruit', 'upline', 'system' | May add more roles |
| `phase_checklist_items` | `verification_by` | 'upline', 'system' | May add more roles |
| `recruit_phase_progress` | `status` | 'not_started', 'in_progress', 'completed', 'blocked', 'skipped' | May add more statuses |

#### Pipeline System (2 constraints)

| Table | Column | Current Values | Reason to Remove |
|-------|--------|---------------|------------------|
| `recruit_checklist_progress` | `status` | 'not_started', 'in_progress', 'completed', 'approved', 'rejected', 'needs_resubmission' | May add more statuses |
| `pipeline_phases` | `required_approver_role` | 'upline', 'admin', 'system' | May add more roles |

#### Hierarchy System (1 constraint)

| Table | Column | Current Values | Reason to Remove |
|-------|--------|---------------|------------------|
| `hierarchy_invitations` | `status` | 'pending', 'accepted', 'denied', 'cancelled', 'expired' | May add more statuses |

#### Expenses System (1 constraint)

| Table | Column | Current Values | Reason to Remove |
|-------|--------|---------------|------------------|
| `expenses` | `recurring_frequency` | 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually' | May add custom frequencies |

#### RBAC System (2 constraints)

| Table | Column | Current Pattern | Reason to Remove |
|-------|--------|----------------|------------------|
| `rbac_roles` | `name` | Regex: `^[a-z_]+$` (snake_case only) | Overly restrictive naming |
| `rbac_permissions` | `code` | Regex: `^[a-z_.]+$` | Overly restrictive format |

#### User Profiles (1 constraint)

| Table | Column | Current Pattern | Reason to Remove |
|-------|--------|----------------|------------------|
| `user_profiles` | `phone` | Phone number regex | Different formats needed |

**Total: 18 constraints to remove**

---

### ✅ To Keep (Valid Business Rules)

These constraints enforce actual business logic, not enum values:

| Type | Examples | Reason to Keep |
|------|----------|----------------|
| **NOT NULL** | Required fields | Data integrity |
| **UNIQUE** | Email uniqueness | Prevent duplicates |
| **FOREIGN KEY** | All reference constraints | Referential integrity |
| **Numeric Ranges** | `contract_level BETWEEN 80 AND 145` | Business rule |
| **Non-negative** | `amount >= 0`, `commission >= 0` | Mathematical validity |
| **Self-reference** | `recruiter_id != id`, `upline_id != id` | Logical impossibility |
| **Positive integers** | `phase_order > 0`, `item_order > 0` | Ordering logic |

---

## Migration Strategy

### Approach: Single Comprehensive Migration

**File**: `supabase/migrations/20251129_remove_all_enum_check_constraints.sql`

**Strategy**:
- Drop all 18 constraints in one transaction
- Use `DROP CONSTRAINT IF EXISTS` for idempotency
- Group by table for readability
- Document original constraints in comments (for reference)
- Include clear explanation of WHY

**Advantages**:
- ✅ Single atomic operation
- ✅ Easier to track and verify
- ✅ One entry in migration history
- ✅ Can re-run if needed (idempotent)
- ✅ Clear documentation in one place

---

## Execution Plan

### Phase 1: Discovery (5 minutes)

**Goal**: Get exact constraint names from production database

```sql
-- Query to find all CHECK constraints on our tables
SELECT
  tc.table_name,
  tc.constraint_name,
  pg_get_constraintdef(c.oid) as constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON c.conname = tc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'user_profiles',
    'onboarding_phases',
    'user_documents',
    'user_emails',
    'user_activity_log',
    'phase_checklist_items',
    'recruit_phase_progress',
    'recruit_checklist_progress',
    'expenses',
    'hierarchy_invitations',
    'pipeline_phases',
    'rbac_roles',
    'rbac_permissions'
  )
  -- Exclude numeric range constraints
  AND pg_get_constraintdef(c.oid) NOT LIKE '%>= 0%'
  AND pg_get_constraintdef(c.oid) NOT LIKE '%BETWEEN%'
  AND pg_get_constraintdef(c.oid) NOT LIKE '%!=%'
ORDER BY tc.table_name, tc.constraint_name;
```

**Action**: Save output to use in migration

---

### Phase 2: Migration Creation (10 minutes)

**Goal**: Create comprehensive migration file

**Structure**:
```sql
-- Header comment explaining the change
-- Table of contents
-- Original constraint definitions (commented)
BEGIN;

-- user_profiles table
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_approval_status_check,
DROP CONSTRAINT IF EXISTS user_profiles_phone_check;

-- onboarding_phases table
ALTER TABLE public.onboarding_phases
DROP CONSTRAINT IF EXISTS onboarding_phases_phase_name_check,
DROP CONSTRAINT IF EXISTS onboarding_phases_status_check;

-- ... (continue for all tables)

COMMIT;

-- Verification query
-- Comments documenting what was removed
```

---

### Phase 3: Documentation Updates (5 minutes)

#### A. Update `docs/bugs.md`

```markdown
## ✅ FIXED: All Enum-Style CHECK Constraints Removed (2025-11-28)

**Migration**: `20251129_remove_all_enum_check_constraints.sql`
**Constraints Removed**: 18 enum-style TEXT constraints
**Validation**: Now handled at TypeScript layer only

All status, type, and enum-style constraints have been removed for flexibility.
```

#### B. Update `CLAUDE.md`

Add to "Project rules (must-follow)" section:

```markdown
## Database Constraint Philosophy

**DO NOT create enum-style CHECK constraints on TEXT fields**

❌ BAD:
```sql
ALTER TABLE foo ADD COLUMN status TEXT CHECK (status IN ('active', 'inactive'));
```

✅ GOOD:
```sql
ALTER TABLE foo ADD COLUMN status TEXT; -- Validation in TypeScript
```

**When to use database constraints:**
- ✅ Foreign keys (referential integrity)
- ✅ NOT NULL (required fields)
- ✅ UNIQUE (prevent duplicates)
- ✅ Numeric ranges for business rules (e.g., `contract_level BETWEEN 80 AND 145`)
- ✅ Non-negative amounts (e.g., `amount >= 0`)
- ✅ Self-reference prevention (e.g., `recruiter_id != id`)

**When NOT to use database constraints:**
- ❌ Enum-style TEXT validation (use TypeScript types)
- ❌ Pattern matching (email, phone formats)
- ❌ Business logic that may evolve
- ❌ Any validation that might need to change without a migration

**Reason**: TypeScript provides compile-time safety AND runtime flexibility. Database constraints add friction without adding value in a single-user application.
```

#### C. Add Comments to Type Files

In `src/types/recruiting.ts`, add:

```typescript
// NOTE: These enum types are enforced at the APPLICATION LAYER only.
// The database accepts any TEXT value for flexibility.
// Always use these types in your code to maintain data consistency.

export type OnboardingStatus =
  | 'interview_1'
  | 'zoom_interview'
  // ...
```

---

### Phase 4: Execution (2 minutes)

```bash
# Apply migration
./scripts/apply-migration.sh supabase/migrations/20251129_remove_all_enum_check_constraints.sql
```

**Expected output**:
```
✅ Migration Applied Successfully!
```

---

### Phase 5: Verification (5 minutes)

#### A. Database Verification

```sql
-- Should return 0 rows (or only the valid constraints we kept)
SELECT
  table_name,
  constraint_name
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK'
  AND table_schema = 'public'
  AND constraint_name LIKE '%status%check'
   OR constraint_name LIKE '%type%check';
```

#### B. Application Testing

Test these workflows to ensure TypeScript validation still works:

1. **Add Recruit** (tests onboarding_status, document_type)
   - Open `/recruiting`
   - Click "Add Recruit"
   - Fill form with valid data
   - Submit → Should work ✅

2. **Upload Document** (tests document_type, status)
   - Navigate to recruit detail
   - Upload a document
   - Verify it appears with correct type ✅

3. **Create Expense** (tests recurring_frequency)
   - Open `/expenses`
   - Create recurring expense
   - Verify frequency options work ✅

4. **TypeScript Validation Check**
   - Try to set invalid value in code: `onboarding_status: 'invalid_value'`
   - TypeScript should error at compile time ✅

#### C. Edge Case Testing (Optional)

Test that database now accepts any value (for flexibility):

```sql
-- This should now work (before it would fail)
INSERT INTO user_profiles (...)
VALUES (..., onboarding_status = 'custom_phase', ...);
```

This proves we have flexibility. Delete test row after.

---

## Rollback Plan

**Recommendation**: No rollback needed.

**Reasoning**:
- Constraints were redundant with TypeScript validation
- If issues arise, fix in application layer, not database
- Can't break existing data (it's already valid)

**If rollback is absolutely required**:
1. Check for any invalid data inserted after constraint removal
2. Fix invalid data with UPDATE statements
3. Re-add constraints (definitions stored in migration comments)
4. This should be extremely rare and only for unexpected issues

---

## Future Prevention

### For Claude Code

Updated rules in `CLAUDE.md` prevent re-introduction:
- Explicit "DO NOT create enum-style CHECK constraints" rule
- Clear guidelines on when to use constraints
- Code review checklist includes constraint check

### For Future Developers

Migration file includes comprehensive comments explaining:
- WHY constraints were removed
- WHEN to use database constraints
- WHERE validation happens (TypeScript layer)

### For Migrations

Template comment to add to future migrations:

```sql
-- CONSTRAINT POLICY:
-- Do NOT add CHECK constraints for enum-style TEXT validation.
-- Use TypeScript types instead.
-- Only add constraints for: foreign keys, NOT NULL, UNIQUE, numeric ranges, self-references.
```

---

## Benefits Summary

### Immediate Benefits

✅ **No more constraint violation errors**
- AddRecruitDialog now works
- Can add custom phases, statuses, types without migrations

✅ **Faster iteration**
- Add new enum values in TypeScript only
- No database migration needed for simple value additions

### Long-term Benefits

✅ **Flexibility**
- Easy to experiment with new workflows
- Easy to customize for specific needs
- No friction for business logic evolution

✅ **Maintainability**
- Fewer migrations to track
- Clearer separation: DB = structure, TypeScript = validation
- Easier to onboard new developers

✅ **Code Quality**
- TypeScript types are first-class citizens
- Compile-time safety
- Better IDE support

### Risk Mitigation

✅ **TypeScript validation prevents bad data**
- Forms validate at input
- Services use typed parameters
- Compile-time checks prevent typos

✅ **Single-user application**
- Controlled access
- No untrusted input sources
- Easy to audit data if needed

✅ **No data loss**
- Existing data remains valid
- Can always add constraints back if truly needed (unlikely)

---

## Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Query database for constraint names | 5 min | ⏳ Pending |
| 2 | Create migration file | 10 min | ⏳ Pending |
| 3 | Update documentation | 5 min | ⏳ Pending |
| 4 | Execute migration | 2 min | ⏳ Pending |
| 5 | Verify & test | 5 min | ⏳ Pending |
| 6 | Update bugs.md | 3 min | ⏳ Pending |
| **TOTAL** | | **30 min** | |

---

## Recommendation

**✅ PROCEED WITH FULL REMOVAL**

This is the right move for a rapidly-evolving, single-user application. The constraints provide no real value (TypeScript already validates) and add significant friction.

**Next Steps**:
1. Run Phase 1 discovery query
2. Create comprehensive migration
3. Execute and verify
4. Update documentation
5. Enjoy flexibility! 🎉

---

## Questions?

**Q: What if we need to enforce database-level validation?**
A: Use TypeScript. For a single-user app, application-layer validation is sufficient and more flexible.

**Q: What about data integrity?**
A: Foreign keys, NOT NULL, and UNIQUE constraints still enforce integrity. Enum values are business logic, not integrity.

**Q: Can bad data get in?**
A: Only via direct SQL (which you control). All application code uses TypeScript types.

**Q: What if I want to add constraints back later?**
A: All original definitions are documented in the migration file. But you likely won't need to.

**Q: Is this standard practice?**
A: For agile, single-user applications: YES. For multi-tenant systems with untrusted input: Maybe not. Know your use case.
