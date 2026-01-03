-- supabase/migrations/20260103_004_instagram_enums.sql
-- Instagram DM Integration - Enum Types

-- Connection status for Instagram integrations
CREATE TYPE instagram_connection_status AS ENUM (
  'connected',
  'disconnected',
  'expired',
  'error'
);

-- Message types supported by Instagram DM API
CREATE TYPE instagram_message_type AS ENUM (
  'text',
  'media',
  'story_reply',
  'story_mention'
);

-- Message delivery/read status
CREATE TYPE instagram_message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- Direction of message (inbound from contact, outbound from user)
CREATE TYPE message_direction AS ENUM (
  'inbound',
  'outbound'
);

-- Status for scheduled/automated messages
CREATE TYPE scheduled_message_status AS ENUM (
  'pending',
  'sent',
  'cancelled',
  'failed',
  'expired'
);

COMMENT ON TYPE instagram_connection_status IS 'Connection status for Instagram OAuth integrations';
COMMENT ON TYPE instagram_message_type IS 'Types of Instagram DM messages';
COMMENT ON TYPE instagram_message_status IS 'Delivery status for Instagram messages';
COMMENT ON TYPE message_direction IS 'Direction of message flow - inbound (received) or outbound (sent)';
COMMENT ON TYPE scheduled_message_status IS 'Status of scheduled/automated Instagram messages';
