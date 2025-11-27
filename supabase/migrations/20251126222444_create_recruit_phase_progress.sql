-- supabase/migrations/20251126222444_create_recruit_phase_progress.sql
-- Create recruit_phase_progress table - track which phase each recruit is in
-- This replaces the old hardcoded onboarding_phases table

CREATE TABLE IF NOT EXISTS recruit_phase_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES pipeline_phases(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES pipeline_templates(id),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed',
    'blocked',
    'skipped'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phase_id)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_user_id
  ON recruit_phase_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_phase_id
  ON recruit_phase_progress(phase_id);

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_template_id
  ON recruit_phase_progress(template_id);

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_status
  ON recruit_phase_progress(status);

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_user_status
  ON recruit_phase_progress(user_id, status);

-- Enable RLS
ALTER TABLE recruit_phase_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own progress
CREATE POLICY "Users can view their own phase progress"
  ON recruit_phase_progress FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = recruit_phase_progress.user_id
    )
  );

-- Recruiters can view their recruits' progress
CREATE POLICY "Recruiters can view their recruits' phase progress"
  ON recruit_phase_progress FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = recruit_phase_progress.user_id
      )
    )
  );

-- Recruiters can update their recruits' progress
CREATE POLICY "Recruiters can update their recruits' phase progress"
  ON recruit_phase_progress FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = recruit_phase_progress.user_id
      )
    )
  );

-- Authenticated users can insert phase progress
CREATE POLICY "Authenticated users can insert phase progress"
  ON recruit_phase_progress FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_recruit_phase_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recruit_phase_progress_updated_at ON recruit_phase_progress;
CREATE TRIGGER trigger_recruit_phase_progress_updated_at
  BEFORE UPDATE ON recruit_phase_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_recruit_phase_progress_updated_at();

-- Add comments
COMMENT ON TABLE recruit_phase_progress IS
  'Tracks which phase each recruit is in. Linked to configurable pipeline_phases, not hardcoded enums.';

COMMENT ON COLUMN recruit_phase_progress.template_id IS
  'Locks recruit to specific template version. If template changes, existing recruits continue with their original version.';

COMMENT ON COLUMN recruit_phase_progress.status IS
  'not_started: phase not yet begun, in_progress: currently working, completed: finished, blocked: stuck (requires intervention), skipped: phase was bypassed';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_recruit_phase_progress_updated_at ON recruit_phase_progress;
DROP FUNCTION IF EXISTS update_recruit_phase_progress_updated_at();
DROP TABLE IF EXISTS recruit_phase_progress CASCADE;
*/
