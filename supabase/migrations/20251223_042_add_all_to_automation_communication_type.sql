-- supabase/migrations/20251223_042_add_all_to_automation_communication_type.sql
-- Add 'all' value to automation_communication_type enum
-- This enables the "All Channels" option in pipeline automations
-- which sends via email, notification, AND SMS simultaneously

ALTER TYPE automation_communication_type ADD VALUE IF NOT EXISTS 'all';
