-- supabase/migrations/20260110_002_carrier_build_tables.sql
-- Phase 6: Carrier Build Tables for Height/Weight to Rating Class Mapping

-- Create carrier_build_tables table
CREATE TABLE IF NOT EXISTS carrier_build_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- JSON array of height rows with max weights per rating class
  -- Structure: [{ heightInches: 60, maxWeights: { preferredPlus: 130, preferred: 145, ... } }, ...]
  build_data JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Optional notes about this build table (source, version, etc.)
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One build table per carrier per IMO
  CONSTRAINT carrier_build_tables_carrier_imo_unique UNIQUE(carrier_id, imo_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_carrier_build_tables_carrier_id
  ON carrier_build_tables(carrier_id);

CREATE INDEX IF NOT EXISTS idx_carrier_build_tables_imo_id
  ON carrier_build_tables(imo_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_carrier_build_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_carrier_build_tables_updated_at ON carrier_build_tables;
CREATE TRIGGER trigger_carrier_build_tables_updated_at
  BEFORE UPDATE ON carrier_build_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_carrier_build_tables_updated_at();

-- Enable RLS
ALTER TABLE carrier_build_tables ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access build tables for their IMO
CREATE POLICY "Users can view build tables for their IMO"
  ON carrier_build_tables
  FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert build tables for their IMO"
  ON carrier_build_tables
  FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update build tables for their IMO"
  ON carrier_build_tables
  FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete build tables for their IMO"
  ON carrier_build_tables
  FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE carrier_build_tables IS 'Carrier-specific height/weight build tables for determining rating classes';
COMMENT ON COLUMN carrier_build_tables.build_data IS 'JSON array of height rows with max weights per rating class. Structure: [{ heightInches: number, maxWeights: { preferredPlus?: number, preferred?: number, standardPlus?: number, standard?: number } }]';
