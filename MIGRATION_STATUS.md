# Commission Chargeback Feature - Migration Status

## What's Complete ✅

### Frontend Code
- ✅ Commission status dropdown in PolicyList (select element in each row)
- ✅ `useUpdateCommissionStatus` hook created
- ✅ Commission status options: pending, earned, paid, charged_back, cancelled
- ✅ Chargeback modal for "charged_back" selection (prompts for months paid)
- ✅ All service layer code (CommissionStatusService)
- ✅ All React hooks (useUpdateMonthsPaid, useUpdateCommissionStatus)

### Database - Partial ✅
- ✅ **Chargeback columns added successfully to remote database**:
  - `chargeback_amount NUMERIC(12,2)`
  - `chargeback_date DATE`
  - `chargeback_reason TEXT`
  - `last_payment_date DATE`

## What's NOT Complete ❌

### Database - Main Migration
The main migration file `20251018_001_enhance_commission_chargeback_trigger.sql` has **NOT been applied** due to:
1. WSL2 network blocking PostgreSQL connections (intermittent)
2. Column name mismatch (`advance_amount` vs `commission_amount`)

### What the Main Migration Does:
- Adds `calculate_months_paid()` function
- Adds `calculate_chargeback_on_policy_lapse()` function
- Enhances `update_commission_on_policy_status()` trigger
- Creates `commission_chargeback_summary` view
- Creates `get_at_risk_commissions()` function
- Adds performance indexes

## How to Complete (Manual Steps Required)

### Option 1: Supabase Dashboard (Recommended - 2 minutes)
1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new
2. Open: `supabase/migrations/20251018_003_enhance_commission_chargeback_trigger.sql`
   (This is the FIXED version with correct column names)
3. Copy all SQL
4. Paste into Supabase SQL Editor
5. Click "Run" or press Ctrl+Enter

###Option 2: Fix WSL2 Networking Then Use CLI
Run in Windows PowerShell (as Administrator):
```powershell
wsl --shutdown
netsh int ip reset
netsh winsock reset
# Restart computer
```

Then in WSL:
```bash
cd ~/temp_migration_dir
supabase db push
```

## Fixed Migration File

The corrected migration is here:
- **File**: `~/temp_migration_dir/supabase/migrations/20251018_003_enhance_commission_chargeback_trigger.sql`
- **Changes**: Replaced `advance_amount` → `commission_amount` (your remote DB uses different column naming)

## Current Feature Status

### Working Now:
- Dropdown shows in policies table
- You can select different statuses
- Status updates will save to database

### Will Work After Migration:
- Automatic chargeback calculation when policy cancelled/lapsed
- `calculate_months_paid()` from policy effective date
- Chargeback tracking and reporting
- At-risk commission detection

## Network Issue Summary

Your WSL2 environment has intermittent connectivity to Supabase PostgreSQL ports (5432, 6543):
- ✅ HTTPS works (Supabase API, web browsing)
- ❌ PostgreSQL direct connections blocked/refused
- ✅ Supabase CLI `db push` worked ONCE, then stopped working
- ❌ All psql, pg library, pooler attempts fail

This is a known WSL2 networking bug with database connections, not a code issue.

## Next Steps

1. **EITHER**: Apply the migration via Supabase Dashboard SQL Editor (2 min)
2. **OR**: Fix WSL2 network → Apply via CLI
3. **THEN**: Test the feature - select "Charged Back" status and enter months paid

The feature IS implemented and ready - just needs the database functions deployed.
