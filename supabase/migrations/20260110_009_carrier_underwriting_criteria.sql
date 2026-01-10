-- supabase/migrations/20260110_009_carrier_underwriting_criteria.sql
-- Stores AI-extracted underwriting criteria from carrier guides with human review workflow

-- Create the carrier_underwriting_criteria table
CREATE TABLE carrier_underwriting_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key relationships
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES underwriting_guides(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- NULL = carrier-wide criteria

  -- Extraction tracking
  extraction_status VARCHAR(20) DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_confidence DECIMAL(3,2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
  extraction_error TEXT,
  extracted_at TIMESTAMPTZ,

  -- Human review workflow
  review_status VARCHAR(20) DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Extracted criteria (structured JSONB)
  -- Schema: { ageLimits, faceAmountLimits, knockoutConditions, buildRequirements, tobaccoRules, medicationRestrictions, stateAvailability }
  criteria JSONB NOT NULL DEFAULT '{}',

  -- Source references for extracted data
  source_excerpts JSONB DEFAULT '[]', -- Array of { field, excerpt, pageNumber }

  -- Activation state
  is_active BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment describing the table purpose
COMMENT ON TABLE carrier_underwriting_criteria IS 'Stores AI-extracted underwriting criteria from carrier PDF guides with human review workflow';

-- Indexes for common query patterns
CREATE INDEX idx_criteria_imo ON carrier_underwriting_criteria(imo_id);
CREATE INDEX idx_criteria_carrier ON carrier_underwriting_criteria(carrier_id);
CREATE INDEX idx_criteria_guide ON carrier_underwriting_criteria(guide_id) WHERE guide_id IS NOT NULL;
CREATE INDEX idx_criteria_product ON carrier_underwriting_criteria(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_criteria_extraction_status ON carrier_underwriting_criteria(extraction_status);
CREATE INDEX idx_criteria_review_status ON carrier_underwriting_criteria(review_status);
CREATE INDEX idx_criteria_active ON carrier_underwriting_criteria(is_active) WHERE is_active = TRUE;

-- Composite index for filtering by IMO and status
CREATE INDEX idx_criteria_imo_status ON carrier_underwriting_criteria(imo_id, extraction_status, review_status);

-- Enable Row Level Security
ALTER TABLE carrier_underwriting_criteria ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view criteria belonging to their IMO
CREATE POLICY "Users can view own IMO criteria"
  ON carrier_underwriting_criteria
  FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- IMO admins and owners can insert new criteria
CREATE POLICY "IMO admins can insert criteria"
  ON carrier_underwriting_criteria
  FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('imo_admin', 'imo_owner')
    )
  );

-- IMO admins and owners can update criteria
CREATE POLICY "IMO admins can update criteria"
  ON carrier_underwriting_criteria
  FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('imo_admin', 'imo_owner')
    )
  )
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('imo_admin', 'imo_owner')
    )
  );

-- IMO admins and owners can delete criteria
CREATE POLICY "IMO admins can delete criteria"
  ON carrier_underwriting_criteria
  FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('imo_admin', 'imo_owner')
    )
  );

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER update_criteria_updated_at
  BEFORE UPDATE ON carrier_underwriting_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint to prevent duplicate active criteria for same carrier/product
CREATE UNIQUE INDEX idx_criteria_unique_active
  ON carrier_underwriting_criteria(imo_id, carrier_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE is_active = TRUE;

-- Comment on the unique constraint
COMMENT ON INDEX idx_criteria_unique_active IS 'Ensures only one active criteria set per carrier/product combination per IMO';
