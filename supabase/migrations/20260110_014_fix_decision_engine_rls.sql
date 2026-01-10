-- supabase/migrations/20260110_014_fix_decision_engine_rls.sql
-- Fix RLS policies for decision engine tables (use user_profiles, not profiles)
-- The original migration 013 incorrectly referenced "profiles" table instead of "user_profiles"

-- ============================================================================
-- Drop existing incorrect policies from product_rate_table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view rates for their IMO" ON product_rate_table;
DROP POLICY IF EXISTS "Users can insert rates for their IMO" ON product_rate_table;
DROP POLICY IF EXISTS "Users can update rates for their IMO" ON product_rate_table;
DROP POLICY IF EXISTS "Users can delete rates for their IMO" ON product_rate_table;

-- ============================================================================
-- Create corrected product_rate_table RLS policies
-- ============================================================================

CREATE POLICY "Users can view rates for their IMO"
  ON product_rate_table FOR SELECT
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rates for their IMO"
  ON product_rate_table FOR INSERT
  TO authenticated
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update rates for their IMO"
  ON product_rate_table FOR UPDATE
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

CREATE POLICY "Users can delete rates for their IMO"
  ON product_rate_table FOR DELETE
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Drop existing incorrect policies from carrier_condition_acceptance
-- ============================================================================

DROP POLICY IF EXISTS "Users can view acceptance rules for their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can insert acceptance rules for their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can update acceptance rules for their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can delete acceptance rules for their IMO" ON carrier_condition_acceptance;

-- ============================================================================
-- Create corrected carrier_condition_acceptance RLS policies
-- ============================================================================

CREATE POLICY "Users can view acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR SELECT
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR INSERT
  TO authenticated
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR UPDATE
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

CREATE POLICY "Users can delete acceptance rules for their IMO"
  ON carrier_condition_acceptance FOR DELETE
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Drop existing incorrect policies from recommendation_outcomes
-- ============================================================================

DROP POLICY IF EXISTS "Users can view outcomes for their IMO" ON recommendation_outcomes;
DROP POLICY IF EXISTS "Users can insert outcomes for their IMO" ON recommendation_outcomes;
DROP POLICY IF EXISTS "Users can update outcomes for their IMO" ON recommendation_outcomes;

-- ============================================================================
-- Create corrected recommendation_outcomes RLS policies
-- ============================================================================

CREATE POLICY "Users can view outcomes for their IMO"
  ON recommendation_outcomes FOR SELECT
  TO authenticated
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outcomes for their IMO"
  ON recommendation_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update outcomes for their IMO"
  ON recommendation_outcomes FOR UPDATE
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
