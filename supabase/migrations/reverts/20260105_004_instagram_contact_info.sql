-- supabase/migrations/reverts/20260105_004_instagram_contact_info.sql
-- Revert migration: Remove contact info columns from instagram_conversations

-- Drop indexes first
DROP INDEX IF EXISTS idx_instagram_conversations_participant_email;
DROP INDEX IF EXISTS idx_instagram_conversations_participant_phone;

-- Drop columns
ALTER TABLE instagram_conversations DROP COLUMN IF EXISTS participant_email;
ALTER TABLE instagram_conversations DROP COLUMN IF EXISTS participant_phone;
ALTER TABLE instagram_conversations DROP COLUMN IF EXISTS contact_notes;
