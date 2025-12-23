-- supabase/migrations/20251223_051_scheduling_integrations.sql
-- Scheduling integrations for recruiting pipeline (Calendly, Google Calendar, Zoom)

-- ============================================================================
-- Table: scheduling_integrations
-- Stores user-level scheduling tool configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduling_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imo_id UUID REFERENCES imos(id) ON DELETE SET NULL,

  -- Integration type
  integration_type TEXT NOT NULL CHECK (integration_type IN ('calendly', 'google_calendar', 'zoom')),

  -- Configuration
  display_name TEXT, -- e.g., "30 min call", "Zoom Interview"
  booking_url TEXT NOT NULL, -- The URL for scheduling

  -- Meeting-specific (for Zoom)
  meeting_id TEXT, -- Zoom meeting ID if applicable
  passcode TEXT, -- Zoom passcode if applicable

  -- Additional instructions for recruits
  instructions TEXT,

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scheduling_integrations_user_id
  ON scheduling_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_scheduling_integrations_imo_id
  ON scheduling_integrations(imo_id);

CREATE INDEX IF NOT EXISTS idx_scheduling_integrations_type
  ON scheduling_integrations(integration_type);

CREATE INDEX IF NOT EXISTS idx_scheduling_integrations_active
  ON scheduling_integrations(user_id, integration_type)
  WHERE is_active = true;

-- Unique constraint: one active integration per type per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduling_integrations_unique_active
  ON scheduling_integrations(user_id, integration_type)
  WHERE is_active = true;

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_scheduling_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scheduling_integrations_updated_at ON scheduling_integrations;
CREATE TRIGGER trigger_scheduling_integrations_updated_at
  BEFORE UPDATE ON scheduling_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduling_integrations_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE scheduling_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own integrations
CREATE POLICY "scheduling_integrations_select_own"
  ON scheduling_integrations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own integrations
CREATE POLICY "scheduling_integrations_insert_own"
  ON scheduling_integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own integrations
CREATE POLICY "scheduling_integrations_update_own"
  ON scheduling_integrations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own integrations
CREATE POLICY "scheduling_integrations_delete_own"
  ON scheduling_integrations
  FOR DELETE
  USING (user_id = auth.uid());

-- IMO admins can view integrations in their org
CREATE POLICY "scheduling_integrations_select_imo_admin"
  ON scheduling_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.imo_id = scheduling_integrations.imo_id
      AND up.is_admin = true
    )
  );

-- Uplines can view their downline's integrations (for phase config display)
CREATE POLICY "scheduling_integrations_select_upline"
  ON scheduling_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = scheduling_integrations.user_id
      AND up.upline_id = auth.uid()
    )
  );

-- ============================================================================
-- Set imo_id automatically on insert using trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION set_scheduling_integration_imo_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the user's imo_id from their profile
  SELECT imo_id INTO NEW.imo_id
  FROM user_profiles
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_scheduling_integration_imo_id ON scheduling_integrations;
CREATE TRIGGER trigger_set_scheduling_integration_imo_id
  BEFORE INSERT ON scheduling_integrations
  FOR EACH ROW
  EXECUTE FUNCTION set_scheduling_integration_imo_id();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON scheduling_integrations TO authenticated;
