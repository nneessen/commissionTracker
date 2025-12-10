# Workflow Automation - Quick Start Guide

## ✅ System Status: PRODUCTION READY

All critical fixes have been applied. The workflow system is fully functional.

---

## 60-Second Test

### 1. Open Training Hub
Navigate to: **Training Hub → Automation** tab

### 2. Create Test Workflow
Click **"Create Workflow"** button

**Step 1 - Basic Info:**
- Name: `Test Workflow`
- Description: `My first automated workflow`
- Category: General

**Step 2 - Trigger:**
- Select: **Manual** (easiest to test)

**Step 3 - Actions:**
- Click **"Add Action"**
- Type: **Create Notification**
- Title: `Test Success`
- Message: `The workflow system is working!`

**Step 4 - Review:**
- Click **"Create"**

### 3. Run It
- Find your workflow in the list
- Click the **Settings (⚙️)** icon
- Click **"Run Now"**

### 4. Verify
- Check the **Recent Runs** panel on the right
- Status should show: **🟢 Completed**
- A notification should appear

---

## 5-Minute Setup for Event Automation

### Step 1: Set Up Cron Job

**Option A: Supabase Cron (Easiest)**

Go to Supabase Dashboard → SQL Editor and run:

```sql
SELECT cron.schedule(
  'process-pending-workflows',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-pending-workflows',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**Option B: External Service**

Use a free cron service like **cron-job.org**:

1. Sign up at https://cron-job.org
2. Create new cron job:
   - **URL**: `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-pending-workflows`
   - **Schedule**: Every 5 minutes
   - **Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyMDc0NjYsImV4cCI6MjA0Mjc4MzQ2Nn0.S4jqhpF2L6a8lQvGI3D5JO8L8OqfJXNH1PYVjYr6jQg
     Content-Type: application/json
     ```
   - **Body**: `{}`

### Step 2: Create Event-Based Workflow

**Training Hub → Automation → Create Workflow**

**Example: New Policy Welcome**
- **Trigger**: Event → `policy.created`
- **Action 1**: Create Notification
  - Title: `New Policy Added`
  - Message: `A new policy has been created`
- **Action 2** (Optional): Send Email
  - Template: Select welcome email template
  - Variables: Auto-populated from policy data

### Step 3: Test It

1. Go to **Policies** page
2. Create a new test policy
3. Wait 5 minutes (for cron to run)
4. Go back to **Training Hub → Automation → Recent Runs**
5. You should see your workflow executed

---

## Common Workflows

### 1. Daily Sales Summary
```
Trigger: Schedule → Daily at 8:00 AM
Actions:
  1. Create Notification: "Daily Sales Summary"
  2. Send Email: "Daily Report" template
```

### 2. Commission Chargeback Alert
```
Trigger: Event → commission.chargeback
Actions:
  1. Create Notification: "Chargeback Alert: $X"
  2. Send Email: "Chargeback Notification"
  3. Webhook: POST to Slack/Discord webhook
```

### 3. Recruit Onboarding Sequence
```
Trigger: Event → recruit.phase_changed
Actions:
  1. Send Email: "Welcome to Phase X"
  2. Wait: 1440 minutes (1 day)
  3. Create Notification: "Follow up with recruit"
```

### 4. Weekly Policy Renewal Reminder
```
Trigger: Schedule → Weekly on Monday at 9:00 AM
Actions:
  1. Webhook: GET upcoming renewals from API
  2. Send Email: "Upcoming Renewals" template
```

---

## Available Event Triggers

- `policy.created` - New policy added
- `commission.received` - Commission marked as received
- `commission.chargeback` - Chargeback created
- `recruit.phase_changed` - Recruit moves to new onboarding phase
- `time.daily` - Daily schedule
- `time.weekly` - Weekly schedule
- `time.monthly` - Monthly schedule
- `target.milestone_reached` - Goal achievement (not implemented yet)

---

## Available Actions

1. **Send Email**
   - Uses email templates
   - Variables auto-populated from event context
   - Queued for async sending

2. **Create Notification**
   - In-app notification
   - Appears in notification center
   - Customizable title and message

3. **Webhook**
   - POST/GET to external URL
   - Custom headers and body
   - Useful for Slack, Discord, Zapier integration

4. **Wait**
   - Delay between actions
   - Minutes/hours/days
   - Useful for drip campaigns

5. **Update Field**
   - Modify database records
   - Specify table, field, value
   - Use with caution (requires permissions)

---

## Troubleshooting

### Workflow Doesn't Show Up
- **Check**: You have Admin, Trainer, or Manager role
- **Fix**: Ask an admin to grant you the appropriate role

### Can't Create Workflow (Permission Error)
- **Check**: Your user role in Settings → Profile
- **Fix**: Need Admin, Trainer, or Manager role

### Event Workflow Doesn't Run
- **Check**: Cron job is set up (see Step 1 above)
- **Check**: Workflow status is "Active" (not "Draft" or "Paused")
- **Fix**: Activate the workflow from the Settings dropdown

### Action Fails
- **Email**: Verify email template exists
- **Webhook**: Check URL is accessible (test with Postman)
- **Notification**: Ensure recipient ID is valid

---

## Next Steps

1. ✅ Test manual workflow (60 seconds)
2. ⏱️ Set up cron job (5 minutes)
3. ⏱️ Create event-based workflow (5 minutes)
4. ⏱️ Test with real data (10 minutes)
5. 📖 Read full guide: `docs/WORKFLOW_SYSTEM_GUIDE.md`

---

## Support

**Check Logs:**
- Supabase Dashboard → Functions → process-workflow → Logs
- Browser Console (F12) for frontend errors

**Database Queries:**
```sql
-- Check pending runs
SELECT * FROM workflow_runs WHERE status = 'pending' ORDER BY started_at DESC;

-- Check failed runs
SELECT * FROM workflow_runs WHERE status = 'failed' ORDER BY started_at DESC LIMIT 5;

-- Check email queue
SELECT * FROM email_queue WHERE status != 'sent' ORDER BY created_at DESC LIMIT 5;
```

**Files:**
- Full documentation: `docs/WORKFLOW_SYSTEM_GUIDE.md`
- Implementation summary: `WORKFLOW_SYSTEM_FIXED.md`

---

**System Status**: ✅ All migrations applied, Edge Functions deployed, Build passing
**Last Verified**: December 10, 2025
