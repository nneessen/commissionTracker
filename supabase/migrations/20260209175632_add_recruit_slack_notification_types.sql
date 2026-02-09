-- supabase/migrations/20260209175632_add_recruit_slack_notification_types.sql
-- Add 'new_recruit' and 'npn_received' notification types for recruit Slack channel posts

ALTER TYPE public.slack_notification_type ADD VALUE IF NOT EXISTS 'new_recruit';
ALTER TYPE public.slack_notification_type ADD VALUE IF NOT EXISTS 'npn_received';
