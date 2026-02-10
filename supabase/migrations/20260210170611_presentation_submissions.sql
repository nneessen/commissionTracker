-- supabase/migrations/20260210170611_presentation_submissions.sql
-- Presentation Submissions: Weekly agent recordings/uploads reviewed by management

-- ============================================================================
-- 1. presentation_submissions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS presentation_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  week_start DATE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER,
  recording_type TEXT NOT NULL DEFAULT 'upload',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_presentation_submissions_imo_id ON presentation_submissions(imo_id);
CREATE INDEX IF NOT EXISTS idx_presentation_submissions_agency_id ON presentation_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_presentation_submissions_user_id ON presentation_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_submissions_week_start ON presentation_submissions(week_start);
CREATE INDEX IF NOT EXISTS idx_presentation_submissions_status ON presentation_submissions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_presentation_submissions_user_week ON presentation_submissions(user_id, week_start);

-- ============================================================================
-- 3. RLS
-- ============================================================================
ALTER TABLE presentation_submissions ENABLE ROW LEVEL SECURITY;

-- Agents see own, staff see all in their IMO
DROP POLICY IF EXISTS "Users can view presentation submissions" ON presentation_submissions;
CREATE POLICY "Users can view presentation submissions"
ON presentation_submissions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

-- Agents insert own only
DROP POLICY IF EXISTS "Users can insert own submissions" ON presentation_submissions;
CREATE POLICY "Users can insert own submissions"
ON presentation_submissions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Agents can update own pending submissions (title/description only, not status)
DROP POLICY IF EXISTS "Agents can update own pending submissions" ON presentation_submissions;
CREATE POLICY "Agents can update own pending submissions"
ON presentation_submissions FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'pending'
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
);

-- Staff can update any submission in their IMO (for reviews)
DROP POLICY IF EXISTS "Staff can update submissions for review" ON presentation_submissions;
CREATE POLICY "Staff can update submissions for review"
ON presentation_submissions FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- Staff only can delete
DROP POLICY IF EXISTS "Staff can delete submissions" ON presentation_submissions;
CREATE POLICY "Staff can delete submissions"
ON presentation_submissions FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- ============================================================================
-- 4. Updated_at trigger
-- ============================================================================
CREATE OR REPLACE TRIGGER set_presentation_submissions_updated_at
  BEFORE UPDATE ON presentation_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Grants
-- ============================================================================
GRANT ALL ON presentation_submissions TO authenticated;

-- ============================================================================
-- 6. Storage bucket for presentation recordings
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentation-recordings',
  'presentation-recordings',
  false,
  524288000, -- 500MB
  ARRAY['video/webm', 'video/mp4', 'video/quicktime', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: agents upload/view own files, staff can view all
DROP POLICY IF EXISTS "presentation_recordings_insert" ON storage.objects;
CREATE POLICY "presentation_recordings_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'presentation-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "presentation_recordings_select" ON storage.objects;
CREATE POLICY "presentation_recordings_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'presentation-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::TEXT
    OR is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "presentation_recordings_delete" ON storage.objects;
CREATE POLICY "presentation_recordings_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'presentation-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::TEXT
    OR is_training_hub_staff(auth.uid())
  )
);
