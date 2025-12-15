# Continuation Prompt - December 15, 2025

## CRITICAL: Do NOT Make Any Code Changes Without Full Schema Verification

The previous session caused multiple regressions by making changes without properly verifying existing working code.

---

## Current Problems

### 1. Policy Edit Form - Client Data Not Populating
**Status:** BROKEN
**Symptoms:**
- Client name shows as "unknown"
- State is empty
- Age is empty
- Other fields (carrier, product, premium) DO populate

**Root Cause Investigation Needed:**
- The `clients` table does NOT have `state` or `age` columns directly
- Client data is stored as: `clients.address` = JSON string like `{"state":"GA","age":60}`
- The `PolicyRepository.transformFromDB` parses `address` JSON to extract state/age

### 2. Policy Update No Longer Updates Commission
**Status:** BROKEN (was working before this session)
**Symptoms:** When updating a policy, the commission is not updated

**Files Changed That May Have Caused This:**
- `src/services/commissions/CommissionRepository.ts` - transformToDB was modified
- `src/services/commissions/CommissionCalculationService.ts` - commission rate calculation changed

### 3. Commission Calculation May Be Wrong
**Status:** NEEDS VERIFICATION
**Original Problem:** Commission showing $18 instead of ~$1,755 for $195/mo policy
**Fix Applied:** Removed `/100` division since `commission_percentage` is stored as multiplier (1.0 = 100%)

---

## Files Modified This Session (All Uncommitted)

```
src/services/commissions/CommissionCRUDService.ts
src/services/commissions/CommissionCalculationService.ts
src/services/commissions/CommissionRepository.ts
src/services/policies/PolicyRepository.ts
src/services/policies/policyService.ts
src/services/settings/compGuideService.ts
src/features/policies/utils/policyFormTransformer.ts
src/types/policy.types.ts
supabase/migrations/20251215_001_comp_guide_rls_select_policy.sql (new)
supabase/migrations/20251215_002_fix_commissions_rls_insert_policy.sql (new)
```

---

## Database Schema (Verified from database.types.ts)

### clients table
```typescript
{
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  address: string | null  // ← JSON string: {"state":"GA","age":60}
  notes: string | null
  date_of_birth: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
}
```
**IMPORTANT:** NO direct `state` or `age` columns. They are stored in `address` JSON.

### commissions table
```typescript
{
  id: string
  policy_id: string | null
  user_id: string | null
  amount: number
  type: string
  status: string
  advance_months: number
  months_paid: number
  earned_amount: number
  unearned_amount: number | null
  last_payment_date: string | null
  payment_date: string | null
  notes: string | null
  chargeback_amount: number | null
  chargeback_date: string | null
  chargeback_reason: string | null
  created_at: string | null
  updated_at: string | null
}
```
**IMPORTANT:** NO `client`, `carrier_id`, `product`, `annual_premium`, `monthly_premium`, `rate`, `calculation_basis`, `expected_date`, `actual_date`, `month_earned`, `year_earned` columns.

### comp_guide table
- `commission_percentage` is stored as a MULTIPLIER (1.0 = 100%, 1.1 = 110%)
- NOT as percentage number (100, 110)

---

## What Was Working Before Session

1. **Policy Creation** - Created policy AND commission successfully
2. **Policy Update** - Updated policy AND updated commission
3. **Policy Edit Form** - Client name, state, age populated correctly
4. **Commission Calculation** - Amounts were correct

---

## What Needs To Be Done

### Step 1: Revert All Changes
```bash
git checkout HEAD -- src/services/commissions/CommissionRepository.ts
git checkout HEAD -- src/services/commissions/CommissionCRUDService.ts
git checkout HEAD -- src/services/commissions/CommissionCalculationService.ts
git checkout HEAD -- src/services/policies/PolicyRepository.ts
```

### Step 2: Re-Apply Only the RLS Fix
The RLS INSERT policy for commissions was a legitimate fix. Re-apply ONLY:
- `supabase/migrations/20251215_002_fix_commissions_rls_insert_policy.sql`

### Step 3: Investigate Commission Calculation Issue Separately
If commission amounts are still wrong after revert:
1. Query comp_guide to see actual `commission_percentage` values
2. Trace the calculation path WITHOUT modifying code
3. Determine if the issue is data or code

### Step 4: Test Everything Before Committing
- Create new policy → verify commission created
- Update policy → verify commission updated
- Edit policy → verify form populates correctly

---

## Database Connection

```bash
./scripts/migrations/apply-migration.sh /dev/stdin <<'EOF'
SELECT * FROM comp_guide LIMIT 5;
EOF
```

---

## Key Files to Understand

1. `src/services/policies/policyService.ts` - PolicyService.create() creates commission after policy
2. `src/services/commissions/CommissionCalculationService.ts` - calculateCommissionWithCompGuide()
3. `src/services/policies/PolicyRepository.ts` - transformFromDB() parses client address JSON
4. `src/services/commissions/CommissionRepository.ts` - transformToDB() maps fields for DB

---

## Rules for Next Session

1. **NEVER modify code without verifying the actual database schema first**
2. **ALWAYS query actual data to understand the data model**
3. **ALWAYS git diff before and after to see exactly what changed**
4. **TEST in browser after every change**
5. **If something was working, find out WHY before changing it**

---

## Original Issue That Started This Session

**Console Error:**
```
POST https://.../rest/v1/commissions?select=* 403 (Forbidden)
ERROR: new row violates row-level security policy for table "commissions"
```

**Root Cause:** RLS INSERT policy on commissions table was blocking authenticated users.

**Legitimate Fix Applied:** Created migration `20251215_002_fix_commissions_rls_insert_policy.sql` that adds:
```sql
CREATE POLICY "Authenticated users can create own commissions"
ON commissions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

This fix should be kept. Everything else should be reverted.
