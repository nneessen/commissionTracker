# Continuation: Agency Request Code Review Fixes

## Session Context

The agency request workflow was just implemented and underwent code review. This continuation addresses the critical and high-priority issues identified.

**Last Commit (not yet committed):** Agency request workflow implementation complete, needs fixes before commit.

---

## What Was Built (DO NOT REBUILD)

The following files exist and are functional:

### Database
- `supabase/migrations/20251221_004_agency_requests.sql` - Applied to production

### Backend
- `src/types/agency-request.types.ts`
- `src/services/agency-request/AgencyRequestRepository.ts`
- `src/services/agency-request/AgencyRequestService.ts`
- `src/services/agency-request/index.ts`

### Hooks
- `src/hooks/agency-request/useAgencyRequestQueries.ts`
- `src/hooks/agency-request/index.ts`

### UI
- `src/features/settings/agency-request/AgencyRequestPage.tsx`
- `src/features/settings/agency-request/components/RequestAgencySection.tsx`
- `src/features/settings/agency-request/components/RequestAgencyForm.tsx`
- `src/features/settings/agency-request/components/MyAgencyRequestStatus.tsx`
- `src/features/settings/agency-request/components/PendingApprovalsList.tsx`
- `src/features/settings/agency-request/components/index.ts`
- `src/features/settings/agency-request/index.ts`

### Modified
- `src/features/settings/SettingsDashboard.tsx` - Added Agency tab
- `src/services/index.ts` - Added agency-request export
- `src/hooks/index.ts` - Added agency-request export

---

## Code Review Fixes Required

### 1. CRITICAL: Fix hierarchy_path Matching (Priority 1)

**File:** `supabase/migrations/20251221_004_agency_requests.sql`
**Function:** `approve_agency_request()` at line ~207-211

**Current (BROKEN):**
```sql
UPDATE user_profiles
SET agency_id = v_new_agency_id,
    updated_at = now()
WHERE hierarchy_path LIKE '%' || v_request.requester_id::text || '%'
  AND id != v_request.requester_id;
```

**Problem:** This LIKE pattern can match partial UUIDs. If requester_id is `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`, it could match an unrelated agent whose hierarchy_path contains `aaaaaaaa-bbbb` as a substring of a different UUID.

**Fix Required:**
1. First, check what format `hierarchy_path` uses in the existing codebase
2. The pattern should use proper delimiters (likely `.` based on existing code)

**To Investigate:**
```bash
# Check hierarchy_path format
PGPASSWORD="..." psql "..." -c "SELECT hierarchy_path FROM user_profiles WHERE hierarchy_path IS NOT NULL LIMIT 5;"
```

**Likely Fix (if delimiter is `.`):**
```sql
WHERE (
  hierarchy_path LIKE '%.' || v_request.requester_id::text || '.%'
  OR hierarchy_path LIKE v_request.requester_id::text || '.%'
  OR hierarchy_path LIKE '%.' || v_request.requester_id::text
  OR hierarchy_path = v_request.requester_id::text
)
AND id != v_request.requester_id;
```

---

### 2. HIGH: RLS Policy Gap - Prevent Direct Field Manipulation (Priority 2)

**File:** `supabase/migrations/20251221_004_agency_requests.sql`
**Policy:** `"Approvers can review pending requests"` at line ~115-118

**Current (VULNERABLE):**
```sql
CREATE POLICY "Approvers can review pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (status IN ('approved', 'rejected'));
```

**Problem:** Approver could directly set `created_agency_id` to an arbitrary agency ID, bypassing the RPC function.

**Fix Required:** Create new migration to drop and recreate policy:

**File to Create:** `supabase/migrations/20251221_005_fix_agency_request_rls.sql`

```sql
-- Fix RLS policy to prevent direct field manipulation
-- Approvals must go through approve_agency_request() RPC

DROP POLICY IF EXISTS "Approvers can review pending requests" ON agency_requests;

CREATE POLICY "Approvers can reject pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    status = 'rejected'
    AND created_agency_id IS NULL
  );

-- Note: Approvals happen via SECURITY DEFINER function, not direct UPDATE
-- The function bypasses RLS, so no policy needed for approval path
```

---

### 3. HIGH: Race Condition on Agency Code (Priority 3)

**File:** `src/services/agency-request/AgencyRequestService.ts` at line ~117-126

**Current (RACE CONDITION):**
```typescript
// Check if agency code is available
const isCodeAvailable = await this.repo.isCodeAvailable(profile.imo_id, data.proposed_code);
if (!isCodeAvailable) {
  throw new Error(`Agency code "${data.proposed_code}" is already in use`);
}
// ... later creates request
```

**Problem:** Two users could check code availability simultaneously, both pass, then one fails on approval.

**Fix Options:**

**Option A (Recommended):** Add unique constraint on pending codes
```sql
-- Add to new migration 20251221_005_fix_agency_request_rls.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_requests_pending_code_unique
  ON agency_requests(imo_id, proposed_code)
  WHERE status = 'pending';
```
Then update service to catch duplicate key error gracefully.

**Option B:** Check code availability at approval time (already done in SQL function - this is the safety net)

The SQL function at line 171-178 already validates:
```sql
IF EXISTS (
  SELECT 1 FROM agencies
  WHERE imo_id = v_request.imo_id
  AND code = v_request.proposed_code
) THEN
  RAISE EXCEPTION 'Agency code "%" is already in use', v_request.proposed_code;
END IF;
```

So the race condition won't cause data corruption, just a confusing error at approval time. Still worth fixing for better UX.

---

## Medium Priority Fixes (Optional This Session)

### 4. Remove Redundant updated_at in Repository

**File:** `src/services/agency-request/AgencyRequestRepository.ts` at line ~205-208

Remove manual `updated_at` since trigger handles it:
```typescript
// Before
.update({
  status: 'cancelled',
  updated_at: new Date().toISOString(), // REMOVE THIS
})
```

### 5. Add Performance Index for hierarchy_path

```sql
-- Add to migration
CREATE INDEX IF NOT EXISTS idx_user_profiles_hierarchy_path_gin
  ON user_profiles USING gin (hierarchy_path gin_trgm_ops);
-- Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## Implementation Order

1. **Investigate** hierarchy_path format in existing data
2. **Create** new migration `20251221_005_fix_agency_request_rls.sql` with:
   - Fixed RLS policy
   - Unique constraint on pending codes
   - Updated approve function with correct LIKE pattern
3. **Apply** migration
4. **Regenerate** types: `npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts`
5. **Update** repository to remove redundant `updated_at`
6. **Build** and verify: `npm run build`
7. **Commit** all changes

---

## Commands to Start

```bash
# Check hierarchy_path format
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT id, hierarchy_path FROM user_profiles WHERE hierarchy_path IS NOT NULL LIMIT 5;"

# Verify current state
git status
npm run build
```

---

## Success Criteria

- [ ] hierarchy_path matching uses proper delimiters
- [ ] RLS policy prevents direct `created_agency_id` manipulation
- [ ] Unique constraint prevents duplicate pending codes
- [ ] `npm run build` passes
- [ ] All changes committed
