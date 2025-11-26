-- supabase/migrations/20251126205947_create_user_emails.sql
-- Create user_emails and user_email_attachments tables
-- Track email communication with recruits/agents

CREATE TABLE IF NOT EXISTS user_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'sending',
    'sent',
    'delivered',
    'opened',
    'failed'
  )),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_email_attachments table
CREATE TABLE IF NOT EXISTS user_email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES user_emails(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add performance indexes for user_emails
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id
  ON user_emails(user_id);

CREATE INDEX IF NOT EXISTS idx_user_emails_sender_id
  ON user_emails(sender_id);

CREATE INDEX IF NOT EXISTS idx_user_emails_user_sent_at
  ON user_emails(user_id, sent_at DESC)
  WHERE sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_emails_status
  ON user_emails(status);

-- Add performance indexes for user_email_attachments
CREATE INDEX IF NOT EXISTS idx_user_email_attachments_email_id
  ON user_email_attachments(email_id);

-- Enable RLS on user_emails
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_emails
CREATE POLICY "Users can view emails sent to them"
  ON user_emails FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = user_emails.user_id
    )
  );

CREATE POLICY "Senders can view emails they sent"
  ON user_emails FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = user_emails.sender_id
    )
  );

CREATE POLICY "Recruiters can view emails for their recruits"
  ON user_emails FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_emails.user_id
      )
    )
  );

CREATE POLICY "Users can insert emails for their recruits"
  ON user_emails FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_emails.user_id
      )
    )
  );

CREATE POLICY "Senders can update their own emails"
  ON user_emails FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = user_emails.sender_id
    )
  );

-- Enable RLS on user_email_attachments
ALTER TABLE user_email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_email_attachments (inherit from email permissions)
CREATE POLICY "Users can view attachments for emails they can view"
  ON user_email_attachments FOR SELECT
  USING (
    email_id IN (
      SELECT id FROM user_emails
      WHERE auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE id = user_emails.user_id
      )
      OR auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE id = user_emails.sender_id
      )
      OR auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE id = (
          SELECT recruiter_id FROM user_profiles WHERE id = user_emails.user_id
        )
      )
    )
  );

CREATE POLICY "Users can insert attachments for emails they created"
  ON user_email_attachments FOR INSERT
  WITH CHECK (
    email_id IN (
      SELECT id FROM user_emails
      WHERE auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE id = user_emails.sender_id
      )
    )
  );

-- Add updated_at trigger for user_emails
CREATE OR REPLACE FUNCTION update_user_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_emails_updated_at ON user_emails;
CREATE TRIGGER trigger_user_emails_updated_at
  BEFORE UPDATE ON user_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_user_emails_updated_at();

-- Add comments
COMMENT ON TABLE user_emails IS
  'Email communication history with recruits and agents';

COMMENT ON TABLE user_email_attachments IS
  'File attachments for emails. Files stored in Supabase Storage.';

COMMENT ON COLUMN user_emails.metadata IS
  'Additional email metadata (email provider response, tracking IDs, etc.)';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_user_emails_updated_at ON user_emails;
DROP FUNCTION IF EXISTS update_user_emails_updated_at();
DROP TABLE IF EXISTS user_email_attachments CASCADE;
DROP TABLE IF EXISTS user_emails CASCADE;
*/
