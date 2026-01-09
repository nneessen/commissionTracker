-- supabase/migrations/20260110_006_carrier_build_charts_refactor.sql
-- Refactor: Multiple named build charts per carrier, products select which chart to use

-- ============================================================================
-- Part 1: Create carrier_build_charts table (multiple charts per carrier)
-- ============================================================================

CREATE TABLE IF NOT EXISTS carrier_build_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Chart identification
  name TEXT NOT NULL,  -- e.g., "Term Life Chart", "Whole Life Chart"

  -- Chart type and data
  table_type TEXT NOT NULL DEFAULT 'height_weight',  -- 'height_weight' or 'bmi'
  build_data JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Height/weight array
  bmi_data JSONB,                                     -- BMI ranges if type is 'bmi'

  -- Metadata
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each carrier can only have one chart with a given name per IMO
  CONSTRAINT carrier_build_charts_name_unique UNIQUE(carrier_id, imo_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carrier_build_charts_carrier_id
  ON carrier_build_charts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_build_charts_imo_id
  ON carrier_build_charts(imo_id);
CREATE INDEX IF NOT EXISTS idx_carrier_build_charts_carrier_default
  ON carrier_build_charts(carrier_id, is_default) WHERE is_default = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_carrier_build_charts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_carrier_build_charts_updated_at ON carrier_build_charts;
CREATE TRIGGER trigger_carrier_build_charts_updated_at
  BEFORE UPDATE ON carrier_build_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_carrier_build_charts_updated_at();

-- Enable RLS
ALTER TABLE carrier_build_charts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view build charts from their IMO"
ON carrier_build_charts FOR SELECT
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert build charts for their IMO"
ON carrier_build_charts FOR INSERT
TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update build charts from their IMO"
ON carrier_build_charts FOR UPDATE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete build charts from their IMO"
ON carrier_build_charts FOR DELETE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Comments
COMMENT ON TABLE carrier_build_charts IS 'Named build charts per carrier. Products select which chart to use.';
COMMENT ON COLUMN carrier_build_charts.name IS 'Unique name for this chart within the carrier (e.g., Term Life Chart)';
COMMENT ON COLUMN carrier_build_charts.is_default IS 'If true, products without a specific chart selection use this one';

-- ============================================================================
-- Part 2: Add build_chart_id to products table
-- ============================================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS build_chart_id UUID REFERENCES carrier_build_charts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_build_chart_id ON products(build_chart_id);

COMMENT ON COLUMN products.build_chart_id IS 'Optional reference to specific build chart. If null, uses carrier default.';

-- ============================================================================
-- Part 3: Migrate existing data from carrier_build_tables
-- ============================================================================

-- Migrate existing carrier_build_tables data to carrier_build_charts
INSERT INTO carrier_build_charts (carrier_id, imo_id, name, table_type, build_data, bmi_data, notes, is_default)
SELECT
  carrier_id,
  imo_id,
  'Default Build Chart',
  COALESCE(table_type, 'height_weight'),
  build_data,
  bmi_data,
  notes,
  true  -- Mark migrated charts as default
FROM carrier_build_tables
ON CONFLICT (carrier_id, imo_id, name) DO NOTHING;

-- ============================================================================
-- Part 4: Drop old tables (after migration)
-- ============================================================================

-- Drop product_build_tables (no longer needed - products just reference carrier charts)
DROP TABLE IF EXISTS product_build_tables CASCADE;

-- Drop the old carrier_build_tables (data migrated to carrier_build_charts)
DROP TABLE IF EXISTS carrier_build_tables CASCADE;
