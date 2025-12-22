# Phase 9: Report Export Enhancement - Scheduled Reports

**Date:** 2025-12-22
**Status:** Implementation Complete - Pending Database Migration

## Summary

Implemented automated scheduled report delivery system with org-scoped access control.

## Features Delivered

### Database Schema
- `scheduled_reports` table - Stores schedule configuration
- `scheduled_report_deliveries` table - Delivery audit log
- `report_frequency` enum - weekly, monthly, quarterly

### RLS Policies
- Super admins: full access
- Owners: CRUD on own schedules
- IMO admins: view IMO schedules
- Agency owners: view agency schedules

### RPCs Created
- `calculate_next_delivery` - Calculate next delivery timestamp
- `validate_schedule_recipients` - Ensure recipients are org members
- `get_eligible_recipients` - List org members for recipient selection
- `create_scheduled_report` - Create with validation
- `update_scheduled_report` - Update with validation
- `get_my_scheduled_reports` - List user's schedules with stats
- `get_schedule_delivery_history` - Get delivery audit log
- `get_due_scheduled_reports` - For edge function processing
- `complete_scheduled_delivery` - Mark delivery complete

### Edge Function
`supabase/functions/process-scheduled-reports/index.ts`
- Queries due schedules
- Generates report data via existing RPCs
- Formats as CSV or HTML email
- Sends via Mailgun with optional CSV attachment
- Logs delivery to audit table
- Updates next_delivery timestamp

### Frontend Components
1. `ReportScheduleDialog.tsx` - Create/edit schedule modal
2. `ScheduledReportsManager.tsx` - List/manage schedules with delivery history

### React Query Hooks
`src/hooks/reports/scheduled/useScheduledReports.ts`
- useMyScheduledReports
- useScheduleDeliveryHistory
- useEligibleRecipients
- useCreateScheduledReport
- useUpdateScheduledReport
- useToggleScheduleActive
- useDeleteScheduledReport

### TypeScript Types
`src/types/scheduled-reports.types.ts`
- Full type definitions for schedules and deliveries
- Zod schemas for runtime validation
- Constants for report types and frequencies

## Integration Points

- ReportsDashboard.tsx: Added "Schedule" button that toggles ScheduledReportsManager panel
- Recipients validated to be org members (IMO or Agency scoped)

## Files Created/Modified

### New Migrations
- `supabase/migrations/20251222_018_scheduled_reports.sql`
- `supabase/migrations/20251222_019_scheduled_reports_rls.sql`
- `supabase/migrations/20251222_020_scheduled_reports_rpcs.sql`

### New Edge Function
- `supabase/functions/process-scheduled-reports/index.ts`

### New Frontend Files
- `src/types/scheduled-reports.types.ts`
- `src/hooks/reports/scheduled/useScheduledReports.ts`
- `src/hooks/reports/scheduled/index.ts`
- `src/hooks/reports/index.ts`
- `src/features/reports/components/ReportScheduleDialog.tsx`
- `src/features/reports/components/ScheduledReportsManager.tsx`

### Modified Files
- `src/features/reports/ReportsDashboard.tsx` - Added schedule button and manager panel

## Pending Steps

1. Apply migrations to database:
   ```bash
   scripts/apply-migration.sh 20251222_018_scheduled_reports.sql
   scripts/apply-migration.sh 20251222_019_scheduled_reports_rls.sql
   scripts/apply-migration.sh 20251222_020_scheduled_reports_rpcs.sql
   ```

2. Deploy edge function:
   ```bash
   npx supabase functions deploy process-scheduled-reports
   ```

3. Set up external cron (Vercel/GitHub Actions) to call:
   ```
   POST https://[project-ref].supabase.co/functions/v1/process-scheduled-reports
   Authorization: Bearer [CRON_SECRET]
   ```

4. Add CRON_SECRET to Supabase secrets:
   ```bash
   npx supabase secrets set CRON_SECRET=your-secret-here
   ```

## Report Types Supported

- imo-performance
- agency-performance
- team-comparison
- top-performers
- recruiting-summary
- override-summary
- executive-dashboard

## Delivery Options

- Frequency: Weekly, Monthly, Quarterly
- Format: PDF (HTML email) or CSV (with attachment)
- Recipients: Only org members (validated)
