-- supabase/migrations/reverts/20260110_013_decision_engine_foundation.sql
-- Revert the decision engine foundation tables

-- Drop helper functions first (they depend on tables)
DROP FUNCTION IF EXISTS get_carrier_acceptance(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS get_product_rate(uuid, int, text, text, text, uuid);
DROP FUNCTION IF EXISTS calculate_premium(decimal, int);

-- Drop triggers
DROP TRIGGER IF EXISTS update_recommendation_outcomes_updated_at ON recommendation_outcomes;
DROP TRIGGER IF EXISTS update_carrier_condition_acceptance_updated_at ON carrier_condition_acceptance;
DROP TRIGGER IF EXISTS update_product_rate_table_updated_at ON product_rate_table;

-- Drop RLS policies for recommendation_outcomes
DROP POLICY IF EXISTS "Users can view outcomes for their IMO" ON recommendation_outcomes;
DROP POLICY IF EXISTS "Users can insert outcomes for their IMO" ON recommendation_outcomes;
DROP POLICY IF EXISTS "Users can update outcomes for their IMO" ON recommendation_outcomes;

-- Drop RLS policies for carrier_condition_acceptance
DROP POLICY IF EXISTS "Users can view acceptance rules for their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can insert acceptance rules for their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can update acceptance rules for their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can delete acceptance rules for their IMO" ON carrier_condition_acceptance;

-- Drop RLS policies for product_rate_table
DROP POLICY IF EXISTS "Users can view rates for their IMO" ON product_rate_table;
DROP POLICY IF EXISTS "Users can insert rates for their IMO" ON product_rate_table;
DROP POLICY IF EXISTS "Users can update rates for their IMO" ON product_rate_table;
DROP POLICY IF EXISTS "Users can delete rates for their IMO" ON product_rate_table;

-- Drop tables (order matters due to FK constraints)
DROP TABLE IF EXISTS recommendation_outcomes;
DROP TABLE IF EXISTS carrier_condition_acceptance;
DROP TABLE IF EXISTS product_rate_table;
