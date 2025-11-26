-- supabase/migrations/20251126205833_create_onboarding_phases.sql
-- Create onboarding_phases table to track 8-phase recruiting process
-- Auto-creates 8 phases when user.onboarding_status changes to 'lead'

-- Create onboarding_phases table
CREATE TABLE IF NOT EXISTS onboarding_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL CHECK (phase_name IN (
    'initial_contact',
    'application',
    'background_check',
    'pre_licensing',
    'exam',
    'state_license',
    'contracting',
    'complete'
  )),
  phase_order INTEGER NOT NULL CHECK (phase_order BETWEEN 1 AND 8),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed',
    'blocked'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phase_name),
  UNIQUE(user_id, phase_order)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_phases_user_id
  ON onboarding_phases(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_phases_user_phase_order
  ON onboarding_phases(user_id, phase_order);

CREATE INDEX IF NOT EXISTS idx_onboarding_phases_status
  ON onboarding_phases(status);

-- Enable RLS
ALTER TABLE onboarding_phases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read their own phases, recruiters can read their recruits' phases
CREATE POLICY "Users can view their own onboarding phases"
  ON onboarding_phases FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = onboarding_phases.user_id
    )
  );

CREATE POLICY "Recruiters can view their recruits' onboarding phases"
  ON onboarding_phases FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = onboarding_phases.user_id
      )
    )
  );

CREATE POLICY "Recruiters can update their recruits' onboarding phases"
  ON onboarding_phases FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = onboarding_phases.user_id
      )
    )
  );

CREATE POLICY "Recruiters can insert onboarding phases for their recruits"
  ON onboarding_phases FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = onboarding_phases.user_id
      )
    )
  );

-- Function to auto-create 8 onboarding phases when recruit is created
CREATE OR REPLACE FUNCTION create_onboarding_phases_for_recruit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create phases when onboarding_status is 'lead' and phases don't already exist
  IF NEW.onboarding_status = 'lead' AND NOT EXISTS (
    SELECT 1 FROM onboarding_phases WHERE user_id = NEW.id
  ) THEN
    INSERT INTO onboarding_phases (user_id, phase_name, phase_order, status, started_at)
    VALUES
      (NEW.id, 'initial_contact', 1, 'in_progress', NOW()),
      (NEW.id, 'application', 2, 'not_started', NULL),
      (NEW.id, 'background_check', 3, 'not_started', NULL),
      (NEW.id, 'pre_licensing', 4, 'not_started', NULL),
      (NEW.id, 'exam', 5, 'not_started', NULL),
      (NEW.id, 'state_license', 6, 'not_started', NULL),
      (NEW.id, 'contracting', 7, 'not_started', NULL),
      (NEW.id, 'complete', 8, 'not_started', NULL);

    -- Set current_onboarding_phase to initial_contact
    UPDATE user_profiles
    SET current_onboarding_phase = 'initial_contact'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create phases on recruit creation
DROP TRIGGER IF EXISTS trigger_create_onboarding_phases ON user_profiles;
CREATE TRIGGER trigger_create_onboarding_phases
  AFTER INSERT OR UPDATE OF onboarding_status ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_onboarding_phases_for_recruit();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_onboarding_phases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_phases_updated_at ON onboarding_phases;
CREATE TRIGGER trigger_onboarding_phases_updated_at
  BEFORE UPDATE ON onboarding_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_phases_updated_at();

-- Add comments
COMMENT ON TABLE onboarding_phases IS
  '8-phase recruiting onboarding process. Auto-created when user.onboarding_status = lead';

COMMENT ON COLUMN onboarding_phases.phase_order IS
  'Sequential order: 1=initial_contact, 2=application, 3=background_check, 4=pre_licensing, 5=exam, 6=state_license, 7=contracting, 8=complete';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_onboarding_phases_updated_at ON onboarding_phases;
DROP TRIGGER IF EXISTS trigger_create_onboarding_phases ON user_profiles;
DROP FUNCTION IF EXISTS update_onboarding_phases_updated_at();
DROP FUNCTION IF EXISTS create_onboarding_phases_for_recruit();
DROP TABLE IF EXISTS onboarding_phases CASCADE;
*/
