-- supabase/migrations/20260108_005_unified_templates.sql
-- Unified Message Templates - Multi-Platform Support
-- Extends existing instagram_message_templates to support LinkedIn

-- ============================================================================
-- Step 1: Add platform column to existing templates table
-- ============================================================================

-- Add platform column with default 'instagram' for backward compatibility
ALTER TABLE instagram_message_templates
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'instagram';

-- Add comment explaining platform values
COMMENT ON COLUMN instagram_message_templates.platform IS
  'Platform for this template: instagram (max 1000 chars), linkedin (max 8000 chars), or all (min limit applies)';

-- ============================================================================
-- Step 2: Update unique constraint to be platform-aware
-- ============================================================================

-- Drop old constraint if exists
ALTER TABLE instagram_message_templates
  DROP CONSTRAINT IF EXISTS instagram_templates_name_unique;

-- Add new constraint that includes platform
ALTER TABLE instagram_message_templates
  ADD CONSTRAINT message_templates_name_platform_unique
  UNIQUE(imo_id, user_id, name, platform);

-- ============================================================================
-- Step 3: Update content length constraint for multi-platform
-- ============================================================================

-- Drop old constraint
ALTER TABLE instagram_message_templates
  DROP CONSTRAINT IF EXISTS instagram_templates_content_length;

-- Add new platform-aware constraint
ALTER TABLE instagram_message_templates
  ADD CONSTRAINT message_templates_content_length CHECK (
    (platform = 'instagram' AND char_length(content) <= 1000) OR
    (platform IN ('linkedin', 'all') AND char_length(content) <= 8000)
  );

-- ============================================================================
-- Step 4: Create index for platform filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_message_templates_platform
  ON instagram_message_templates(imo_id, platform)
  WHERE is_active = true;

-- ============================================================================
-- Step 5: Rename table to message_templates (optional for code clarity)
-- ============================================================================

-- Note: We keep the original name to avoid breaking existing code
-- But we can create a view or alias if needed

-- Create a view with the new name for clean access
CREATE OR REPLACE VIEW message_templates AS
SELECT * FROM instagram_message_templates;

-- Grant access to the view
GRANT SELECT ON message_templates TO authenticated;

-- ============================================================================
-- Step 6: Update template categories to include LinkedIn-specific ones
-- ============================================================================

-- Add platform-specific template categories via comment
COMMENT ON COLUMN instagram_message_templates.category IS
  'Template category: greeting, follow_up, scheduling, closing, connection_request (LinkedIn), inmail (LinkedIn), thank_you, introduction';

-- ============================================================================
-- Step 7: Function to get templates by platform
-- ============================================================================

CREATE OR REPLACE FUNCTION get_templates_for_platform(
  p_imo_id UUID,
  p_user_id UUID,
  p_platform TEXT
)
RETURNS SETOF instagram_message_templates
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM instagram_message_templates
  WHERE imo_id = p_imo_id
    AND is_active = true
    AND (
      platform = p_platform
      OR platform = 'all'
    )
    AND (
      user_id IS NULL           -- Org-wide templates
      OR user_id = p_user_id    -- User's own templates
    )
  ORDER BY
    user_id IS NULL,            -- Org templates first
    category,
    name;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_templates_for_platform TO authenticated;

-- ============================================================================
-- Step 8: Function to validate content length for platform
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_template_content_for_platform(
  p_content TEXT,
  p_platform TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_platform = 'instagram' THEN
    RETURN char_length(p_content) <= 1000;
  ELSIF p_platform IN ('linkedin', 'all') THEN
    RETURN char_length(p_content) <= 8000;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_template_content_for_platform TO authenticated;

-- ============================================================================
-- Step 9: Add FK from linkedin_scheduled_messages to templates
-- ============================================================================

-- Add foreign key constraint
ALTER TABLE linkedin_scheduled_messages
  ADD CONSTRAINT linkedin_scheduled_template_fk
  FOREIGN KEY (template_id)
  REFERENCES instagram_message_templates(id)
  ON DELETE SET NULL;

-- ============================================================================
-- Backward Compatibility Notes
-- ============================================================================
--
-- 1. Existing instagram templates continue to work (platform defaults to 'instagram')
-- 2. Table name remains instagram_message_templates for existing code
-- 3. New view 'message_templates' provides clean access for new code
-- 4. RLS policies remain unchanged (imo/user-based)
-- 5. LinkedIn can use templates with platform = 'linkedin' or 'all'
