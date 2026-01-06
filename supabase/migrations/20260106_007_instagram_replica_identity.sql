-- supabase/migrations/20260106_007_instagram_replica_identity.sql
-- Enable REPLICA IDENTITY FULL for filtered realtime subscriptions
-- Required for conversation_id and integration_id filter conditions
-- Without this, Supabase Realtime cannot match rows to filters

-- Set REPLICA IDENTITY FULL on instagram_messages
-- This allows filtered subscriptions like: filter: `conversation_id=eq.${id}`
ALTER TABLE instagram_messages REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY FULL on instagram_conversations
-- This allows filtered subscriptions like: filter: `integration_id=eq.${id}`
ALTER TABLE instagram_conversations REPLICA IDENTITY FULL;

-- Add comments documenting the change
COMMENT ON TABLE instagram_messages IS 'Instagram DM messages. Realtime enabled with REPLICA IDENTITY FULL for filtered subscriptions.';
COMMENT ON TABLE instagram_conversations IS 'Instagram DM conversations. Realtime enabled with REPLICA IDENTITY FULL for filtered subscriptions.';
