-- supabase/migrations/20260110_013_decision_engine_foundation.sql
-- Data foundation for the deterministic decision engine
-- Includes: product rates, carrier condition acceptance, recommendation outcomes

-- ============================================================================
-- TABLE 1: product_rate_table
-- Stores premium rates per $1000 of coverage by carrier/product/age/health class
-- Used to calculate actual premiums and compare costs across carriers
-- ============================================================================

CREATE TABLE product_rate_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Age band (e.g., 30-34, 35-39, etc.)
  age_band_start int NOT NULL CHECK (age_band_start >= 0 AND age_band_start <= 100),
  age_band_end int NOT NULL CHECK (age_band_end >= age_band_start AND age_band_end <= 100),

  -- Client classification
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  tobacco_class text NOT NULL CHECK (tobacco_class IN ('non_tobacco', 'tobacco', 'preferred_non_tobacco')),
  health_class text NOT NULL CHECK (health_class IN ('preferred_plus', 'preferred', 'standard', 'standard_plus', 'table_rated')),

  -- The actual rate data
  rate_per_thousand decimal(10,4) NOT NULL CHECK (rate_per_thousand > 0),
  -- rate_per_thousand = monthly premium / (face_amount / 1000)
  -- To calculate premium: rate_per_thousand * (face_amount / 1000)

  -- Metadata
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date, -- NULL = no expiration
  notes text,

  -- Multi-tenant
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: one rate per product/age/gender/tobacco/health combination per IMO
  UNIQUE(product_id, age_band_start, age_band_end, gender, tobacco_class, health_class, imo_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_product_rates_product ON product_rate_table(product_id);
CREATE INDEX idx_product_rates_imo ON product_rate_table(imo_id);
CREATE INDEX idx_product_rates_lookup ON product_rate_table(product_id, gender, tobacco_class, health_class, imo_id);
CREATE INDEX idx_product_rates_age ON product_rate_table(age_band_start, age_band_end);

-- RLS
ALTER TABLE product_rate_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rates for their IMO"
  ON product_rate_table FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rates for their IMO"
  ON product_rate_table FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update rates for their IMO"
  ON product_rate_table FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rates for their IMO"
  ON product_rate_table FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE product_rate_table IS 'Premium rates per $1000 coverage for decision engine cost calculations';
COMMENT ON COLUMN product_rate_table.rate_per_thousand IS 'Monthly premium per $1000 of face amount. Premium = rate_per_thousand * (face_amount / 1000)';

-- ============================================================================
-- TABLE 2: carrier_condition_acceptance
-- Maps carrier + condition → acceptance decision and resulting health class
-- This is the core "tribal knowledge" that drives approval likelihood
-- ============================================================================

CREATE TABLE carrier_condition_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,

  -- What condition this rule applies to
  condition_code text NOT NULL, -- References underwriting_health_conditions.code

  -- Optional: limit to specific product type (NULL = applies to all)
  product_type text CHECK (product_type IS NULL OR product_type IN ('term_life', 'whole_life', 'universal_life', 'indexed_universal_life', 'final_expense')),

  -- The acceptance decision
  acceptance text NOT NULL CHECK (acceptance IN ('approved', 'table_rated', 'declined', 'case_by_case')),

  -- What health class results from this condition (if approved)
  health_class_result text CHECK (health_class_result IN ('preferred_plus', 'preferred', 'standard_plus', 'standard', 'table_1', 'table_2', 'table_3', 'table_4', 'table_6', 'table_8')),

  -- Conditional acceptance (e.g., {"controlled": true, "years_since_diagnosis": 5})
  requires_conditions jsonb DEFAULT '{}',

  -- Approval likelihood estimate (0.0 to 1.0) - based on your experience
  approval_likelihood decimal(3,2) CHECK (approval_likelihood >= 0 AND approval_likelihood <= 1),

  -- Notes for context
  notes text,
  source text, -- Where this knowledge came from: 'experience', 'guide', 'carrier_rep'

  -- Multi-tenant
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique: one rule per carrier/condition/product_type per IMO
  UNIQUE(carrier_id, condition_code, product_type, imo_id)
);

-- Indexes
CREATE INDEX idx_condition_acceptance_carrier ON carrier_condition_acceptance(carrier_id);
CREATE INDEX idx_condition_acceptance_condition ON carrier_condition_acceptance(condition_code);
CREATE INDEX idx_condition_acceptance_imo ON carrier_condition_acceptance(imo_id);
CREATE INDEX idx_condition_acceptance_lookup ON carrier_condition_acceptance(carrier_id, condition_code, imo_id);
CREATE INDEX idx_condition_acceptance_type ON carrier_condition_acceptance(product_type) WHERE product_type IS NOT NULL;

-- RLS
ALTER TABLE carrier_condition_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE carrier_condition_acceptance IS 'Carrier-specific condition acceptance rules - the tribal knowledge that drives approval likelihood';
COMMENT ON COLUMN carrier_condition_acceptance.approval_likelihood IS 'Estimated probability of approval (0.0-1.0) based on experience with this carrier/condition combo';
COMMENT ON COLUMN carrier_condition_acceptance.requires_conditions IS 'JSON conditions that must be true for acceptance, e.g., {"controlled": true, "years_since": 5}';

-- ============================================================================
-- TABLE 3: recommendation_outcomes
-- Tracks what happened after a recommendation was made
-- Used to improve approval likelihood estimates over time
-- ============================================================================

