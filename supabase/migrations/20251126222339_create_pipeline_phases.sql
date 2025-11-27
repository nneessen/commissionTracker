-- supabase/migrations/20251126222339_create_pipeline_phases.sql
-- Create pipeline_phases table - configurable phases within each template
-- Replaces hardcoded phase_name enum with database-driven configuration

CREATE TABLE IF NOT EXISTS pipeline_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pipeline_templates(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_description TEXT,
  phase_order INTEGER NOT NULL CHECK (phase_order > 0),
  estimated_days INTEGER CHECK (estimated_days >= 0 OR estimated_days IS NULL),
  auto_advance BOOLEAN DEFAULT false,
  required_approver_role TEXT CHECK (required_approver_role IN ('upline', 'admin', 'system', NULL)),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, phase_order),
  UNIQUE(template_id, phase_name)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_phases_template_id
  ON pipeline_phases(template_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_phases_template_order
  ON pipeline_phases(template_id, phase_order);

CREATE INDEX IF NOT EXISTS idx_pipeline_phases_is_active
  ON pipeline_phases(is_active);

-- Enable RLS
ALTER TABLE pipeline_phases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view phases
CREATE POLICY "Authenticated users can view pipeline phases"
  ON pipeline_phases FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can create/update/delete phases (for now, allow authenticated users)
CREATE POLICY "Authenticated users can insert pipeline phases"
  ON pipeline_phases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pipeline phases"
  ON pipeline_phases FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete pipeline phases"
  ON pipeline_phases FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_pipeline_phases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pipeline_phases_updated_at ON pipeline_phases;
CREATE TRIGGER trigger_pipeline_phases_updated_at
  BEFORE UPDATE ON pipeline_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_phases_updated_at();

-- Add comments
COMMENT ON TABLE pipeline_phases IS
  'Configurable phases within each pipeline template. Admins can add/remove/reorder phases.';

COMMENT ON COLUMN pipeline_phases.phase_order IS
  'Sequential order of phases (1, 2, 3, ...). Used for timeline visualization.';

COMMENT ON COLUMN pipeline_phases.estimated_days IS
  'Expected duration for this phase. Used to detect stuck recruits (actual > 1.5x estimated).';

COMMENT ON COLUMN pipeline_phases.auto_advance IS
  'If true, phase auto-completes when all required checklist items are done. If false, requires manual approval.';

COMMENT ON COLUMN pipeline_phases.required_approver_role IS
  'Who can approve manual advancement: upline (recruiter), admin, or system (automated check).';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_pipeline_phases_updated_at ON pipeline_phases;
DROP FUNCTION IF EXISTS update_pipeline_phases_updated_at();
DROP TABLE IF EXISTS pipeline_phases CASCADE;
*/
