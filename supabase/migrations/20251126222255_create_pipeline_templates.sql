-- supabase/migrations/20251126222255_create_pipeline_templates.sql
-- Create pipeline_templates table for configurable recruiting pipelines
-- This replaces the hardcoded approach with admin-customizable templates

CREATE TABLE IF NOT EXISTS pipeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_is_active
  ON pipeline_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_pipeline_templates_is_default
  ON pipeline_templates(is_default)
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE pipeline_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view templates
CREATE POLICY "Authenticated users can view pipeline templates"
  ON pipeline_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can create/update/delete templates (for now, allow authenticated users)
-- TODO: Add admin role check when role system is implemented
CREATE POLICY "Authenticated users can insert pipeline templates"
  ON pipeline_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pipeline templates"
  ON pipeline_templates FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete pipeline templates"
  ON pipeline_templates FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_pipeline_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pipeline_templates_updated_at ON pipeline_templates;
CREATE TRIGGER trigger_pipeline_templates_updated_at
  BEFORE UPDATE ON pipeline_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_templates_updated_at();

-- Ensure only one default template
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other templates to non-default
    UPDATE pipeline_templates
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_template ON pipeline_templates;
CREATE TRIGGER trigger_ensure_single_default_template
  BEFORE INSERT OR UPDATE ON pipeline_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();

-- Add comments
COMMENT ON TABLE pipeline_templates IS
  'Configurable pipeline templates for recruiting. Admins can create multiple templates for different scenarios.';

COMMENT ON COLUMN pipeline_templates.is_default IS
  'Default template used when creating new recruits. Only one template can be default at a time.';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_ensure_single_default_template ON pipeline_templates;
DROP TRIGGER IF EXISTS trigger_pipeline_templates_updated_at ON pipeline_templates;
DROP FUNCTION IF EXISTS ensure_single_default_template();
DROP FUNCTION IF EXISTS update_pipeline_templates_updated_at();
DROP TABLE IF EXISTS pipeline_templates CASCADE;
*/
