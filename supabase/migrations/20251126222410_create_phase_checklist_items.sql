-- supabase/migrations/20251126222410_create_phase_checklist_items.sql
-- Create phase_checklist_items table - tasks/requirements per phase
-- Supports multiple item types: documents, tasks, approvals, training, automated checks, signatures

CREATE TABLE IF NOT EXISTS phase_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES pipeline_phases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'document_upload',    -- Recruit uploads document, optionally requires upline approval
    'task_completion',    -- Recruit marks task complete, optionally requires verification
    'training_module',    -- Link to external training, recruit marks complete
    'manual_approval',    -- Upline manually approves (e.g., after phone screen, interview)
    'automated_check',    -- System checks condition (e.g., background check API)
    'signature_required'  -- E-signature needed (future: DocuSign integration)
  )),
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_order INTEGER NOT NULL CHECK (item_order > 0),
  is_required BOOLEAN DEFAULT true,
  can_be_completed_by TEXT NOT NULL CHECK (can_be_completed_by IN ('recruit', 'upline', 'system')),
  requires_verification BOOLEAN DEFAULT false,
  verification_by TEXT CHECK (verification_by IN ('upline', 'system', NULL)),
  external_link TEXT,
  document_type TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_phase_checklist_items_phase_id
  ON phase_checklist_items(phase_id);

CREATE INDEX IF NOT EXISTS idx_phase_checklist_items_phase_order
  ON phase_checklist_items(phase_id, item_order);

CREATE INDEX IF NOT EXISTS idx_phase_checklist_items_item_type
  ON phase_checklist_items(item_type);

CREATE INDEX IF NOT EXISTS idx_phase_checklist_items_is_active
  ON phase_checklist_items(is_active);

-- Enable RLS
ALTER TABLE phase_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view checklist items
CREATE POLICY "Authenticated users can view phase checklist items"
  ON phase_checklist_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can create/update/delete checklist items (for now, allow authenticated users)
CREATE POLICY "Authenticated users can insert phase checklist items"
  ON phase_checklist_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update phase checklist items"
  ON phase_checklist_items FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete phase checklist items"
  ON phase_checklist_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_phase_checklist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_phase_checklist_items_updated_at ON phase_checklist_items;
CREATE TRIGGER trigger_phase_checklist_items_updated_at
  BEFORE UPDATE ON phase_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_checklist_items_updated_at();

-- Add comments
COMMENT ON TABLE phase_checklist_items IS
  'Checklist items (tasks, documents, approvals, training) required for each phase.';

COMMENT ON COLUMN phase_checklist_items.item_type IS
  'Type of checklist item: document_upload, task_completion, training_module, manual_approval, automated_check, signature_required';

COMMENT ON COLUMN phase_checklist_items.can_be_completed_by IS
  'Who can mark this item as complete: recruit, upline, or system';

COMMENT ON COLUMN phase_checklist_items.requires_verification IS
  'If true, item must be verified by upline/system after recruit completes it';

COMMENT ON COLUMN phase_checklist_items.verification_by IS
  'Who verifies completion: upline or system. Only used if requires_verification = true';

COMMENT ON COLUMN phase_checklist_items.external_link IS
  'For training_module type: link to external training platform';

COMMENT ON COLUMN phase_checklist_items.document_type IS
  'For document_upload type: maps to user_documents.document_type';

COMMENT ON COLUMN phase_checklist_items.metadata IS
  'Additional configuration (e.g., accepted file types, validation rules, API endpoint for automated checks)';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_phase_checklist_items_updated_at ON phase_checklist_items;
DROP FUNCTION IF EXISTS update_phase_checklist_items_updated_at();
DROP TABLE IF EXISTS phase_checklist_items CASCADE;
*/
