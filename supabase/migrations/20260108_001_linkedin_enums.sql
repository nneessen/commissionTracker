-- supabase/migrations/20260108_001_linkedin_enums.sql
-- LinkedIn DM Integration via Unipile - Enum Types

-- Connection status for LinkedIn integrations (via Unipile)
CREATE TYPE linkedin_connection_status AS ENUM (
  'connected',      -- Active and functional
  'disconnected',   -- User disconnected voluntarily
  'credentials',    -- Needs reconnection (Unipile session expired)
  'error'           -- API error state
);

-- Message types supported by LinkedIn DM
CREATE TYPE linkedin_message_type AS ENUM (
  'text',
  'media',
  'inmail',              -- Sponsored/paid InMail
  'invitation_message'   -- Message sent with connection request
);

COMMENT ON TYPE linkedin_connection_status IS 'Connection status for LinkedIn integrations via Unipile';
COMMENT ON TYPE linkedin_message_type IS 'Types of LinkedIn DM messages';

-- Note: message_direction, scheduled_message_status, instagram_message_status
-- already exist from Instagram migration and will be reused for LinkedIn
