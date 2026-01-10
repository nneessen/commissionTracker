-- supabase/migrations/20260110_015_premium_matrix.sql
-- Premium Matrix: Grid-based rate entry for monthly premiums
-- Replaces the rate_per_thousand approach with actual premium amounts

-- =============================================================================
-- Table Definition
-- =============================================================================

CREATE TABLE premium_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Grid coordinates
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  face_amount INTEGER NOT NULL CHECK (face_amount > 0), -- In dollars (e.g., 25000, 50000)

  -- Classification
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  tobacco_class TEXT NOT NULL CHECK (tobacco_class IN ('non_tobacco', 'tobacco', 'preferred_non_tobacco')),
  health_class TEXT NOT NULL CHECK (health_class IN ('preferred_plus', 'preferred', 'standard', 'standard_plus', 'table_rated')),

  -- The actual monthly premium amount
  monthly_premium DECIMAL(10,2) NOT NULL CHECK (monthly_premium > 0),

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One premium per age/face/classification combination per product per IMO
  UNIQUE(product_id, age, face_amount, gender, tobacco_class, health_class, imo_id)
);

-- Add comment
COMMENT ON TABLE premium_matrix IS 'Stores monthly premium amounts for age × face amount grid. Used for quoting and interpolation.';

-- =============================================================================
-- Indexes
-- =============================================================================

-- Primary lookup: product + IMO
CREATE INDEX idx_premium_matrix_product ON premium_matrix(product_id, imo_id);

-- Classification lookup
CREATE INDEX idx_premium_matrix_lookup ON premium_matrix(
  product_id,
  gender,
  tobacco_class,
  health_class,
  imo_id
);

-- Age range lookup for interpolation
CREATE INDEX idx_premium_matrix_age ON premium_matrix(product_id, age);

-- Face amount lookup for interpolation
CREATE INDEX idx_premium_matrix_face ON premium_matrix(product_id, face_amount);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE premium_matrix ENABLE ROW LEVEL SECURITY;

-- Users can view premium matrix for their IMO
CREATE POLICY "Users can view premium matrix for their IMO"
  ON premium_matrix FOR SELECT
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can insert premium matrix for their IMO
CREATE POLICY "Users can insert premium matrix for their IMO"
  ON premium_matrix FOR INSERT
  TO authenticated
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update premium matrix for their IMO
CREATE POLICY "Users can update premium matrix for their IMO"
  ON premium_matrix FOR UPDATE
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete premium matrix for their IMO
CREATE POLICY "Users can delete premium matrix for their IMO"
  ON premium_matrix FOR DELETE
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- =============================================================================
-- Updated At Trigger
-- =============================================================================

CREATE TRIGGER set_premium_matrix_updated_at
  BEFORE UPDATE ON premium_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
