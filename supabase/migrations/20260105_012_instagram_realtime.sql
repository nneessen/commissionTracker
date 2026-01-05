-- supabase/migrations/20260105_012_instagram_realtime.sql
-- Enable Supabase Realtime for Instagram tables
-- Allows live message updates without polling

-- Enable realtime for instagram_messages
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_messages;

-- Enable realtime for instagram_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_conversations;

-- Comment on change
COMMENT ON TABLE instagram_messages IS 'Instagram DM messages. Realtime enabled for live updates.';
COMMENT ON TABLE instagram_conversations IS 'Instagram DM conversations. Realtime enabled for live updates.';
