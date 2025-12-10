# Workflow Automation - REQUIRED Setup Steps

## What I Fixed

✅ **Fixed workflow join** - `getWorkflowRuns()` now returns workflow name/status
✅ **Fixed "Unknown Workflow"** - Shows "(deleted)" for missing workflows
✅ **Fixed "Invalid Date"** - Shows "Not started" for null dates
✅ **Created email processor** - `process-email-queue` Edge Function deployed
✅ **Build passes** - 0 TypeScript errors

---

## What YOU Must Do (5 minutes)

### Step 1: Enable Extensions in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/database/extensions
2. Search for `pg_cron` → Click "Enable"
3. Search for `pg_net` → Click "Enable"

**These extensions are REQUIRED** - workflows will never execute without them.

---

### Step 2: Apply Cron Migration

```bash
cd /home/nneessen/projects/commissionTracker

# Apply the cron migration
cat supabase/migrations/20251210_002_setup_workflow_cron.sql | PGPASSWORD='N123j234n345!$!$' psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

This creates 2 cron jobs:
- `process-pending-workflows` - Every 5 minutes
- `process-email-queue` - Every 2 minutes

---

### Step 3: Verify Cron Jobs

```bash
cat <<'EOF' | PGPASSWORD='N123j234n345!$!$' psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
SELECT jobname, schedule, active FROM cron.job;
EOF
```

Expected output:
```
         jobname          | schedule  | active
--------------------------+-----------+--------
 process-pending-workflows | */5 * * * * | t
 process-email-queue       | */2 * * * * | t
```

---

### Step 4: Test Workflow Execution

1. Open http://localhost:3001 (or http://localhost:3000)
2. Log in
3. Go to **Training Hub → Automation**
4. Click "Run Now" on an existing workflow
5. Wait 5 minutes (or less)
6. Refresh - workflow run should change from "pending" to "completed" or "failed"

**If it stays "pending"**:
- Check pg_cron is enabled
- Check cron migration was applied
- Check Edge Function logs in Supabase Dashboard

---

## Why Workflows Weren't Working

1. **"Unknown Workflow"** - Missing join in SQL query ✅ FIXED
2. **"Invalid Date"** - No null check on `startedAt` ✅ FIXED
3. **"Stuck at running"** - No cron job to process pending runs ⚠️ NEEDS SETUP
4. **"No emails sent"** - No email processor ✅ FIXED

---

## What Happens Now

**After you enable pg_cron and apply migration:**

```
User clicks "Run Now"
    ↓
workflow_runs created (status: pending)
    ↓
Cron runs every 5 minutes
    ↓
process-pending-workflows invoked
    ↓
Finds pending run, invokes process-workflow
    ↓
Actions execute (emails queue, notifications create)
    ↓
Status updated to "completed"
    ↓
Email cron runs every 2 minutes
    ↓
process-email-queue sends queued emails
```

---

## Current Status

**Fixed (Code Changes)**:
- ✅ Workflow join returns proper data
- ✅ UI handles null dates
- ✅ UI shows deleted workflow status
- ✅ Email processor created & deployed
- ✅ Build passes (no TypeScript errors)

**Not Fixed (Requires Manual Setup)**:
- ❌ pg_cron extension not enabled
- ❌ pg_net extension not enabled
- ❌ Cron migration not applied

**Until you do Steps 1-2, workflows will NOT execute automatically.**

Manual "Run Now" will create pending runs, but they'll sit there forever.

---

## Files Changed

- `src/services/workflowService.ts` - Fixed `getWorkflowRuns()` join
- `src/features/training-hub/components/AutomationTab.tsx` - Fixed null handling
- `src/hooks/workflows/useWorkflows.ts` - Removed error masking
- `supabase/functions/process-email-queue/index.ts` - NEW (deployed)
- `supabase/migrations/20251210_002_setup_workflow_cron.sql` - NEW (not applied)

---

## Next Steps

1. Enable pg_cron + pg_net extensions (1 minute)
2. Apply cron migration (1 minute)
3. Test workflow execution (3 minutes)
4. Done

**Total time: 5 minutes**
