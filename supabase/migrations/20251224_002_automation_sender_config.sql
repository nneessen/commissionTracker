-- ============================================================================
-- Add Sender Configuration to Pipeline Automations
-- ============================================================================
-- Adds sender_type, sender_email, and sender_name columns to configure
-- who emails/SMS messages should come FROM.
-- ============================================================================

BEGIN;

-- Add sender_type column
-- Values: 'system', 'upline', 'trainer', 'contracting_manager', 'custom'
ALTER TABLE pipeline_automations
ADD COLUMN IF NOT EXISTS sender_type text DEFAULT 'system';

-- Add sender_email for custom sender override
ALTER TABLE pipeline_automations
ADD COLUMN IF NOT EXISTS sender_email text;

-- Add sender_name for display name override
ALTER TABLE pipeline_automations
ADD COLUMN IF NOT EXISTS sender_name text;

-- Add check constraint for valid sender_type values
ALTER TABLE pipeline_automations
ADD CONSTRAINT sender_type_check
CHECK (sender_type IS NULL OR sender_type IN ('system', 'upline', 'trainer', 'contracting_manager', 'custom'));

-- Add comment for documentation
COMMENT ON COLUMN pipeline_automations.sender_type IS
'Who sends the communication: system (default), upline, trainer, contracting_manager, or custom';

COMMENT ON COLUMN pipeline_automations.sender_email IS
'Custom sender email address (only used when sender_type = custom)';

COMMENT ON COLUMN pipeline_automations.sender_name IS
'Custom sender display name (optional override for any sender_type)';

COMMIT;
