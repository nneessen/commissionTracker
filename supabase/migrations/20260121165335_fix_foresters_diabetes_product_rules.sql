-- supabase/migrations/20260121165335_fix_foresters_diabetes_product_rules.sql
-- Fix Foresters diabetes rules to be product-specific per the impairment list PDF
--
-- According to the Foresters Impairment List:
-- Row 1: Advantage Plus II, Your Term, Smart UL - Non-insulin, good control, no complications = Accept
-- Row 2: Strong Foundation ONLY - Individual consideration (A1C, age, duration, build, no complications)
-- Row 3: Advantage Plus II, Your Term, Smart UL - Insulin OR poor control OR complications = DECLINE

BEGIN;

-- Step 1: Mark the old carrier-wide rule set as inactive
UPDATE underwriting_rule_sets
SET is_active = false, updated_at = NOW()
WHERE id = 'b4dc32df-5925-4e58-be8b-14d0616c5d2d';

-- Step 2: Create product-specific rule sets and rules using DO block
DO $$
DECLARE
  v_imo_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_carrier_id UUID := 'acca122f-4261-46d9-9287-da47b8ba5e37';  -- Foresters Financial
  v_your_term_id UUID := '73c35990-7da1-479b-b1fa-492b0ffb6b40';
  v_advantage_plus_id UUID := 'cd70f38e-0e9f-492d-8ac3-02294b24df8e';
  v_strong_foundation_id UUID := '544bb4d4-20aa-4b1a-b77d-3b95c3eaa98f';
  v_rule_set_id UUID;
