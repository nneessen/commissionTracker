# Fix Policies CRUD Operations and Status Cascade Logic

## Problem Analysis

### 1. Commission Status Display Issues
- **BUG**: PolicyList.tsx lines 394-401 incorrectly maps both 'pending' and 'earned' to display as 'paid'
- **Impact**: New policies immediately show commission as "paid" when they're actually "pending"
- **Root Cause**: Simplified dropdown only offers "paid" and "cancelled" options

### 2. Missing Commission Status Options
**Current State**: Dropdown only has "paid" and "cancelled"
**Required States** (from commission.types.ts):
- `pending`: Policy not active yet, no commission owed
- `earned`: Policy active, commission earned but NOT paid yet (money not received)
- `paid`: Money actually received in bank account
- `charged_back`: Chargeback has been applied due to policy lapse/cancellation
- `cancelled`: Commission cancelled (policy cancelled/lapsed)

### 3. Missing Critical CRUD Operations
**Backend Services Exist** (policyService.ts):
- `cancelPolicy()`: Cancels policy AND triggers automatic chargeback
- `lapsePolicy()`: Marks as lapsed AND triggers chargeback
- `reinstatePolicy()`: Reverses chargeback and reactivates

**Hooks Exist** but unused:
- `useCancelPolicy`
- `useLapsePolicy`
- `useReinstatePolicy`
- `useProcessChargeback`
- `useUpdateCommissionStatus`

**Current UI**: Only has basic delete and generic status update

### 4. No Status Cascade Logic in UI
- When commission status → cancelled, policy status should → cancelled
- When policy → cancelled/lapsed, commission should → charged_back (DB trigger handles this)
- UI doesn't reflect these business rules

### 5. Styling Issues
- Using custom CSS classes instead of shadcn components
- Hardcoded colors instead of CSS variables
- No proper dark/light mode support

## Implementation Plan

### Phase 1: Fix Commission Status Display
**File**: `src/features/policies/PolicyList.tsx`

1. Remove incorrect status mapping (lines 394-401)
2. Show actual commission status
3. Add all status options to dropdown:
   ```tsx
   <Select value={commission.status}>
     <SelectTrigger>
       <SelectValue />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="pending">Pending</SelectItem>
       <SelectItem value="earned">Earned</SelectItem>
       <SelectItem value="paid">Paid</SelectItem>
       <SelectItem value="charged_back">Charged Back</SelectItem>
       <SelectItem value="cancelled">Cancelled</SelectItem>
     </SelectContent>
   </Select>
   ```

### Phase 2: Add Policy Operations Menu
**File**: `src/features/policies/PolicyList.tsx`

Add action menu for each policy:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleEditPolicy(policy.id)}>
      <Edit className="mr-2 h-4 w-4" /> Edit
    </DropdownMenuItem>
    {policy.status === 'active' && (
      <>
        <DropdownMenuItem onClick={() => handleCancelPolicy(policy.id)}>
          <XCircle className="mr-2 h-4 w-4" /> Cancel Policy
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLapsePolicy(policy.id)}>
          <AlertCircle className="mr-2 h-4 w-4" /> Mark as Lapsed
        </DropdownMenuItem>
      </>
    )}
    {(policy.status === 'cancelled' || policy.status === 'lapsed') && (
      <DropdownMenuItem onClick={() => handleReinstatePolicy(policy.id)}>
        <CheckCircle className="mr-2 h-4 w-4" /> Reinstate Policy
      </DropdownMenuItem>
    )}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => handleDeletePolicy(policy.id)} className="text-destructive">
      <Trash2 className="mr-2 h-4 w-4" /> Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Phase 3: Implement Status Cascade Logic

