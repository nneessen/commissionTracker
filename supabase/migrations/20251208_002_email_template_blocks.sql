-- Migration: Add blocks support to email_templates
-- This enables the visual block-based email template builder

-- Add blocks column for storing visual block structure
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS blocks JSONB;

-- Add flag to distinguish block-based templates from legacy HTML templates
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_block_template BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN email_templates.blocks IS 'JSON array of EmailBlock objects for visual template builder';
COMMENT ON COLUMN email_templates.is_block_template IS 'True if template uses block builder, false for legacy HTML templates';
