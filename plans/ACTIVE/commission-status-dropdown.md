# Commission Status Dropdown - Implementation Plan

## User Requirement
Add a dropdown in the policies table to update commission status directly from each row.

## What the User Wants

### Policies Table - Commission Status Column
Each row needs:
- **Status Dropdown** - Simple select element to change commission status
- **Options**: pending, earned, paid, charged_back, cancelled
- **Behavior**:
  - Select new status → update commission immediately
  - For "charged_back" → prompt for months paid first (via modal), then calculate and apply chargeback

### NO Complex Components
- ❌ No separate "PolicyStatusActions" component
- ❌ No big buttons like "Cancel Policy" or "Lapse Policy"
- ❌ No over-engineered modal flows
- ✅ Just a simple dropdown in the table row

## Implementation Steps

### 1. Database Layer (ALREADY DONE)
- ✅ Migration exists: `20251018_001_enhance_commission_chargeback_trigger.sql`
- ✅ Contains `calculate_chargeback_on_policy_lapse()` function
- ✅ Status enum includes 'charged_back'

### 2. Service Layer (ALREADY DONE)
- ✅ `CommissionStatusService.ts` has all methods:
  - `updateMonthsPaid()` - for chargeback calculation
  - `markAsCancelled()` - for status updates
- ✅ Hooks exist: `useUpdateMonthsPaid`

### 3. Frontend - PolicyList.tsx (NEEDS FIX)

**Current State**:
- Has "Paid" and "Chargeback" buttons (WRONG)

**Target State**:
- Replace buttons with a **status dropdown**
- Dropdown shows current status and allows changing it
- Options: pending, earned, paid, charged_back, cancelled

**Implementation**:
```tsx
// In the Comm Status column
<select
  value={policyCommission.status}
  onChange={(e) => handleStatusChange(policyCommission.id, e.target.value)}
  className="status-select"
>
  <option value="pending">Pending</option>
  <option value="earned">Earned</option>
  <option value="paid">Paid</option>
  <option value="charged_back">Charged Back</option>
  <option value="cancelled">Cancelled</option>
</select>
```

**Handler Logic**:
```tsx
const handleStatusChange = (commissionId: string, newStatus: string) => {
  if (newStatus === 'charged_back') {
    // Open modal to get months paid
    openChargebackModal(commission);
  } else {
    // Direct status update
    updateCommissionStatus({ commissionId, status: newStatus });
  }
};
```

### 4. Chargeback Modal (ALREADY EXISTS)
- Modal is already implemented with proper styling
- Just needs to be triggered when "charged_back" is selected from dropdown

## Files to Modify

1. **src/features/policies/PolicyList.tsx**
   - Remove "Paid" and "Chargeback" buttons
   - Add status dropdown in Comm Status column
   - Add handleStatusChange function
   - Keep existing chargeback modal (it's good)

2. **src/hooks/commissions/** (CHECK IF EXISTS)
   - May need `useUpdateCommissionStatus` hook
   - Already have `useUpdateMonthsPaid` ✅

3. **src/services/commissions/CommissionStatusService.ts** (CHECK IF NEEDED)
   - May need `updateStatus()` method for simple status changes
   - Already have `updateMonthsPaid()` ✅

## Success Criteria

- [ ] Each policy row has a dropdown in Comm Status column
- [ ] Dropdown shows current commission status
- [ ] Selecting "paid", "pending", "earned", or "cancelled" updates status immediately
- [ ] Selecting "charged_back" opens modal for months paid input
- [ ] After entering months paid, chargeback is calculated and applied
- [ ] No big buttons, no over-engineered components
- [ ] Clean, simple, straightforward UI

## What Was Wrong Before

1. Created complex PolicyStatusActions component with big buttons ❌
2. Put buttons for "Cancel Policy" and "Lapse Policy" in the table ❌
3. Over-complicated the UI with multiple modals ❌
4. Didn't listen to user feedback about simplicity ❌

## What's Right Now

1. Simple dropdown in the table row ✅
2. Direct status updates ✅
3. Modal only for chargeback (when needed) ✅
4. Clean, minimal implementation ✅