BEGIN
  -- =========================================================================
  -- YOUR TERM - Diabetes Rules
  -- =========================================================================
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, source, review_status, is_active, version, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_imo_id, v_carrier_id, v_your_term_id,
    'condition', 'diabetes', 'default',
    'Foresters Your Term - Diabetes',
    'Product-specific diabetes rules for Your Term per Foresters Impairment List',
    'manual', 'approved', true, 1, NOW(), NOW()
  ) RETURNING id INTO v_rule_set_id;

  -- Rule 1: Insulin = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 10,
    'Diabetes - Insulin Use = Decline',
    'Per Foresters Impairment List Row 3: Treated with Insulin = Decline',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "diabetes.insulin_use", "value": true, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'Insulin use is not acceptable for Your Term',
    ARRAY['Diabetes treated with insulin'], NOW(), NOW()
  );

  -- Rule 2: Poor control = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 20,
    'Diabetes - Poor Control = Decline',
    'Per Foresters Impairment List Row 3: Poor control = Decline',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "diabetes.good_control", "value": false, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'Poor diabetes control is not acceptable for Your Term',
    ARRAY['Diabetes with poor control'], NOW(), NOW()
  );

  -- Rule 3: Complications = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 30,
    'Diabetes - Complications = Decline',
    'Per Foresters Impairment List Row 3: Complications = Decline',
    '{"version": 2, "root": {"all": [{"type": "array", "field": "diabetes.complications", "operator": "is_not_empty"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'Diabetic complications are not acceptable for Your Term',
    ARRAY['Diabetic complications present'], NOW(), NOW()
  );

  -- Rule 4: Non-insulin, good control, non-smoker, no complications = Accept
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 40,
    'Diabetes Type 2 - Non-insulin, Good Control = Accept',
    'Per Foresters Impairment List Row 1: Non-insulin, good control, non-smoker = Accept',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "diabetes.insulin_use", "value": false, "operator": "eq", "treatNullAs": "unknown"}, {"type": "boolean", "field": "diabetes.good_control", "value": true, "operator": "eq", "treatNullAs": "unknown"}, {"type": "boolean", "field": "client.tobacco", "value": false, "operator": "eq", "treatNullAs": "unknown"}, {"type": "array", "field": "diabetes.complications", "operator": "is_empty"}]}}'::jsonb,
    2, 'eligible', 'standard', 'none',
    'Diabetes Type 2 acceptable with non-insulin treatment and good control',
    ARRAY[]::text[], NOW(), NOW()
  );

  -- Rule 5: Fallback - refer
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 50,
    'Diabetes - Refer for Review',
    'Fallback: refer cases that do not match other rules',
    '{"version": 2, "root": {}}'::jsonb,
    2, 'refer', 'refer', 'none',
    'Diabetes case requires manual review',
    ARRAY['Manual review required'], NOW(), NOW()
  );

  RAISE NOTICE 'Created Your Term diabetes rule set: %', v_rule_set_id;

  -- =========================================================================
  -- ADVANTAGE PLUS II - Same rules as Your Term
  -- =========================================================================
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, source, review_status, is_active, version, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_imo_id, v_carrier_id, v_advantage_plus_id,
    'condition', 'diabetes', 'default',
    'Foresters Advantage Plus II - Diabetes',
    'Product-specific diabetes rules for Advantage Plus II per Foresters Impairment List',
    'manual', 'approved', true, 1, NOW(), NOW()
  ) RETURNING id INTO v_rule_set_id;

  -- Same rules as Your Term
  INSERT INTO underwriting_rules (rule_set_id, priority, name, description, predicate, predicate_version, outcome_eligibility, outcome_health_class, outcome_table_rating, outcome_reason, outcome_concerns, created_at, updated_at) VALUES
    (v_rule_set_id, 10, 'Diabetes - Insulin Use = Decline', 'Insulin = Decline', '{"version": 2, "root": {"all": [{"type": "boolean", "field": "diabetes.insulin_use", "value": true, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb, 2, 'ineligible', 'decline', 'none', 'Insulin use is not acceptable', ARRAY['Diabetes treated with insulin'], NOW(), NOW()),
    (v_rule_set_id, 20, 'Diabetes - Poor Control = Decline', 'Poor control = Decline', '{"version": 2, "root": {"all": [{"type": "boolean", "field": "diabetes.good_control", "value": false, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb, 2, 'ineligible', 'decline', 'none', 'Poor diabetes control is not acceptable', ARRAY['Diabetes with poor control'], NOW(), NOW()),
    (v_rule_set_id, 30, 'Diabetes - Complications = Decline', 'Complications = Decline', '{"version": 2, "root": {"all": [{"type": "array", "field": "diabetes.complications", "operator": "is_not_empty"}]}}'::jsonb, 2, 'ineligible', 'decline', 'none', 'Diabetic complications are not acceptable', ARRAY['Diabetic complications present'], NOW(), NOW()),
    (v_rule_set_id, 40, 'Diabetes Type 2 - Non-insulin, Good Control = Accept', 'Accept if non-insulin, good control', '{"version": 2, "root": {"all": [{"type": "boolean", "field": "diabetes.insulin_use", "value": false, "operator": "eq", "treatNullAs": "unknown"}, {"type": "boolean", "field": "diabetes.good_control", "value": true, "operator": "eq", "treatNullAs": "unknown"}, {"type": "boolean", "field": "client.tobacco", "value": false, "operator": "eq", "treatNullAs": "unknown"}, {"type": "array", "field": "diabetes.complications", "operator": "is_empty"}]}}'::jsonb, 2, 'eligible', 'standard', 'none', 'Diabetes Type 2 acceptable with non-insulin treatment', ARRAY[]::text[], NOW(), NOW()),
    (v_rule_set_id, 50, 'Diabetes - Refer for Review', 'Fallback refer', '{"version": 2, "root": {}}'::jsonb, 2, 'refer', 'refer', 'none', 'Requires manual review', ARRAY['Manual review required'], NOW(), NOW());

  RAISE NOTICE 'Created Advantage Plus II diabetes rule set: %', v_rule_set_id;

  -- =========================================================================
  -- STRONG FOUNDATION - More lenient (Individual Consideration)
  -- Per Row 2: Individual consideration based on A1C, age, duration, build
  -- =========================================================================
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, source, review_status, is_active, version, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_imo_id, v_carrier_id, v_strong_foundation_id,
    'condition', 'diabetes', 'default',
    'Foresters Strong Foundation - Diabetes',
    'Product-specific diabetes rules for Strong Foundation per Foresters Impairment List - more lenient',
    'manual', 'approved', true, 1, NOW(), NOW()
  ) RETURNING id INTO v_rule_set_id;

  -- Rule 1: Complications = Decline (even Strong Foundation declines complications)
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 10,
    'Diabetes - Complications = Decline',
    'Diabetic complications not acceptable even for Strong Foundation',
    '{"version": 2, "root": {"all": [{"type": "array", "field": "diabetes.complications", "operator": "is_not_empty"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'Diabetic complications are not acceptable for Strong Foundation',
    ARRAY['Diabetic complications present'], NOW(), NOW()
  );

  -- Rule 2: No complications = Individual Consideration (refer)
  -- Strong Foundation accepts insulin users for individual consideration if no complications
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 20,
    'Diabetes - Individual Consideration',
    'Per Foresters Impairment List Row 2: Individual consideration based on A1C, age, duration, build',
    '{"version": 2, "root": {"all": [{"type": "array", "field": "diabetes.complications", "operator": "is_empty"}]}}'::jsonb,
    2, 'refer', 'refer', 'none',
    'Diabetes evaluated individually for Strong Foundation based on A1C, age, duration, and build',
    ARRAY['Individual consideration required'], NOW(), NOW()
  );

  -- Rule 3: Fallback
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 30,
    'Diabetes - Refer for Review',
    'Fallback',
    '{"version": 2, "root": {}}'::jsonb,
    2, 'refer', 'refer', 'none',
    'Diabetes case requires manual review',
    ARRAY['Manual review required'], NOW(), NOW()
  );

  RAISE NOTICE 'Created Strong Foundation diabetes rule set: %', v_rule_set_id;

END $$;

COMMIT;
