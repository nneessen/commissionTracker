-- Migration: 20251216_004_messages_hub_foundation.sql
-- Purpose: Create Communications Hub foundation tables
-- Tables: email_threads, email_labels, email_signatures, email_snippets
-- Modifications: user_emails new columns for threading and tracking

-- ============================================================================
-- TABLE: email_threads
-- Purpose: Group related emails into conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  subject_hash text NOT NULL, -- For faster matching (MD5 of normalized subject)
  participant_emails text[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 1,
  unread_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  labels uuid[] DEFAULT '{}', -- References email_labels
  snippet text, -- Preview of latest message (first 150 chars)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for email_threads
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_subject_hash ON email_threads(user_id, subject_hash);
CREATE INDEX IF NOT EXISTS idx_email_threads_labels ON email_threads USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_email_threads_archived ON email_threads(user_id, is_archived) WHERE is_archived = false;

-- ============================================================================
-- TABLE: email_labels
-- Purpose: User-defined labels for organization (Gmail-style)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280', -- Tailwind gray-500
  icon text, -- Optional lucide icon name
  is_system boolean NOT NULL DEFAULT false, -- For Inbox, Sent, Drafts, etc.
  sort_order integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0, -- Denormalized count
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_email_labels_user ON email_labels(user_id, sort_order);

-- ============================================================================
-- TABLE: email_signatures
-- Purpose: Rich email signatures with WYSIWYG content
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL, -- Plain text fallback
  is_default boolean NOT NULL DEFAULT false,
  include_social_links boolean DEFAULT true,
  social_links jsonb DEFAULT '{}', -- {linkedin: url, twitter: url, etc.}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one default signature per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_signatures_default
  ON email_signatures(user_id) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_email_signatures_user ON email_signatures(user_id);

-- ============================================================================
-- TABLE: email_snippets
-- Purpose: Quick reply snippets/canned responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  shortcut text, -- e.g., "/thanks" to trigger
  category text, -- For grouping: greeting, closing, follow-up, etc.
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_email_snippets_user ON email_snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_email_snippets_category ON email_snippets(user_id, category);

-- ============================================================================
-- MODIFY: user_emails - Add columns for threading and tracking
-- ============================================================================
DO $$
BEGIN
  -- Threading columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'thread_id') THEN
    ALTER TABLE user_emails ADD COLUMN thread_id uuid REFERENCES email_threads(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'is_read') THEN
    ALTER TABLE user_emails ADD COLUMN is_read boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'labels') THEN
    ALTER TABLE user_emails ADD COLUMN labels uuid[] DEFAULT '{}';
  END IF;

  -- Scheduling
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'scheduled_for') THEN
    ALTER TABLE user_emails ADD COLUMN scheduled_for timestamptz;
  END IF;

  -- Tracking columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'tracking_id') THEN
    ALTER TABLE user_emails ADD COLUMN tracking_id uuid DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'open_count') THEN
    ALTER TABLE user_emails ADD COLUMN open_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'first_opened_at') THEN
    ALTER TABLE user_emails ADD COLUMN first_opened_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'click_count') THEN
    ALTER TABLE user_emails ADD COLUMN click_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'first_clicked_at') THEN
    ALTER TABLE user_emails ADD COLUMN first_clicked_at timestamptz;
  END IF;

  -- Attachment tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'has_attachments') THEN
    ALTER TABLE user_emails ADD COLUMN has_attachments boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'attachment_count') THEN
    ALTER TABLE user_emails ADD COLUMN attachment_count integer DEFAULT 0;
  END IF;

  -- Email headers for threading
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'message_id_header') THEN
    ALTER TABLE user_emails ADD COLUMN message_id_header text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'in_reply_to_header') THEN
    ALTER TABLE user_emails ADD COLUMN in_reply_to_header text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'references_header') THEN
    ALTER TABLE user_emails ADD COLUMN references_header text[];
  END IF;

  -- Signature reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'signature_id') THEN
    ALTER TABLE user_emails ADD COLUMN signature_id uuid REFERENCES email_signatures(id) ON DELETE SET NULL;
  END IF;

  -- Source tracking (manual, workflow, bulk)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'source') THEN
    ALTER TABLE user_emails ADD COLUMN source text DEFAULT 'manual';
  END IF;

  -- Workflow reference if sent by workflow
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'workflow_id') THEN
    ALTER TABLE user_emails ADD COLUMN workflow_id uuid;
  END IF;

  -- Campaign reference if part of bulk send
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'campaign_id') THEN
    ALTER TABLE user_emails ADD COLUMN campaign_id uuid;
  END IF;
END $$;

