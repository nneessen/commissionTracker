-- supabase/migrations/20260220081833_add_carrier_contracting_metadata.sql
-- Add contracting metadata to carriers table

-- Add contracting metadata column
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS contracting_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment describing the metadata structure
COMMENT ON COLUMN carriers.contracting_metadata IS 'Contracting workflow metadata: {
  "priority": integer (1-20, lower = higher priority),
  "instructions": text (Markdown, carrier-specific contracting instructions),
  "required_documents": array of text (document types required for this carrier),
  "processing_time_days": integer (typical approval timeline),
  "contact_info": { "email": text, "phone": text, "portal_url": text }
}';

-- Index for priority ordering
CREATE INDEX IF NOT EXISTS idx_carriers_contracting_priority
ON carriers ((contracting_metadata->>'priority')::int NULLS LAST);

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, version, description)
VALUES ('carriers_contracting_metadata', '20260220081833', 'Added contracting metadata column to carriers')
ON CONFLICT (function_name) DO UPDATE SET
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  updated_at = NOW();
