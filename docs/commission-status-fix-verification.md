# Commission Status Update Fix - Verification Guide

## Summary of Changes

Fixed critical bug in commission status updates where amounts were not recalculating correctly.

### Files Modified
- `src/hooks/commissions/useUpdateCommissionStatus.ts` (lines 26-108)
- `src/hooks/commissions/__tests__/useUpdateCommissionStatus.test.ts` (NEW FILE - comprehensive test coverage)

---

## The Bug

### Root Cause
The `useUpdateCommissionStatus` hook was only updating the `status` field in the commission record, **without updating `months_paid`**. The database trigger `trigger_update_commission_earned` only fires when `months_paid`, `amount`, or `advance_months` change, so earned/unearned amounts were never recalculated.

### Symptoms
1. **"Paid" status didn't work**: Status changed to 'paid' but earned_amount stayed 0
2. **"Pending→Cancelled→Pending" double-counted**: Chargeback amounts persisted when switching back to pending
3. **Metrics showed wrong data**: KPIs displayed incorrect earned/unearned amounts across the entire app

---

## The Fix

### What Changed
The hook now properly sets `months_paid` based on the selected status, which triggers the database to recalculate all amounts automatically:

#### When Status = "Paid"
```typescript
months_paid = advance_months  // Fully earned
chargeback_amount = 0         // Clear any chargebacks
chargeback_date = null
chargeback_reason = null
payment_date = current_date   // Mark as paid
```

**Result**: Database trigger calculates:
- `earned_amount = amount` (fully earned)
- `unearned_amount = 0` (nothing left to earn)

#### When Status = "Pending"
```typescript
months_paid = 0              // Nothing earned yet
chargeback_amount = 0        // Clear any chargebacks
chargeback_date = null
chargeback_reason = null
payment_date = null
```

**Result**: Database trigger calculates:
- `earned_amount = 0` (nothing earned)
- `unearned_amount = amount` (all unearned)

#### When Status = "Cancelled"
```typescript
months_paid = 0
// Policy status change triggers calculate_chargeback_on_policy_lapse()
```

---

## Manual Testing Procedure

### Prerequisites
1. Dev server running: `http://localhost:3001/`
2. At least one policy with a commission in the database

### Test 1: Set Commission to "Paid"

**Steps:**
1. Navigate to Policies page
2. Find a policy with commission status "Pending"
3. Note the current values:
   - Advance Amount (should be > 0)
   - Earned Amount (should be 0)
   - Unearned Amount (should equal Advance Amount)
4. Change commission status dropdown to "Paid"
5. Wait for the update to complete (page will refresh)

**Expected Results:**
- ✅ Status shows "Paid" (green badge)
- ✅ Earned Amount = Advance Amount
- ✅ Unearned Amount = 0
- ✅ Chargeback Amount = 0
- ✅ Policy status = "Active"
- ✅ Dashboard KPIs update to reflect paid commission

### Test 2: Set Commission to "Pending"

**Steps:**
1. Find a policy with commission status "Paid" (from Test 1)
2. Change commission status dropdown to "Pending"
3. Wait for the update to complete

**Expected Results:**
- ✅ Status shows "Pending" (yellow badge)
- ✅ Earned Amount = 0
- ✅ Unearned Amount = Advance Amount
- ✅ Chargeback Amount = 0
- ✅ Policy status = "Pending"
- ✅ Dashboard KPIs update to reflect pending commission

### Test 3: Transition Cancelled → Pending (Bug Fix)

**Steps:**
1. Find a policy with commission status "Cancelled" OR manually cancel one
2. Note if there's a chargeback amount > 0
3. Change commission status dropdown to "Pending"
4. Wait for the update to complete

**Expected Results:**
- ✅ Status shows "Pending"
- ✅ Chargeback Amount = 0 (CLEARED!)
- ✅ Earned Amount = 0
- ✅ Unearned Amount = Advance Amount
- ✅ No "double counting" of amounts
- ✅ Policy status = "Pending"

### Test 4: Full Status Cycle

