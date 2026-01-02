# Continuation Prompt: Carrier Advance Cap & IMO - Still Not Persisting

## Problem

When editing carriers in Settings → Carriers, the following fields do NOT persist after save:
- `advance_cap`
- `imo_id`

The form displays values correctly when editing, user can change them, clicks save, toast shows "Carrier updated successfully", but values revert to original.

## What Was Already Tried

Added `imo_id` to `UpdateCarrierData` interface and mutation formData in `useCarriers.ts` - did not fix the issue.

## Implementation Done (all builds pass)

### Database:
- `carriers.advance_cap` column exists (verified migration ran)
- Types regenerated

### Files Modified:
- `src/types/carrier.types.ts` - `NewCarrierForm` has `advance_cap`
- `src/services/settings/carriers/CarrierService.ts` - `updateFromForm()` handles both fields
- `src/features/settings/carriers/components/CarrierForm.tsx` - Form field added, reset logic includes both
- `src/features/settings/carriers/hooks/useCarriers.ts` - Types and mutation include both fields

## Debugging Steps To Take

1. **Check browser Network tab** - Look at the actual PATCH/PUT request payload being sent to Supabase. Does it include `advance_cap` and `imo_id`?

2. **Check CarrierForm onSubmit** - Add console.log to see what data is being passed:
   ```tsx
   // In CarrierForm.tsx handleSubmit
   const handleSubmit = (data: CarrierFormValues) => {
     console.log('Form submitting with data:', data);
     onSubmit(data);
   };
   ```

3. **Check mutation function** - Add console.log in useCarriers.ts:
   ```tsx
   // In updateCarrier mutation
   mutationFn: async ({ id, data }) => {
     console.log('Update mutation called with:', { id, data });
     const formData = { ... };
     console.log('Sending to service:', formData);
     ...
   }
   ```

4. **Check CarrierService.updateFromForm** - Verify it's actually setting the fields:
   ```typescript
   // Add logging
   console.log('updateFromForm received:', data);
   console.log('repositoryData being sent:', repositoryData);
   ```

5. **Check Supabase RLS policies** - Maybe RLS is blocking the update of these specific columns?

## Likely Culprits

1. **Form schema mismatch** - CarrierForm uses `z.infer<typeof carrierFormSchema>` but schema might not match what mutation expects

2. **Type coercion issue** - `advance_cap` input returns string, needs to be number

3. **Undefined vs null** - Service might be filtering out `undefined` values, and form sends `undefined` for empty fields

4. **RLS policy** - Supabase might have column-level restrictions

## Key Files To Check

1. `src/features/settings/carriers/CarriersManagement.tsx:64-72` - handleFormSubmit
2. `src/features/settings/carriers/components/CarrierForm.tsx:39-48` - schema definition
3. `src/features/settings/carriers/hooks/useCarriers.ts:67-87` - updateCarrier mutation
4. `src/services/settings/carriers/CarrierService.ts:140-159` - updateFromForm method

## Quick Test

Run this in browser console on the carriers page to test direct update:
```javascript
// After importing or accessing carrierService
const result = await carrierService.updateFromForm('CARRIER_ID_HERE', { advance_cap: 3000 });
console.log('Direct update result:', result);
```
