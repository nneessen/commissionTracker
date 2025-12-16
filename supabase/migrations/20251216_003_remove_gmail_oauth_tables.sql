-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251216_003_remove_gmail_oauth_tables.sql
-- Migration: Remove Gmail OAuth tables
--
-- REASON: We've consolidated email sending to use Resend API only.
-- Gmail OAuth is no longer needed. All email sending now goes through
-- the send-automated-email edge function which uses Resend.
--
-- TABLES DROPPED:
-- - user_email_oauth_tokens: Stored Gmail/Outlook OAuth tokens
-- - email_watch_subscriptions: Gmail push notification subscriptions
--
-- KEPT TABLES (still used):
-- - email_quota_tracking: Now tracks Resend API usage
-- - email_queue: Email queue for scheduled sending
-- - email_templates: Email template storage
-- - user_emails: Email history/records
--
-- APPLIED: 2025-12-16

-- Drop Gmail OAuth tables (no longer needed)
DROP TABLE IF EXISTS email_watch_subscriptions CASCADE;
DROP TABLE IF EXISTS user_email_oauth_tokens CASCADE;

-- Add comment to document the change
COMMENT ON TABLE email_quota_tracking IS
'Tracks daily email usage per user. Provider is now "resend" for all emails.';