**Steps:**
1. Start with a "Pending" commission
2. Change to "Paid" → verify amounts
3. Change to "Pending" → verify amounts
4. Change to "Cancelled" → verify chargeback calculated
5. Change back to "Pending" → verify chargeback CLEARED
6. Change to "Paid" → verify fully earned

**Expected Results:**
- ✅ Each transition updates amounts correctly
- ✅ No amounts "stick" from previous states
- ✅ KPIs across the entire app reflect the current state

---

## Database Verification

### Check Commission Record Directly

```sql
-- Before status update
SELECT
  id,
  status,
  amount,
  months_paid,
  advance_months,
  earned_amount,
  unearned_amount,
  chargeback_amount
FROM commissions
WHERE policy_id = '<YOUR_POLICY_ID>';

-- After changing to "Paid"
-- months_paid should equal advance_months
-- earned_amount should equal amount
-- unearned_amount should be 0

-- After changing to "Pending"
-- months_paid should be 0
-- earned_amount should be 0
-- unearned_amount should equal amount
-- chargeback_amount should be 0
```

---

## KPI Verification Across the App

After each status change, verify that these metrics update correctly:

### Dashboard Cards
- ✅ Total Commissions Earned
- ✅ Total Unearned
- ✅ Commission Earning Summary
- ✅ At-Risk Commissions

### Commission Detail Views
- ✅ Earned Amount column
- ✅ Unearned Amount column
- ✅ Chargeback Amount column
- ✅ Status badges (color and text)

### Reports/Analytics
- ✅ Commission earning reports
- ✅ Chargeback summaries
- ✅ At-risk commission lists

---

## Automated Test Coverage

Created comprehensive tests in:
`src/hooks/commissions/__tests__/useUpdateCommissionStatus.test.ts`

**Test Cases:**
1. ✅ Update to "paid" status sets months_paid = advance_months
2. ✅ Update to "pending" status sets months_paid = 0
3. ✅ Chargeback fields cleared when transitioning to pending
4. ✅ Policy status updates correctly based on commission status
5. ✅ Error handling for failed updates

**Run tests:**
```bash
npm test useUpdateCommissionStatus
```

---

## Rollback Instructions

If issues occur, revert the changes:

```bash
git checkout HEAD~1 -- src/hooks/commissions/useUpdateCommissionStatus.ts
git checkout HEAD~1 -- src/hooks/commissions/__tests__/useUpdateCommissionStatus.test.ts
```

---

## Technical Details

### Database Triggers Involved

1. **`trigger_update_commission_earned`** (commissions table)
   - Fires BEFORE INSERT OR UPDATE OF `months_paid`, `amount`, `advance_months`
   - Calls `update_commission_earned_amounts()` function
   - Recalculates `earned_amount` and `unearned_amount`

2. **`trigger_update_commission_status`** (policies table)
   - Fires AFTER UPDATE OF `status` on policies
   - Calls `update_commission_on_policy_status()` function
   - Handles policy → commission status cascades

### Calculation Formulas

```typescript
// Earned Amount Formula
monthly_earning_rate = amount / advance_months
earned_amount = monthly_earning_rate * months_paid

// Unearned Amount Formula
unearned_amount = amount - earned_amount

// Examples:
// Pending: months_paid=0 → earned=0, unearned=amount
// Paid: months_paid=9 → earned=amount, unearned=0
// Partial: months_paid=5, advance=9 → earned=(amount/9)*5, unearned=(amount/9)*4
```

---

## Success Criteria

✅ **All manual tests pass**
✅ **Automated tests pass**
✅ **No TypeScript errors**
✅ **KPIs update correctly across the entire app**
✅ **No console errors when changing statuses**
✅ **Database records show correct calculated amounts**

---

## Questions or Issues?

If you encounter any problems:
1. Check the browser console for errors
2. Verify database triggers are in place (see migrations)
3. Test with a fresh policy/commission record
4. Review the database directly with SQL queries above

**Important**: This fix relies on the database triggers being correctly installed from the migrations. If triggers are missing, the amount calculations will not work.