1. **Commission Status Change Handler**:
```tsx
const handleCommissionStatusChange = (commission: Commission, newStatus: CommissionStatus, policy: Policy) => {
  // Special handling for status changes
  if (newStatus === 'cancelled' || newStatus === 'charged_back') {
    // Show confirmation modal
    setSelectedCommission({ ...commission, policy });
    setShowStatusChangeModal(true);
  } else if (newStatus === 'paid' && commission.status === 'pending') {
    // If marking as paid from pending, policy should be active
    if (policy.status === 'pending') {
      updatePolicyStatus(policy.id, 'active');
    }
    updateCommissionStatus({
      commissionId: commission.id,
      status: newStatus
    });
  } else {
    // Direct status update
    updateCommissionStatus({
      commissionId: commission.id,
      status: newStatus
    });
  }
};
```

2. **Policy Operations with Proper Cascade**:
```tsx
const handleCancelPolicy = async (policyId: string) => {
  const result = await cancelPolicy({
    policyId,
    reason: 'User requested cancellation',
    cancelDate: new Date()
  });

  // Show chargeback details
  if (result.chargeback) {
    toast({
      title: "Policy Cancelled",
      description: `Chargeback amount: ${formatCurrency(result.chargeback.amount)}`
    });
  }
};
```

### Phase 4: Replace Custom CSS with Shadcn Components

1. **Replace custom table with Shadcn Table**:
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
```

2. **Replace custom modal with Shadcn Dialog**:
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
```

3. **Replace custom buttons and inputs**:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

### Phase 5: Create Comprehensive Color Palette

**File**: `src/index.css`

Add semantic color variables:
```css
@layer base {
  :root {
    /* Status Colors - Light Mode */
    --status-pending: oklch(0.7007 0.1408 84.9326);      /* Yellow */
    --status-pending-bg: oklch(0.9507 0.0408 84.9326);
    --status-active: oklch(0.6421 0.1902 146.6154);      /* Green */
    --status-active-bg: oklch(0.9221 0.0502 146.6154);
    --status-earned: oklch(0.6082 0.1468 238.6587);      /* Blue */
    --status-earned-bg: oklch(0.9082 0.0368 238.6587);
    --status-paid: oklch(0.5421 0.1902 146.6154);        /* Dark Green */
    --status-paid-bg: oklch(0.8921 0.0502 146.6154);
    --status-lapsed: oklch(0.7915 0.0491 39.241);        /* Orange */
    --status-lapsed-bg: oklch(0.9415 0.0191 39.241);
    --status-cancelled: oklch(0.6627 0.0978 20.0041);    /* Red */
    --status-cancelled-bg: oklch(0.9127 0.0278 20.0041);
    --status-charged-back: oklch(0.5627 0.0978 20.0041); /* Dark Red */
    --status-charged-back-bg: oklch(0.8627 0.0278 20.0041);

    /* Commission Colors */
    --commission-positive: oklch(0.6421 0.1902 146.6154);
    --commission-negative: oklch(0.6627 0.0978 20.0041);
    --commission-neutral: oklch(0.7058 0 0);
  }

  .dark {
    /* Status Colors - Dark Mode */
    --status-pending: oklch(0.7507 0.1408 84.9326);
    --status-pending-bg: oklch(0.3507 0.0408 84.9326);
    --status-active: oklch(0.6921 0.1902 146.6154);
    --status-active-bg: oklch(0.3221 0.0502 146.6154);
    --status-earned: oklch(0.6582 0.1468 238.6587);
    --status-earned-bg: oklch(0.3082 0.0368 238.6587);
    --status-paid: oklch(0.5921 0.1902 146.6154);
    --status-paid-bg: oklch(0.2921 0.0502 146.6154);
    --status-lapsed: oklch(0.8415 0.0491 39.241);
    --status-lapsed-bg: oklch(0.3415 0.0191 39.241);
    --status-cancelled: oklch(0.7127 0.0978 20.0041);
    --status-cancelled-bg: oklch(0.3127 0.0278 20.0041);
    --status-charged-back: oklch(0.6127 0.0978 20.0041);
    --status-charged-back-bg: oklch(0.2627 0.0278 20.0041);

    /* Commission Colors */
    --commission-positive: oklch(0.6921 0.1902 146.6154);
    --commission-negative: oklch(0.7127 0.0978 20.0041);
    --commission-neutral: oklch(0.8078 0 0);
  }
}

/* Utility Classes */
.status-badge {
  @apply inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset;
}

.status-badge-pending {
  color: var(--status-pending);
  background-color: var(--status-pending-bg);
  ring-color: var(--status-pending);
}

.status-badge-active {
  color: var(--status-active);
  background-color: var(--status-active-bg);
  ring-color: var(--status-active);
}

/* ... etc for all statuses ... */
```

