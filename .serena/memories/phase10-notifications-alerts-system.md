# Phase 10: Notifications & Alerts System

**Date:** 2025-12-22
**Status:** Implementation Complete - Pending Deployment

## Summary

Implemented configurable alert rules system with email digest delivery for org-scoped notifications.

## Features Delivered

### Database Schema
- `alert_rules` table - Configurable alert thresholds per user/org
- `alert_rule_evaluations` table - Evaluation audit log
- `notification_digest_log` table - Email digest delivery tracking
- `alert_metric` enum - 9 metric types (policy_lapse, target_miss, recruit_stall, etc.)
- `alert_comparison` enum - Comparison operators (lt, lte, gt, gte, eq)

### RLS Policies
- Super admins: full access to all alert rules
- Owners: CRUD on own rules
- IMO admins: view IMO rules
- Agency owners: view agency rules

### RPCs Created
- `get_alertable_metrics` - Available metrics for user's role
- `get_my_alert_rules` - User's alert rules with owner info
- `create_alert_rule` - Create with validation
- `update_alert_rule` - Update with validation
- `toggle_alert_rule_active` - Enable/disable rule
- `delete_alert_rule` - Delete rule
- `get_alert_rule_history` - Evaluation history
- `get_my_notification_preferences` - Get/create user prefs
- `update_my_notification_preferences` - Update user prefs
- `get_due_alert_rules` - For edge function
- `record_alert_evaluation` - Log evaluation results

### Edge Functions
1. `evaluate-alerts` - Evaluates active alert rules every 15 minutes
   - Supports: policy_lapse_warning, license_expiration, recruit_stall, new_policy_count, commission_threshold
   - Creates notifications when thresholds exceeded
   - Respects cooldown periods

2. `send-notification-digests` - Sends email digests to opted-in users
   - Supports daily and weekly frequencies
   - Uses Resend for email delivery
   - Tracks delivery history

### Frontend Components
1. `NotificationsSettingsPage` - Main page with Preferences and Alert Rules tabs
2. `NotificationPreferencesSection` - In-app, email digest, quiet hours settings
3. `AlertRulesSection` - List and manage alert rules
4. `AlertRuleDialog` - Create/edit alert rules
5. `AlertRuleHistoryDialog` - View evaluation history

### React Query Hooks
- useAlertRules, useAlertableMetrics, useAlertRuleHistory
- useCreateAlertRule, useUpdateAlertRule, useToggleAlertRule, useDeleteAlertRule
- useNotificationPreferences, useUpdateNotificationPreferences

### TypeScript Types
- `src/types/alert-rules.types.ts` - Full type definitions with Zod schemas

## Integration Points

- Settings Dashboard: Added "Notifications" tab
- Existing notifications table: Used for alert notifications
- Existing notification_preferences table: Added last_digest_sent_at column

## Files Created

### Migrations
- `supabase/migrations/20251222_021_alert_rules.sql`
- `supabase/migrations/20251222_022_alert_rules_rls.sql`
- `supabase/migrations/20251222_023_alert_rules_rpcs.sql`

### Edge Functions
- `supabase/functions/evaluate-alerts/index.ts`
- `supabase/functions/send-notification-digests/index.ts`

### Frontend
- `src/types/alert-rules.types.ts`
- `src/hooks/alerts/useAlertRules.ts`
- `src/hooks/alerts/useNotificationPreferences.ts`
- `src/hooks/alerts/index.ts`
- `src/features/settings/notifications/NotificationsSettingsPage.tsx`
- `src/features/settings/notifications/components/NotificationPreferencesSection.tsx`
- `src/features/settings/notifications/components/AlertRulesSection.tsx`
- `src/features/settings/notifications/components/AlertRuleDialog.tsx`
- `src/features/settings/notifications/components/AlertRuleHistoryDialog.tsx`
- `src/features/settings/notifications/components/index.ts`
- `src/features/settings/notifications/index.ts`

### GitHub Actions
- `.github/workflows/evaluate-alerts.yml`
- `.github/workflows/notification-digests.yml`

### Modified Files
- `src/features/settings/SettingsDashboard.tsx` - Added Notifications tab

## Pending Steps

1. Deploy edge functions:
   ```bash
   npx supabase functions deploy evaluate-alerts
   npx supabase functions deploy send-notification-digests
   ```

2. Verify GitHub secrets:
   - `SUPABASE_SERVICE_ROLE_KEY` must be set for cron jobs

## Alert Metrics Available

| Metric | Description | Unit | Default Comparison |
|--------|-------------|------|-------------------|
| policy_lapse_warning | Policy approaching lapse | days | <= 30 |
| target_miss_risk | Pacing behind target | percent | < 80 |
| commission_threshold | Commission below threshold | currency | < 1000 |
| new_policy_count | Policies below expected | count | < 5 |
| recruit_stall | Recruit stuck in phase | days | >= 14 |
| override_change | Override commission changed | percent | >= 10 |
| team_production_drop | Team production decreased | percent | >= 20 |
| persistency_warning | Persistency rate low | percent | < 85 |
| license_expiration | License expiring soon | days | <= 60 |

## Notification Preferences

- In-app notifications (on/off)
- Email digest (daily/weekly)
- Preferred delivery time and timezone
- Quiet hours configuration