-- Indexes for user_emails new columns
CREATE INDEX IF NOT EXISTS idx_user_emails_thread ON user_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_tracking ON user_emails(tracking_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_scheduled ON user_emails(scheduled_for)
  WHERE scheduled_for IS NOT NULL AND status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_user_emails_source ON user_emails(source);
CREATE INDEX IF NOT EXISTS idx_user_emails_labels ON user_emails USING GIN(labels);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_snippets ENABLE ROW LEVEL SECURITY;

-- email_threads policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads' AND policyname = 'Users can view own threads') THEN
    CREATE POLICY "Users can view own threads" ON email_threads FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads' AND policyname = 'Users can insert own threads') THEN
    CREATE POLICY "Users can insert own threads" ON email_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads' AND policyname = 'Users can update own threads') THEN
    CREATE POLICY "Users can update own threads" ON email_threads FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_threads' AND policyname = 'Users can delete own threads') THEN
    CREATE POLICY "Users can delete own threads" ON email_threads FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- email_labels policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_labels' AND policyname = 'Users can view own labels') THEN
    CREATE POLICY "Users can view own labels" ON email_labels FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_labels' AND policyname = 'Users can insert own labels') THEN
    CREATE POLICY "Users can insert own labels" ON email_labels FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_labels' AND policyname = 'Users can update own labels') THEN
    CREATE POLICY "Users can update own labels" ON email_labels FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_labels' AND policyname = 'Users can delete own labels') THEN
    CREATE POLICY "Users can delete own labels" ON email_labels FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- email_signatures policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can view own signatures') THEN
    CREATE POLICY "Users can view own signatures" ON email_signatures FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can insert own signatures') THEN
    CREATE POLICY "Users can insert own signatures" ON email_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can update own signatures') THEN
    CREATE POLICY "Users can update own signatures" ON email_signatures FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_signatures' AND policyname = 'Users can delete own signatures') THEN
    CREATE POLICY "Users can delete own signatures" ON email_signatures FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- email_snippets policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_snippets' AND policyname = 'Users can view own snippets') THEN
    CREATE POLICY "Users can view own snippets" ON email_snippets FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_snippets' AND policyname = 'Users can insert own snippets') THEN
    CREATE POLICY "Users can insert own snippets" ON email_snippets FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_snippets' AND policyname = 'Users can update own snippets') THEN
    CREATE POLICY "Users can update own snippets" ON email_snippets FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_snippets' AND policyname = 'Users can delete own snippets') THEN
    CREATE POLICY "Users can delete own snippets" ON email_snippets FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to normalize email subject (remove Re:, Fwd:, etc.)
CREATE OR REPLACE FUNCTION normalize_email_subject(subject text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN TRIM(regexp_replace(
    subject,
    '^(Re:|Fwd:|Fw:|RE:|FWD:|FW:|\s)+',
    '',
    'gi'
  ));
END;
$$;

-- Function to generate subject hash for thread matching
CREATE OR REPLACE FUNCTION email_subject_hash(subject text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN md5(lower(normalize_email_subject(subject)));
END;
$$;

-- Function to update thread metadata when a message is added
CREATE OR REPLACE FUNCTION update_thread_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE email_threads
    SET
      last_message_at = GREATEST(last_message_at, NEW.created_at),
      message_count = message_count + 1,
      unread_count = CASE WHEN NEW.is_incoming AND NOT NEW.is_read THEN unread_count + 1 ELSE unread_count END,
      snippet = LEFT(COALESCE(NEW.body_text, ''), 150),
      participant_emails = ARRAY(
        SELECT DISTINCT unnest(
          participant_emails ||
          COALESCE(NEW.to_addresses, '{}') ||
          ARRAY[COALESCE(NEW.from_address, '')]
        )
      ),
      updated_at = now()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update thread when email is inserted
DROP TRIGGER IF EXISTS trigger_update_thread_metadata ON user_emails;
CREATE TRIGGER trigger_update_thread_metadata
  AFTER INSERT ON user_emails
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_metadata();

-- Function to mark thread as read
CREATE OR REPLACE FUNCTION mark_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all unread messages in thread
  UPDATE user_emails
  SET is_read = true
  WHERE thread_id = p_thread_id AND is_read = false;

  -- Reset unread count on thread
  UPDATE email_threads
  SET unread_count = 0, updated_at = now()
  WHERE id = p_thread_id;
END;
$$;

-- ============================================================================
-- SEED SYSTEM LABELS FUNCTION
-- Called when user first accesses Messages
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_system_labels(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  system_labels text[] := ARRAY['Inbox', 'Sent', 'Drafts', 'Scheduled', 'Archived', 'Important', 'Spam'];
  system_colors text[] := ARRAY['#3B82F6', '#10B981', '#6B7280', '#F59E0B', '#6B7280', '#EF4444', '#DC2626'];
  i integer;
BEGIN
  FOR i IN 1..array_length(system_labels, 1) LOOP
    INSERT INTO email_labels (user_id, name, color, is_system, sort_order)
    VALUES (p_user_id, system_labels[i], system_colors[i], true, i)
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION normalize_email_subject(text) TO authenticated;
GRANT EXECUTE ON FUNCTION email_subject_hash(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_thread_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_system_labels(uuid) TO authenticated;
