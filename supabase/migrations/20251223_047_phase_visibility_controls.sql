-- supabase/migrations/20251223_047_phase_visibility_controls.sql
-- Add visible_to_recruit column to pipeline_phases and phase_checklist_items
-- When false, these items are hidden from recruits but visible to admins/uplines

-- Add visible_to_recruit column to pipeline_phases
ALTER TABLE pipeline_phases
  ADD COLUMN IF NOT EXISTS visible_to_recruit boolean DEFAULT true NOT NULL;

-- Add visible_to_recruit column to phase_checklist_items
ALTER TABLE phase_checklist_items
  ADD COLUMN IF NOT EXISTS visible_to_recruit boolean DEFAULT true NOT NULL;

-- Create indexes for visibility filtering (partial indexes for active items only)
CREATE INDEX IF NOT EXISTS idx_pipeline_phases_visible_to_recruit
  ON pipeline_phases(template_id, visible_to_recruit) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_phase_checklist_items_visible_to_recruit
  ON phase_checklist_items(phase_id, visible_to_recruit) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN pipeline_phases.visible_to_recruit IS
  'When false, phase is hidden from recruits but visible to admins/uplines. Recruits see a "waiting" state instead.';
COMMENT ON COLUMN phase_checklist_items.visible_to_recruit IS
  'When false, item is hidden from recruits but visible to admins/uplines.';
