-- supabase/migrations/20260105_004_instagram_contact_info.sql
-- Add manually-entered contact info columns to instagram_conversations

-- Add contact info columns for manual entry
ALTER TABLE instagram_conversations
ADD COLUMN IF NOT EXISTS participant_email TEXT,
ADD COLUMN IF NOT EXISTS participant_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN instagram_conversations.participant_email IS 'Manually entered email collected during conversation';
COMMENT ON COLUMN instagram_conversations.participant_phone IS 'Manually entered phone collected during conversation';
COMMENT ON COLUMN instagram_conversations.contact_notes IS 'Free-form notes about the participant';

-- Create index for searching by contact info
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_participant_email
ON instagram_conversations(participant_email)
WHERE participant_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_participant_phone
ON instagram_conversations(participant_phone)
WHERE participant_phone IS NOT NULL;
