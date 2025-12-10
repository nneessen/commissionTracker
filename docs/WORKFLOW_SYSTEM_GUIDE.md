# Workflow Automation System - Complete Guide

## Overview

The Training Hub's workflow automation system allows you to create automated sequences of actions triggered by events, schedules, webhooks, or manual execution. This system is fully functional and production-ready.

---

## What's Working (Production Ready)

### ✅ Database & Security
- **RLS Policies**: Complete row-level security for all workflow tables
- **Permissions**: Admin, Trainer, and Manager roles can create/manage workflows
- **Tables**: `workflows`, `workflow_runs`, `workflow_actions`, `trigger_event_types`, `email_queue`
- **Database Triggers**: Automatic workflow execution on system events

### ✅ Edge Functions (Deployed)
- **process-workflow**: Executes workflow actions sequentially
- **process-pending-workflows**: Batch processor for queued runs (cron-ready)

### ✅ Frontend UI
- **WorkflowWizard**: 4-step wizard for creating/editing workflows
- **AutomationTab**: View all workflows and recent runs
- **Real-time updates**: TanStack Query auto-refreshes data

### ✅ Trigger Types
1. **Manual**: Run workflows on-demand via UI
2. **Event**: Auto-trigger on system events (policies, commissions, recruiting)
3. **Schedule**: Recurring workflows (daily, weekly, monthly)
4. **Webhook**: External system triggers

### ✅ Available Actions
1. **Send Email**: Use email templates with variable substitution
2. **Create Notification**: In-app notifications
3. **Webhook**: POST/GET to external APIs
4. **Wait**: Delay between actions
5. **Update Field**: Modify database records

### ✅ Event Triggers (Auto-Execute Workflows)
- `policy.created` - New policy added
- `commission.received` - Commission status → received
- `commission.chargeback` - Chargeback created
- `recruit.phase_changed` - Recruit moves to new onboarding phase
- `time.daily` / `time.weekly` / `time.monthly` - Scheduled runs
- `target.milestone_reached` - Goal achievement

---

## How to Use

### Creating a Workflow

1. **Navigate**: Training Hub → Automation Tab
2. **Click**: "Create Workflow" button
3. **Step 1 - Basic Info**:
   - Name (required, unique)
   - Description (optional)
   - Category (general, recruiting, sales, etc.)

4. **Step 2 - Trigger**:
   - **Manual**: Run on-demand only
   - **Event**: Select from available system events
   - **Schedule**: Set time/frequency (daily/weekly/monthly)
   - **Webhook**: Configure external endpoint

5. **Step 3 - Actions**:
   - Add one or more actions in sequence
   - Configure delays between actions
   - Each action type has specific settings:
     - **Send Email**: Select template, configure variables
     - **Notification**: Set title/message
     - **Webhook**: URL, method, headers, body
     - **Wait**: Duration in minutes
     - **Update Field**: Table, field, value

