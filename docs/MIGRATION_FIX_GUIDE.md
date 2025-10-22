# Commission Status "Cancelled" - Database Fix Guide

## Problem Summary

When updating commission status to "cancelled" in the UI, the application returned a 400 Bad Request error with the message:
```
Failed to update status: Failed to update policy status:
record "v_commission" has no field "commission_amount"
```

## Root Cause

**Multiple conflicting database triggers on the `policies` table:**

1. **`trigger_handle_policy_cancellation`** (OLD, BROKEN)
   - Function: `handle_policy_cancellation()`
   - References non-existent field: `v_commission.commission_amount`
   - Executed FIRST when policy status changed

2. **`trigger_update_commission_status`** (NEW, CORRECT)
   - Function: `update_commission_on_policy_status()`
   - References correct field: `v_commission.amount`
   - Would execute SECOND but never got a chance

**Problem**: The old trigger failed first with the field name error, triggering a 400 response before the correct trigger could even execute.

## Actual Database Schema

The `commissions` table uses these field names:
- ✅ `amount` - Total commission amount (CORRECT)
- ❌ ~~`commission_amount`~~ (WRONG - does not exist)
- ❌ ~~`advance_amount`~~ (WRONG - does not exist)

## Solution Applied

### Migrations Created

1. **20251222_001**: Fixed basic function references
2. **20251222_002**: Comprehensive fix for all functions
3. **20251222_003**: Fixed `calculate_chargeback_on_policy_lapse()` function
4. **20251222_004**: **FINAL FIX** - Removed the old broken trigger and function

### Final Migration (20251222_004)

```sql
DROP TRIGGER IF EXISTS trigger_handle_policy_cancellation ON policies;
DROP FUNCTION IF EXISTS handle_policy_cancellation();
```

This removed the duplicate, broken trigger that was executing first and causing the error.

## Additional Fixes

1. **Disabled auth logging** in `src/services/base/logger.ts`
   - Was cluttering console with verbose auth event messages
   - Commented out the `.auth()` method implementation

2. **Updated CLAUDE.md** with trigger conflict debugging guide
   - Added diagnostic queries to find duplicate triggers
   - Added recovery procedures for similar issues

3. **Updated memory** `supabase_migration_workflow.md`
   - Added comprehensive trigger management section
   - Added diagnostic commands for finding conflicting functions

## How to Prevent This in the Future

### When Creating Database Functions/Triggers:

1. **Check for existing triggers** before creating new ones:
   ```sql
   SELECT trigger_name, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'policies';
   ```

2. **Check for existing functions**:
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname LIKE '%policy%' OR proname LIKE '%commission%';
   ```

3. **Rule**: ONE trigger per table per event type (INSERT, UPDATE, DELETE)
   - Multiple triggers on same table/event = conflicts and confusion
   - If replacing old trigger, DROP the old one first

### When Debugging "Field Does Not Exist" Errors:

1. Check actual column names in the table
2. Look for duplicate triggers on the same table
3. Find functions referencing wrong field names
4. **Always remove the OLD broken function before adding a new one**

## Verification

Test the fix by:
```sql
UPDATE policies
SET status = 'cancelled'
WHERE id = '<policy-id>';

-- Should show:
-- - Policy status updated to 'cancelled'
-- - Commission status updated to 'charged_back'
-- - Chargeback amount calculated
-- - Chargeback reason populated
```

## Related Files

- `CLAUDE.md` - Updated with debugging guide
- `supabase_migration_workflow.md` - Updated with trigger management best practices
- `supabase/migrations/20251222_*.sql` - The fix migrations

## Timeline

- **Root Issue**: Multiple old migrations with conflicting functions created duplicate triggers
- **Symptom**: 400 error when trying to change commission status to "cancelled"
- **Diagnosis**: Found duplicate `trigger_handle_policy_cancellation` using wrong field name
- **Fix**: Removed old trigger/function, kept corrected version
- **Result**: Commission cancellation now works perfectly