## Testing Plan

### Unit Tests
1. Test commission status display logic
2. Test cascade logic for status changes
3. Test policy operations (cancel, lapse, reinstate)

### Integration Tests
1. Create policy → Check commission status is 'pending'
2. Activate policy → Check commission status is 'earned'
3. Mark commission as paid → Verify status
4. Cancel policy → Verify chargeback calculation
5. Reinstate policy → Verify chargeback reversal

### Manual Testing Checklist
- [ ] Create new policy - commission shows as "pending"
- [ ] Activate policy - commission changes to "earned"
- [ ] Mark commission as paid - status updates correctly
- [ ] Cancel active policy - chargeback calculated, commission shows "charged_back"
- [ ] Lapse policy - proper chargeback calculation
- [ ] Reinstate cancelled policy - chargeback reversed
- [ ] All status badges use proper colors
- [ ] Dark mode works correctly
- [ ] No inline styles remain
- [ ] All dropdowns use shadcn Select component
- [ ] All modals use shadcn Dialog component
- [ ] All buttons use shadcn Button component

## Migration Notes

### Database Considerations
- Triggers already exist for automatic chargeback calculation
- Commission status enum includes all required values
- No migration needed for this fix

### Breaking Changes
- None - all changes are additive or bug fixes

### Rollback Plan
1. Keep backup of original PolicyList.tsx
2. Can revert individual phases if issues arise
3. Database triggers remain compatible with old code

## Success Criteria
1. ✅ New policies show correct "pending" status
2. ✅ All commission statuses available in dropdown
3. ✅ Policy operations (cancel/lapse/reinstate) accessible in UI
4. ✅ Status changes cascade properly
5. ✅ No inline styles or hardcoded colors
6. ✅ Dark/light mode works with semantic colors
7. ✅ All tests pass
8. ✅ Type checking passes
9. ✅ No console errors or warnings

## Implementation Order
1. Phase 1: Fix commission status display (CRITICAL - fixes immediate bug)
2. Phase 3: Implement status cascade logic (IMPORTANT - prevents data inconsistency)
3. Phase 2: Add policy operations menu (IMPORTANT - exposes existing functionality)
4. Phase 5: Create color palette (NICE TO HAVE - improves consistency)
5. Phase 4: Replace with shadcn components (NICE TO HAVE - code quality)

## Estimated Time
- Phase 1: 30 minutes ⚡ CRITICAL
- Phase 2: 1 hour
- Phase 3: 1 hour
- Phase 4: 2 hours
- Phase 5: 30 minutes
- Testing: 1 hour
- **Total: ~5.5 hours**

## Files to Modify
1. `src/features/policies/PolicyList.tsx` - Main changes
2. `src/features/policies/PolicyForm.tsx` - Minor status updates
3. `src/index.css` - Add color variables
4. `src/hooks/policies/index.ts` - Export missing hooks
5. Components may need imports from shadcn

## Dependencies
- Ensure all shadcn components are installed
- Verify hooks are properly exported
- Test database triggers still function

---

**Created**: 2025-01-20
**Priority**: HIGH - Critical bug affecting commission tracking accuracy
**Assigned**: To be implemented immediately