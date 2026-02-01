# Multi-Tenant Data Integrity Fixes (January 2026)

## Summary
Fixed multiple service repositories that were missing `imo_id` and/or `agency_id` fields in their `transformToDB()` methods, improving multi-tenant data isolation.

## Changes Made

### New File Created
- `src/services/base/TenantContext.ts` - Utility service to get current user's tenant context (imo_id, agency_id)

### Type Definition Updates
1. `src/types/commission.types.ts` - Added `imoId?: string | null` to Commission interface
2. `src/types/user.types.ts` - Added `imoId?: string | null` to CreateChargebackData
3. `src/types/policy.types.ts` - Added `imoId?: string | null` and `agencyId?: string | null` to CreatePolicyData
4. `src/types/expense.types.ts` - Added `imo_id?: string | null` and `agency_id?: string | null` to CreateExpenseData
5. `src/types/client.types.ts` - Added `user_id?: string`, `imo_id?: string | null`, `agency_id?: string | null` to CreateClientData
6. `src/services/overrides/OverrideRepository.ts` - Added `imo_id?: string | null` to CreateOverrideData

### Repository transformToDB Updates
1. `CommissionRepository.transformToDB` - Now includes `imo_id`
2. `ChargebackService.transformToDB` - Now includes `imo_id`
3. `PolicyRepository.transformToDB` - Now includes `imo_id` and `agency_id` (defense-in-depth, also has DB trigger)
4. `ExpenseRepository.transformToDB` - Now includes `imo_id` and `agency_id` (defense-in-depth, also has DB trigger)
5. `OverrideRepository.transformToDB` - Now includes `imo_id`
6. `ClientRepository.transformToDB` - Now includes `user_id`, `imo_id`, and `agency_id`

## Database Trigger Coverage
Tables WITH auto-population triggers (defense-in-depth now in place):
- policies - `trigger_set_policy_agency_id`
- expenses - `trigger_set_expense_org_ids`
- lead_purchases - `trigger_set_lead_purchase_org_ids`
- override_commissions - sets `imo_id` from `base_agent`

Tables WITHOUT triggers (service-layer is primary):
- commissions - NO trigger (CRITICAL - fixed)
- chargebacks - NO trigger (CRITICAL - fixed)
- clients - NO trigger (fixed)

## Usage
The TenantContext utility can be used by calling code (hooks, services) to inject tenant context:

```typescript
import { getCurrentTenantContext, getTenantFields } from '@/services/base';

// In a hook or service
const tenantFields = await getTenantFields();
await commissionRepository.create({
  ...commissionData,
  imoId: tenantFields.imo_id,
});
```

## Verification
- Build passes with zero TypeScript errors
- App loads without runtime errors