CREATE TABLE recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the underwriting session that generated the recommendation
  session_id uuid REFERENCES underwriting_sessions(id) ON DELETE SET NULL,

  -- What was recommended
  carrier_id uuid NOT NULL REFERENCES carriers(id),
  product_id uuid NOT NULL REFERENCES products(id),
  recommended_at timestamptz NOT NULL DEFAULT now(),

  -- Client snapshot at recommendation time
  client_age int NOT NULL,
  client_gender text NOT NULL,
  client_state text NOT NULL,
  client_bmi decimal(4,1),
  health_tier text, -- What tier the engine determined
  tobacco_class text,
  conditions_reported text[], -- Array of condition codes
  face_amount_requested int NOT NULL,

  -- What the engine predicted
  predicted_health_class text,
  predicted_premium decimal(10,2),
  predicted_approval_likelihood decimal(3,2),
  recommendation_rank int, -- Was this #1, #2, or #3?
  recommendation_reason text, -- 'cheapest', 'highest_coverage', 'best_approval'

  -- Was this recommendation selected by the user?
  was_selected boolean DEFAULT false,
  selected_at timestamptz,

  -- What actually happened (filled in later)
  outcome text CHECK (outcome IS NULL OR outcome IN ('approved', 'approved_modified', 'declined', 'withdrawn', 'pending')),
  actual_health_class text, -- What class did the carrier actually assign?
  actual_premium decimal(10,2), -- What was the actual premium?
  outcome_recorded_at timestamptz,
  outcome_notes text,

  -- Link to policy if one was created
  policy_id uuid REFERENCES policies(id) ON DELETE SET NULL,

  -- Multi-tenant
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_outcomes_session ON recommendation_outcomes(session_id);
CREATE INDEX idx_outcomes_carrier ON recommendation_outcomes(carrier_id);
CREATE INDEX idx_outcomes_product ON recommendation_outcomes(product_id);
CREATE INDEX idx_outcomes_imo ON recommendation_outcomes(imo_id);
CREATE INDEX idx_outcomes_outcome ON recommendation_outcomes(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX idx_outcomes_selected ON recommendation_outcomes(was_selected) WHERE was_selected = true;
CREATE INDEX idx_outcomes_pending ON recommendation_outcomes(outcome) WHERE outcome = 'pending' OR outcome IS NULL;

-- RLS
ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outcomes for their IMO"
  ON recommendation_outcomes FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outcomes for their IMO"
  ON recommendation_outcomes FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update outcomes for their IMO"
  ON recommendation_outcomes FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE recommendation_outcomes IS 'Tracks recommendation outcomes to improve approval likelihood estimates over time';
COMMENT ON COLUMN recommendation_outcomes.recommendation_reason IS 'Why this was recommended: cheapest, highest_coverage, best_approval';

-- ============================================================================
-- HELPER FUNCTION: Calculate premium from rate
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_premium(
  p_rate_per_thousand decimal,
  p_face_amount int
) RETURNS decimal AS $$
BEGIN
  RETURN p_rate_per_thousand * (p_face_amount / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_premium IS 'Calculate monthly premium from rate_per_thousand and face_amount';

-- ============================================================================
-- HELPER FUNCTION: Get best rate for a client profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_rate(
  p_product_id uuid,
  p_age int,
  p_gender text,
  p_tobacco_class text,
  p_health_class text,
  p_imo_id uuid
) RETURNS decimal AS $$
DECLARE
  v_rate decimal;
BEGIN
  SELECT rate_per_thousand INTO v_rate
  FROM product_rate_table
  WHERE product_id = p_product_id
    AND p_age >= age_band_start
    AND p_age <= age_band_end
    AND gender = p_gender
    AND tobacco_class = p_tobacco_class
    AND health_class = p_health_class
    AND imo_id = p_imo_id
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
  ORDER BY effective_date DESC
  LIMIT 1;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_product_rate IS 'Get the current rate_per_thousand for a specific product and client profile';

-- ============================================================================
-- HELPER FUNCTION: Get carrier acceptance for a condition
-- ============================================================================

CREATE OR REPLACE FUNCTION get_carrier_acceptance(
  p_carrier_id uuid,
  p_condition_code text,
  p_product_type text,
  p_imo_id uuid
) RETURNS TABLE (
  acceptance text,
  health_class_result text,
  approval_likelihood decimal,
  requires_conditions jsonb,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.acceptance,
    ca.health_class_result,
    ca.approval_likelihood,
    ca.requires_conditions,
    ca.notes
  FROM carrier_condition_acceptance ca
  WHERE ca.carrier_id = p_carrier_id
    AND ca.condition_code = p_condition_code
    AND ca.imo_id = p_imo_id
    AND (ca.product_type IS NULL OR ca.product_type = p_product_type)
  ORDER BY
    -- Prefer product-specific rules over generic ones
    CASE WHEN ca.product_type IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_carrier_acceptance IS 'Get carrier acceptance decision for a specific condition';

-- ============================================================================
-- Updated_at trigger for all new tables
-- ============================================================================

CREATE TRIGGER update_product_rate_table_updated_at
  BEFORE UPDATE ON product_rate_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrier_condition_acceptance_updated_at
  BEFORE UPDATE ON carrier_condition_acceptance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendation_outcomes_updated_at
  BEFORE UPDATE ON recommendation_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
