-- supabase/migrations/20251126205911_create_user_documents.sql
-- Create user_documents table for tracking recruit/agent documents
-- Files stored in Supabase Storage, metadata tracked here

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'application',
    'background_check',
    'license',
    'contract',
    'resume',
    'identification',
    'certification',
    'other'
  )),
  document_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'received',
    'approved',
    'rejected',
    'expired'
  )),
  uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  required BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id
  ON user_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_document_type
  ON user_documents(user_id, document_type);

CREATE INDEX IF NOT EXISTS idx_user_documents_status
  ON user_documents(status);

CREATE INDEX IF NOT EXISTS idx_user_documents_expires_at
  ON user_documents(expires_at)
  WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own documents, recruiters can view their recruits' documents
CREATE POLICY "Users can view their own documents"
  ON user_documents FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = user_documents.user_id
    )
  );

CREATE POLICY "Recruiters can view their recruits' documents"
  ON user_documents FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_documents.user_id
      )
    )
  );

CREATE POLICY "Recruiters can insert documents for their recruits"
  ON user_documents FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_documents.user_id
      )
    )
  );

CREATE POLICY "Recruiters can update their recruits' documents"
  ON user_documents FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_documents.user_id
      )
    )
  );

CREATE POLICY "Recruiters can delete their recruits' documents"
  ON user_documents FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_documents.user_id
      )
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_documents_updated_at ON user_documents;
CREATE TRIGGER trigger_user_documents_updated_at
  BEFORE UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_documents_updated_at();

-- Add comments
COMMENT ON TABLE user_documents IS
  'Document tracking for recruits and agents. Files stored in Supabase Storage at storage_path.';

COMMENT ON COLUMN user_documents.storage_path IS
  'Path in Supabase Storage bucket (e.g., documents/user_id/filename.pdf)';

COMMENT ON COLUMN user_documents.required IS
  'Whether this document is required for onboarding completion';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_user_documents_updated_at ON user_documents;
DROP FUNCTION IF EXISTS update_user_documents_updated_at();
DROP TABLE IF EXISTS user_documents CASCADE;
*/
