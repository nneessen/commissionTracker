-- supabase/migrations/20260110_004_product_build_tables.sql
-- Product-level build tables and BMI table support

-- ============================================================================
-- Part 1: Add table_type to carrier_build_tables
-- ============================================================================

-- Add table_type column to existing carrier_build_tables
-- 'height_weight' = traditional height/weight chart (default)
-- 'bmi' = BMI-based rating thresholds
ALTER TABLE carrier_build_tables
ADD COLUMN IF NOT EXISTS table_type TEXT NOT NULL DEFAULT 'height_weight';

-- Add bmi_data column for BMI-based tables
-- Structure: { preferredPlus?: number, preferred?: number, standardPlus?: number, standard?: number }
ALTER TABLE carrier_build_tables
ADD COLUMN IF NOT EXISTS bmi_data JSONB;

-- Add comment for new columns
COMMENT ON COLUMN carrier_build_tables.table_type IS 'Type of build table: height_weight (traditional) or bmi (BMI thresholds)';
COMMENT ON COLUMN carrier_build_tables.bmi_data IS 'For BMI tables: max BMI values per rating class. Structure: { preferredPlus?: number, preferred?: number, standardPlus?: number, standard?: number }';

-- ============================================================================
-- Part 2: Create product_build_tables table
-- ============================================================================

-- Create product-level build tables
-- Products can optionally have their own build table that overrides the carrier-level table
CREATE TABLE IF NOT EXISTS product_build_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Type of build table
  table_type TEXT NOT NULL DEFAULT 'height_weight',

  -- For height/weight tables: JSON array of height rows with max weights per rating class
  -- Structure: [{ heightInches: 60, maxWeights: { preferredPlus: 130, preferred: 145, ... } }, ...]
  build_data JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- For BMI tables: max BMI values per rating class
  -- Structure: { preferredPlus: 25, preferred: 28, standardPlus: 32, standard: 38 }
  bmi_data JSONB,

  -- Optional notes about this build table (source, version, etc.)
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One build table per product per IMO
  CONSTRAINT product_build_tables_product_imo_unique UNIQUE(product_id, imo_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_build_tables_product_id
  ON product_build_tables(product_id);

CREATE INDEX IF NOT EXISTS idx_product_build_tables_imo_id
  ON product_build_tables(imo_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_product_build_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_build_tables_updated_at ON product_build_tables;
CREATE TRIGGER trigger_product_build_tables_updated_at
  BEFORE UPDATE ON product_build_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_product_build_tables_updated_at();

-- Enable RLS
ALTER TABLE product_build_tables ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access build tables for their IMO
CREATE POLICY "Users can view product build tables for their IMO"
  ON product_build_tables
  FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert product build tables for their IMO"
  ON product_build_tables
  FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update product build tables for their IMO"
  ON product_build_tables
  FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete product build tables for their IMO"
  ON product_build_tables
  FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE product_build_tables IS 'Product-specific build tables that override carrier-level tables when present';
COMMENT ON COLUMN product_build_tables.table_type IS 'Type of build table: height_weight (traditional) or bmi (BMI thresholds)';
COMMENT ON COLUMN product_build_tables.build_data IS 'For height_weight tables: JSON array of height rows with max weights. Structure: [{ heightInches: number, maxWeights: { preferredPlus?: number, preferred?: number, standardPlus?: number, standard?: number } }]';
COMMENT ON COLUMN product_build_tables.bmi_data IS 'For bmi tables: max BMI values per rating class. Structure: { preferredPlus?: number, preferred?: number, standardPlus?: number, standard?: number }';
