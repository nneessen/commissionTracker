-- supabase/migrations/reverts/20260106_007_instagram_replica_identity.sql
-- Reverts REPLICA IDENTITY FULL back to DEFAULT
-- Use this if realtime performance degrades or causes issues

-- Revert instagram_messages to default replica identity
ALTER TABLE instagram_messages REPLICA IDENTITY DEFAULT;

-- Revert instagram_conversations to default replica identity
ALTER TABLE instagram_conversations REPLICA IDENTITY DEFAULT;

-- Note: Reverting will disable filtered realtime subscriptions
-- The useInstagramRealtime hook will stop receiving live updates
