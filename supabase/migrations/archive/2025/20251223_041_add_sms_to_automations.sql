-- supabase/migrations/20251223_041_add_sms_to_automations.sql
-- Add SMS support to pipeline automations

-- Add 'sms' value to automation_communication_type enum
ALTER TYPE automation_communication_type ADD VALUE 'sms';

-- Add SMS content columns to pipeline_automations table
ALTER TABLE pipeline_automations
  ADD COLUMN sms_message TEXT;

-- Comment for documentation
COMMENT ON COLUMN pipeline_automations.sms_message IS 'SMS message content with template variables support';
