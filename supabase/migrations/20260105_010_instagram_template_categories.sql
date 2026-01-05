-- supabase/migrations/20260105_010_instagram_template_categories.sql
-- Instagram Template Management: Personal templates with two-dimensional categorization

-- ============================================================================
-- Table: instagram_template_categories
-- User-defined custom prospect type categories for templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Category details
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints: Each user can only have one category with the same name
  CONSTRAINT template_category_user_name_unique UNIQUE(user_id, name)
);

-- ============================================================================
-- Add message_stage column to instagram_message_templates
-- ============================================================================

ALTER TABLE instagram_message_templates
  ADD COLUMN IF NOT EXISTS message_stage TEXT;

-- Comment on columns for clarity
COMMENT ON COLUMN instagram_message_templates.category IS 'Prospect type category (licensed_agent, has_team, solar, door_to_door, athlete, car_salesman, general_cold, or custom)';
COMMENT ON COLUMN instagram_message_templates.message_stage IS 'Message stage: opener, follow_up, closer';

-- Migrate existing templates: set default message_stage to opener
UPDATE instagram_message_templates
SET message_stage = 'opener'
WHERE message_stage IS NULL;

-- ============================================================================
-- Indexes for instagram_template_categories
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_template_categories_user
  ON instagram_template_categories(user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_template_categories_order
  ON instagram_template_categories(user_id, display_order);

-- Add index for user-based template queries
CREATE INDEX IF NOT EXISTS idx_instagram_templates_user_active
  ON instagram_message_templates(user_id)
  WHERE user_id IS NOT NULL AND is_active = true;

-- Add index for message_stage filtering
CREATE INDEX IF NOT EXISTS idx_instagram_templates_stage
  ON instagram_message_templates(user_id, message_stage)
  WHERE is_active = true;

-- ============================================================================
-- Updated_at trigger for instagram_template_categories
-- ============================================================================

CREATE OR REPLACE FUNCTION update_template_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_categories_updated_at ON instagram_template_categories;
CREATE TRIGGER trigger_template_categories_updated_at
  BEFORE UPDATE ON instagram_template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_template_categories_updated_at();

-- ============================================================================
-- RLS for instagram_template_categories
-- ============================================================================

ALTER TABLE instagram_template_categories ENABLE ROW LEVEL SECURITY;

-- Users can only see their own categories
CREATE POLICY "template_categories_select"
  ON instagram_template_categories
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only create categories for themselves
CREATE POLICY "template_categories_insert"
  ON instagram_template_categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own categories
CREATE POLICY "template_categories_update"
  ON instagram_template_categories
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own categories
CREATE POLICY "template_categories_delete"
  ON instagram_template_categories
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Update RLS for instagram_message_templates to be personal
-- Drop existing policies and recreate for user-scoped access
-- ============================================================================

DROP POLICY IF EXISTS "instagram_templates_select" ON instagram_message_templates;
DROP POLICY IF EXISTS "instagram_templates_insert" ON instagram_message_templates;
DROP POLICY IF EXISTS "instagram_templates_update" ON instagram_message_templates;
DROP POLICY IF EXISTS "instagram_templates_delete" ON instagram_message_templates;

-- SELECT: Users can only see their own templates
CREATE POLICY "instagram_templates_select_personal"
  ON instagram_message_templates
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create templates for themselves
CREATE POLICY "instagram_templates_insert_personal"
  ON instagram_message_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own templates
CREATE POLICY "instagram_templates_update_personal"
  ON instagram_message_templates
  FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: Users can only delete their own templates
CREATE POLICY "instagram_templates_delete_personal"
  ON instagram_message_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON instagram_template_categories TO authenticated;

COMMENT ON TABLE instagram_template_categories IS 'User-defined custom prospect type categories for Instagram message templates';
