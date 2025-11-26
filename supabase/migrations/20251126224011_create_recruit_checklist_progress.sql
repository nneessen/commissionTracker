-- supabase/migrations/20251126224011_create_recruit_checklist_progress.sql
-- Create recruit_checklist_progress table - track completion of individual checklist items
-- Links to user_documents for document_upload type items

CREATE TABLE IF NOT EXISTS recruit_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES phase_checklist_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed',
    'approved',
    'rejected',
    'needs_resubmission'
  )),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES user_profiles(id),
  rejection_reason TEXT,
  document_id UUID REFERENCES user_documents(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checklist_item_id)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_user_id
  ON recruit_checklist_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_checklist_item_id
  ON recruit_checklist_progress(checklist_item_id);

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_status
  ON recruit_checklist_progress(status);

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_user_status
  ON recruit_checklist_progress(user_id, status);

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_document_id
  ON recruit_checklist_progress(document_id)
  WHERE document_id IS NOT NULL;

-- Enable RLS
ALTER TABLE recruit_checklist_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own checklist progress
CREATE POLICY "Users can view their own checklist progress"
  ON recruit_checklist_progress FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = recruit_checklist_progress.user_id
    )
  );

-- Recruiters can view their recruits' checklist progress
CREATE POLICY "Recruiters can view their recruits' checklist progress"
  ON recruit_checklist_progress FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = recruit_checklist_progress.user_id
      )
    )
  );

-- Users can update their own checklist progress (mark tasks complete, upload docs)
CREATE POLICY "Users can update their own checklist progress"
  ON recruit_checklist_progress FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = recruit_checklist_progress.user_id
    )
  );

-- Recruiters can update their recruits' checklist progress (approve, reject)
CREATE POLICY "Recruiters can update their recruits' checklist progress"
  ON recruit_checklist_progress FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = recruit_checklist_progress.user_id
      )
    )
  );

-- System can insert checklist progress (via triggers)
CREATE POLICY "Authenticated users can insert checklist progress"
  ON recruit_checklist_progress FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_recruit_checklist_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recruit_checklist_progress_updated_at ON recruit_checklist_progress;
CREATE TRIGGER trigger_recruit_checklist_progress_updated_at
  BEFORE UPDATE ON recruit_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_recruit_checklist_progress_updated_at();

-- Add comments
COMMENT ON TABLE recruit_checklist_progress IS
  'Tracks completion status of individual checklist items per recruit. Links to user_documents for document_upload items.';

COMMENT ON COLUMN recruit_checklist_progress.status IS
  'Workflow: not_started ’ in_progress ’ completed ’ (if verification required) ’ approved/rejected ’ (if rejected) ’ needs_resubmission';

COMMENT ON COLUMN recruit_checklist_progress.completed_by IS
  'Who completed the item (recruit, upline, or system)';

COMMENT ON COLUMN recruit_checklist_progress.verified_by IS
  'Who verified/approved the item (upline or system). Only used if checklist_item.requires_verification = true';

COMMENT ON COLUMN recruit_checklist_progress.document_id IS
  'Links to user_documents table for document_upload type checklist items';

COMMENT ON COLUMN recruit_checklist_progress.metadata IS
  'Additional data specific to item type (e.g., training completion certificate URL, signature timestamp, API response from automated check)';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_recruit_checklist_progress_updated_at ON recruit_checklist_progress;
DROP FUNCTION IF EXISTS update_recruit_checklist_progress_updated_at();
DROP TABLE IF EXISTS recruit_checklist_progress CASCADE;
*/