6. **Step 4 - Review**:
   - Review all settings
   - **Test Run**: Execute with test data (doesn't affect production)
   - **Create**: Save and activate

### Managing Workflows

- **Edit**: Click workflow → Settings → Edit
- **Pause**: Temporarily disable without deleting
- **Resume**: Reactivate paused workflow
- **Run Now**: Manually trigger active workflow
- **Delete**: Permanently remove (includes all run history)

### Viewing Workflow Runs

- **Recent Runs Panel**: See last 10 executions
- **Status Indicators**:
  - 🟢 Completed: All actions succeeded
  - 🔴 Failed: One or more actions failed
  - 🔵 Running: Currently executing
  - ⚪ Pending: Queued for execution

---

## Architecture

### Data Flow

```
Event/Trigger
    ↓
Database Trigger (Postgres)
    ↓
workflow_runs table (status: pending)
    ↓
process-pending-workflows Edge Function (cron)
    ↓
process-workflow Edge Function
    ↓
Execute Actions Sequentially
    ↓
Update workflow_runs (status: completed/failed)
```

### Edge Functions

#### process-workflow
- **Purpose**: Execute a single workflow run
- **Invoked by**: UI (manual), process-pending-workflows (events), scheduled tasks
- **Parameters**:
  - `runId`: UUID of workflow_run
  - `workflowId`: UUID of workflow
  - `isTest`: boolean (true for test runs)
- **Location**: `supabase/functions/process-workflow/index.ts`

#### process-pending-workflows
- **Purpose**: Batch process pending runs (called by cron)
- **Invoked by**: Scheduled cron job (recommended: every 5 minutes)
- **Parameters**: None (finds pending runs automatically)
- **Limit**: Processes 10 runs per invocation
- **Location**: `supabase/functions/process-pending-workflows/index.ts`

### Database Schema

#### workflows
- `id`: UUID (PK)
- `name`: TEXT (unique per user)
- `description`: TEXT
- `trigger_type`: TEXT (manual|event|schedule|webhook)
- `status`: TEXT (draft|active|paused|archived)
- `actions`: JSONB (array of action configs)
- `config`: JSONB (trigger-specific settings)
- `created_by`: UUID (FK → user_profiles)
- `max_runs_per_day`: INTEGER
- `priority`: INTEGER (1-100)

#### workflow_runs
- `id`: UUID (PK)
- `workflow_id`: UUID (FK → workflows)
- `status`: TEXT (pending|running|completed|failed)
- `context`: JSONB (event data, variables)
- `started_at`: TIMESTAMPTZ
- `completed_at`: TIMESTAMPTZ
- `duration_ms`: INTEGER
- `actions_executed`: JSONB (result per action)
- `emails_sent`: INTEGER
- `error_message`: TEXT

#### email_queue
- `id`: UUID (PK)
- `template_id`: UUID (FK → email_templates)
- `recipient_id`: UUID (FK → user_profiles)
- `status`: TEXT (pending|sending|sent|failed)
- `subject`: TEXT
- `body_html`: TEXT
- `variables`: JSONB
- `sent_at`: TIMESTAMPTZ

---

## Setting Up Cron for Auto-Execution

To enable automatic workflow processing, set up a cron job to invoke `process-pending-workflows`:

### Option 1: Supabase Cron (Recommended)
```sql
-- Run every 5 minutes
SELECT cron.schedule(
  'process-pending-workflows',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-pending-workflows',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service
Use services like:
- **Cron-job.org** (free)
- **EasyCron**
- **GitHub Actions** (if using GitHub)

Configure to POST to:
```
https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-pending-workflows
```

Headers:
```
Authorization: Bearer <YOUR_ANON_KEY>
Content-Type: application/json
```

---

## Example Workflows

### 1. New Policy Welcome Email
- **Trigger**: Event → `policy.created`
- **Actions**:
  1. Send Email (template: "Welcome New Client")
  2. Create Notification ("New policy added")

### 2. Commission Chargeback Alert
- **Trigger**: Event → `commission.chargeback`
- **Actions**:
  1. Create Notification ("Chargeback Alert: $X")
  2. Send Email (template: "Chargeback Notification")
  3. Webhook → POST to Slack/Discord

### 3. Daily Sales Summary
- **Trigger**: Schedule → Daily at 8:00 AM
- **Actions**:
  1. Webhook → Fetch stats from API
  2. Send Email (template: "Daily Summary")

### 4. Recruit Onboarding Sequence
- **Trigger**: Event → `recruit.phase_changed`
- **Actions**:
  1. Send Email (template: "Phase X Checklist")
  2. Wait (1440 minutes = 1 day)
  3. Create Notification ("Follow up with recruit")

---

## Testing & Debugging

### Test Mode
- Click "Test Run" on Review step
- Executes with dummy data
- Shows what would happen without affecting production
- Results visible in Recent Runs

### Debugging Workflow Runs
1. Check **Recent Runs** panel for status
2. Click run to see detailed execution log
3. Check `workflow_runs.error_message` for failures
4. Review `workflow_runs.actions_executed` for per-action results

### Common Issues

#### Workflow Doesn't Trigger
- **Check**: Workflow status is "active"
- **Check**: Event name matches exactly (case-sensitive)
- **Check**: RLS policies allow your user to view runs
- **Check**: Cron job is running (for event-based workflows)

#### Email Not Sending
- **Check**: Email template exists and has valid HTML
- **Check**: Recipient ID is valid
- **Check**: `email_queue` table for status
- **Check**: Email service is configured

#### Actions Fail
- **Check**: `workflow_runs.actions_executed` for error details
- **Check**: Action configs are complete (e.g., templateId for emails)
- **Check**: Webhook URLs are accessible
- **Check**: Database permissions for update actions

---

## Security & Permissions

### Who Can Create Workflows?
- **Admin**: Full access (all workflows)
- **Trainer**: Full access (all workflows)
- **Manager**: Full access (all workflows)
- **Other roles**: No access

### Row-Level Security
- Users can view/edit their own workflows
- Admins/trainers can view/edit all workflows
- Workflow runs inherit permissions from parent workflow

### Data Access
- Event context includes only relevant IDs (not sensitive data)
- Emails use templates (no direct data exposure)
- Webhook payloads should be reviewed for PII

---

## Performance & Limits

### Current Limits
- **Max runs per day**: 10 (configurable per workflow)
- **Max actions per workflow**: No hard limit (recommended: ≤10)
- **Batch processing**: 10 pending runs per cron invocation
- **Edge Function timeout**: 150 seconds

### Optimization Tips
1. Use delays strategically (avoid long-running functions)
2. Keep action configs lean (minimize JSONB size)
3. Archive completed runs older than 30 days
4. Use `max_runs_per_day` to prevent runaway workflows

---

## Roadmap & Future Enhancements

### Not Yet Implemented
- ❌ Conditional logic (if/else branches)
- ❌ Workflow versioning (edit creates new version)
- ❌ A/B testing support
- ❌ Rollback capability
- ❌ Advanced scheduling (cron expressions)
- ❌ Workflow templates marketplace
- ❌ Visual workflow builder (drag-and-drop)
- ❌ Integration with external tools (Zapier, Make.com)

### Possible Additions
- Slack notifications action
- SMS action (via Twilio)
- Database query action
- CSV export action
- Multi-recipient email support
- Workflow analytics dashboard

---

## API Reference

### workflowService Methods

```typescript
// Get all workflows (optionally filtered by status)
getWorkflows(status?: WorkflowStatus): Promise<Workflow[]>

// Get single workflow by ID
getWorkflow(id: string): Promise<Workflow>

// Create new workflow
createWorkflow(data: WorkflowFormData): Promise<Workflow>

// Update existing workflow
updateWorkflow(id: string, data: Partial<WorkflowFormData>): Promise<Workflow>

// Delete workflow
deleteWorkflow(id: string): Promise<void>

// Change workflow status
updateWorkflowStatus(id: string, status: WorkflowStatus): Promise<void>

// Manually trigger workflow
triggerWorkflow(id: string, context?: Record<string, any>): Promise<WorkflowRun>

// Test workflow without affecting production
testWorkflow(id: string, testData: Record<string, any>): Promise<WorkflowRun>

// Get workflow runs (optionally filtered)
getWorkflowRuns(workflowId?: string, limit?: number): Promise<WorkflowRun[]>

// Get available event types
getTriggerEventTypes(): Promise<TriggerEventType[]>
```

### React Hooks

```typescript
// Fetch workflows
useWorkflows(status?: WorkflowStatus)

// Fetch single workflow
useWorkflow(id: string)

// Create workflow (mutation)
useCreateWorkflow()

// Update workflow (mutation)
useUpdateWorkflow(id: string)

// Delete workflow (mutation)
useDeleteWorkflow()

// Trigger workflow (mutation)
useTriggerWorkflow()

// Fetch workflow runs
useWorkflowRuns(workflowId?: string, limit?: number)

// Fetch trigger event types
useTriggerEventTypes()
```

---

## Support & Troubleshooting

### Logs
- **Edge Function logs**: Supabase Dashboard → Functions → [function-name] → Logs
- **Database logs**: Supabase Dashboard → Database → Logs
- **Browser console**: Check for client-side errors

### Need Help?
1. Check this guide first
2. Review logs for error messages
3. Test with simple workflows first (manual trigger, single action)
4. Check RLS policies if permission errors
5. Verify cron job is running for event-based workflows

---

## Files Modified/Created

### Backend
- ✅ `fix-workflow-rls-policies.sql` - RLS policies and email_queue table
- ✅ `add-workflow-triggers.sql` - Database triggers for events
- ✅ `supabase/functions/process-workflow/index.ts` - Workflow executor
- ✅ `supabase/functions/process-pending-workflows/index.ts` - Batch processor

### Frontend
- ✅ `src/features/training-hub/components/AutomationTab.tsx` - Main UI
- ✅ `src/features/training-hub/components/WorkflowWizard.tsx` - Creation wizard
- ✅ `src/features/training-hub/components/WorkflowBasicInfo.tsx` - Step 1
- ✅ `src/features/training-hub/components/WorkflowTriggerSetup.tsx` - Step 2
- ✅ `src/features/training-hub/components/WorkflowActionsBuilder.tsx` - Step 3
- ✅ `src/features/training-hub/components/WorkflowReview.tsx` - Step 4
- ✅ `src/services/workflowService.ts` - Business logic
- ✅ `src/hooks/workflows/useWorkflows.ts` - React hooks
- ✅ `src/types/workflow.types.ts` - TypeScript types

### Database
- ✅ `src/types/database.types.ts` - Auto-generated from Supabase schema

---

## Summary

The workflow automation system is **fully functional and production-ready**. You can:

1. ✅ Create workflows via UI
2. ✅ Trigger manually or via events
3. ✅ Execute email, notification, webhook, and field update actions
4. ✅ View run history and debug failures
5. ✅ Secure with RLS policies

**Next steps**:
1. Set up cron job for `process-pending-workflows` (required for event-based workflows)
2. Create your first workflow via Training Hub → Automation
3. Test with a simple "Send Email" action
4. Monitor Recent Runs to verify execution
