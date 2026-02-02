-- supabase/migrations/20260202155739_the_standard_team_management.sql
-- Migration for The Standard Team Management page
-- Creates tables for agent state licenses and state classifications

-- =============================================================================
-- agent_state_licenses - Tracks which states each agent is licensed in
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_state_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  state_code VARCHAR(2) NOT NULL,
  is_licensed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, state_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_state_licenses_agent_id ON agent_state_licenses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_state_licenses_state_code ON agent_state_licenses(state_code);

-- Enable RLS
ALTER TABLE agent_state_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins and super admins of the same IMO can manage licenses
CREATE POLICY "agent_state_licenses_select_policy" ON agent_state_licenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
          OR up.agency_id = (SELECT agency_id FROM user_profiles WHERE id = agent_state_licenses.agent_id)
        )
    )
  );

CREATE POLICY "agent_state_licenses_insert_policy" ON agent_state_licenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
        )
    )
  );

CREATE POLICY "agent_state_licenses_update_policy" ON agent_state_licenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
        )
    )
  );

CREATE POLICY "agent_state_licenses_delete_policy" ON agent_state_licenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
        )
    )
  );

-- =============================================================================
-- state_classifications - Stores color coding per state per agency
-- =============================================================================
CREATE TABLE IF NOT EXISTS state_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  state_code VARCHAR(2) NOT NULL,
  classification VARCHAR(10) NOT NULL DEFAULT 'neutral'
    CHECK (classification IN ('green', 'yellow', 'red', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, state_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_state_classifications_agency_id ON state_classifications(agency_id);
CREATE INDEX IF NOT EXISTS idx_state_classifications_state_code ON state_classifications(state_code);

-- Enable RLS
ALTER TABLE state_classifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins and super admins can manage classifications for their agency
CREATE POLICY "state_classifications_select_policy" ON state_classifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
          OR up.agency_id = state_classifications.agency_id
        )
    )
  );

CREATE POLICY "state_classifications_insert_policy" ON state_classifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
        )
    )
  );

CREATE POLICY "state_classifications_update_policy" ON state_classifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
        )
    )
  );

CREATE POLICY "state_classifications_delete_policy" ON state_classifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
        )
    )
  );

-- =============================================================================
-- Trigger for updated_at timestamps
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agent_state_licenses_updated_at') THEN
    CREATE TRIGGER update_agent_state_licenses_updated_at
      BEFORE UPDATE ON agent_state_licenses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_state_classifications_updated_at') THEN
    CREATE TRIGGER update_state_classifications_updated_at
      BEFORE UPDATE ON state_classifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- Comments for documentation
-- =============================================================================
COMMENT ON TABLE agent_state_licenses IS 'Tracks which US states each agent is licensed to sell insurance in';
COMMENT ON COLUMN agent_state_licenses.state_code IS 'Two-letter US state code (e.g., CA, NY, TX)';
COMMENT ON COLUMN agent_state_licenses.is_licensed IS 'Whether the agent holds an active license in this state';

COMMENT ON TABLE state_classifications IS 'Color-coded classifications for states by agency (for UI display)';
COMMENT ON COLUMN state_classifications.classification IS 'Color classification: green (favorable), yellow (moderate), red (unfavorable), neutral (default)';
