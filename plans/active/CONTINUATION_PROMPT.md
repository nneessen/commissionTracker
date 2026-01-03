# Comprehensive Continuation Prompt - Commission Tracker

**Date**: 2026-01-03
**Last Session**: Fixed commission amount display bug ($2,233 → $1,758)

---

## COMPLETED THIS SESSION

### Commission Amount Fix ✅
- **Issue**: Dashboard showed $2,233 instead of $1,758
- **Root Cause**: `useCommissions()` hook fetched ALL users' commissions instead of current user only
- **Fix Applied**:
  1. `src/hooks/commissions/useCommissions.ts` - Added user_id filtering via `useAuth()`
  2. `src/services/commissions/CommissionRepository.ts` - Fixed column name in `findByAgent()` (expected_date → created_at)
- **Status**: VERIFIED WORKING

---

## PENDING ISSUES (Priority Order)

### 1. Policy Edit Form Not Working (P0 - CRITICAL)

**Location**: `src/features/policies/`

**Issue 1: Update Button Does Nothing**
- User clicks edit on a policy
- Dialog opens
- User clicks "Update" → NOTHING HAPPENS
- No console logs, no network requests, dialog stays open

**Issue 2: Form Fields Not Pre-Populated**
- When opening edit dialog for existing policy
- All form fields are EMPTY (carrier, product, premium not selected)
- User has to re-enter everything

**Expected Behavior**:
1. Click edit on policy → Dialog opens with ALL fields pre-populated
2. Change premium → Click Update → Dialog closes, policy updates, commission recalculates

**Key Files**:
- `src/features/policies/components/PolicyDialog.tsx` (lines 44-52)
- `src/features/policies/components/PolicyForm.tsx` (lines 76-105)
- `src/features/policies/PolicyDashboard.tsx` (lines 64-111)

**Data Flow to Debug**:
```
PolicyList (edit button click)
  → PolicyDashboard.handleEditPolicy(policyId)
    → setEditingPolicyId(policyId)
    → setIsPolicyFormOpen(true)
      → PolicyDialog renders with policyId={editingPolicyId}
        → PolicyForm receives policyId and getPolicyById
          → useEffect runs, calls getPolicyById(policyId)
            → Should return policy object
              → setFormData with policy values
```

**Debug Steps**:
1. Add console.log in PolicyDialog to verify policyId is passed
2. Add console.log in PolicyForm useEffect to see if policy is found
3. Check if getPolicyById returns the policy in PolicyDashboard
4. Verify form onSubmit is called when Update is clicked

---

### 2. Carrier Advance Cap Not Persisting (P1)

**Location**: Settings → Carriers

**Issue**: When editing carriers, `advance_cap` and `imo_id` fields do NOT persist after save.
- Form displays values correctly when editing
- User changes them, clicks save
- Toast shows "Carrier updated successfully"
- Values revert to original

**Key Files**:
- `src/features/settings/carriers/CarriersManagement.tsx:64-72`
- `src/features/settings/carriers/components/CarrierForm.tsx:39-48`
- `src/features/settings/carriers/hooks/useCarriers.ts:67-87`
- `src/services/settings/carriers/CarrierService.ts:140-159`

**Likely Culprits**:
1. Form schema mismatch between zod and mutation
2. Type coercion issue (advance_cap returns string, needs number)
3. Undefined vs null filtering in service
4. RLS policy blocking column updates

**Debug Steps**:
1. Check Network tab - does PATCH request include advance_cap and imo_id?
2. Add console.log in CarrierForm handleSubmit
3. Add console.log in useCarriers mutation
4. Verify CarrierService.updateFromForm is sending correct data

---

### 3. Slack Policy Notification Code Review (P2)

**Status**: Needs code review before deployment

**Changes Made**:
- New migration: `supabase/migrations/20260102_005_fix_slack_hierarchy_leaderboard.sql`
- Edge function: `supabase/functions/slack-policy-notification/index.ts`
- Added `hierarchy_depth` column to `daily_sales_logs`
- Conditional leaderboard logic based on hierarchy_depth

**Review Focus**:
1. Does hierarchy_depth check correctly identify direct agency vs parent/IMO?
2. What happens if hierarchy_depth is undefined/null?
3. Is first-sale early-exit for parent/IMO integrations correct?
4. Is migration safe to run on production?

---

### 4. Registration Debug (P1 - MAY BE RESOLVED)

**Context**: `plans/active/registration-invite-system-fixes.md` shows COMPLETED
But `plans/active/CONTINUE_REGISTRATION_DEBUG.md` mentions:
- React Query hook `useInvitationByToken` may have issues
- Frontend service NOT updated to match new RPC signature

**Verify Before Considering Complete**:
1. Test sending a new invite
2. Test clicking the registration link
3. Verify form loads and submits correctly
4. Check if frontend matches new RPC signature

---

## DEAD CODE TO CLEAN UP

Found during commission investigation:
- `CommissionAnalyticsService.getCommissionMetrics()` queries non-existent columns:
  - `commission_amount` (actual: `amount`)
  - `commission_rate` (doesn't exist in commissions table)
  - `is_auto_calculated` (doesn't exist)
- This method is NOT called anywhere - consider removing or fixing

---

## QUICK REFERENCE

### Start Dev Server
```bash
npm run dev
```

### Run Typecheck
```bash
npm run typecheck
```

### Database Query
```bash
PGPASSWORD='N123j234n345!$!$' psql -h aws-1-us-east-2.pooler.supabase.com -p 6543 -U postgres.pcyaqwodnyrpkaiojnpz -d postgres -c "YOUR_QUERY"
```

### Apply Migration
```bash
./scripts/apply-migration.sh supabase/migrations/FILENAME.sql
```

---

## ARCHITECTURE REMINDERS

1. **Single Source of Truth**: Database types in `src/types/database.types.ts`
2. **Commission Calculation**: Use `CommissionLifecycleService.calculateAdvance()` - formula is `monthlyPremium * advanceMonths * commissionRate`
3. **User Filtering**: Always filter by user_id in hooks that fetch user-specific data
4. **No Mock Data**: Real data only, no placeholders
5. **Plan Location**: Active plans in `plans/active/`, completed in `plans/completed/`

---

## SESSION START CHECKLIST

1. Activate project: `mcp__serena__activate_project("commissionTracker")`
2. Check onboarding: `mcp__serena__check_onboarding_performed()`
3. Read relevant memories if needed
4. Pick highest priority issue to work on
5. Create todo list before starting

---

## USER PREFERENCES (from CLAUDE.md)

- Compact, professional, data-dense UI
- No over-engineering
- Test as you build
- Comment file paths at top of files
- No documentation files unless requested
- Git: Never commit unless asked
