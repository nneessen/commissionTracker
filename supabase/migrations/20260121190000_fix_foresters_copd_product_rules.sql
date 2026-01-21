-- supabase/migrations/20260121190000_fix_foresters_copd_product_rules.sql
-- Fix Foresters COPD rules to be product-specific per the impairment list PDF
--
-- According to the Foresters Impairment List:
-- - Strong Foundation: Non-smoker, mild COPD, no oxygen, no steroids = Accept; Smoker = Decline
-- - Advantage Plus II, Your Term: All COPD = Decline

BEGIN;

-- Step 1: Mark old carrier-wide COPD rule sets as inactive
UPDATE underwriting_rule_sets
SET is_active = false, updated_at = NOW()
WHERE carrier_id = 'acca122f-4261-46d9-9287-da47b8ba5e37'
  AND condition_code = 'copd'
  AND product_id IS NULL;

-- Step 2: Create product-specific rule sets and rules
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
  -- YOUR TERM - COPD Rules (Always Decline)
  -- =========================================================================
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, source, review_status, is_active, version, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_imo_id, v_carrier_id, v_your_term_id,
    'condition', 'copd', 'default',
    'Foresters Your Term - COPD',
    'Product-specific COPD rules for Your Term per Foresters Impairment List - always decline',
    'manual', 'approved', true, 1, NOW(), NOW()
  ) RETURNING id INTO v_rule_set_id;

  -- Rule 1: All COPD = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 10,
    'COPD - Decline All',
    'Per Foresters Impairment List: COPD is not acceptable for Your Term',
    '{"version": 2, "root": {}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'COPD is not acceptable for Your Term',
    ARRAY['COPD diagnosis'], NOW(), NOW()
  );

  RAISE NOTICE 'Created Your Term COPD rule set: %', v_rule_set_id;

  -- =========================================================================
  -- ADVANTAGE PLUS II - COPD Rules (Always Decline)
  -- =========================================================================
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, source, review_status, is_active, version, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_imo_id, v_carrier_id, v_advantage_plus_id,
    'condition', 'copd', 'default',
    'Foresters Advantage Plus II - COPD',
    'Product-specific COPD rules for Advantage Plus II per Foresters Impairment List - always decline',
    'manual', 'approved', true, 1, NOW(), NOW()
  ) RETURNING id INTO v_rule_set_id;

  -- Rule 1: All COPD = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 10,
    'COPD - Decline All',
    'Per Foresters Impairment List: COPD is not acceptable for Advantage Plus II',
    '{"version": 2, "root": {}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'COPD is not acceptable for Advantage Plus II',
    ARRAY['COPD diagnosis'], NOW(), NOW()
  );

  RAISE NOTICE 'Created Advantage Plus II COPD rule set: %', v_rule_set_id;

  -- =========================================================================
  -- STRONG FOUNDATION - COPD Rules (More lenient - can accept mild non-smokers)
  -- =========================================================================
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, source, review_status, is_active, version, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_imo_id, v_carrier_id, v_strong_foundation_id,
    'condition', 'copd', 'default',
    'Foresters Strong Foundation - COPD',
    'Product-specific COPD rules for Strong Foundation per Foresters Impairment List - accepts mild non-smokers',
    'manual', 'approved', true, 1, NOW(), NOW()
  ) RETURNING id INTO v_rule_set_id;

  -- Rule 1: Smoker = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 10,
    'COPD - Smoker = Decline',
    'Per Foresters Impairment List: COPD with smoking is not acceptable for Strong Foundation',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "client.tobacco", "value": true, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'COPD with tobacco use is not acceptable for Strong Foundation',
    ARRAY['COPD with tobacco use'], NOW(), NOW()
  );

  -- Rule 2: Oxygen use = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 20,
    'COPD - Oxygen Use = Decline',
    'Per Foresters Impairment List: COPD requiring oxygen is not acceptable',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "copd.oxygen_use", "value": true, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'COPD requiring oxygen is not acceptable',
    ARRAY['COPD with oxygen therapy'], NOW(), NOW()
  );

  -- Rule 3: Steroid use = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 30,
    'COPD - Steroid Use = Decline',
    'Per Foresters Impairment List: COPD requiring steroids is not acceptable',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "copd.on_steroids", "value": true, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'COPD requiring steroids is not acceptable',
    ARRAY['COPD with steroid treatment'], NOW(), NOW()
  );

  -- Rule 4: Moderate or severe = Decline
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 40,
    'COPD - Moderate/Severe = Decline',
    'Per Foresters Impairment List: Only mild COPD is acceptable',
    '{"version": 2, "root": {"any": [{"type": "string", "field": "copd.severity", "value": "moderate", "operator": "eq", "treatNullAs": "unknown"}, {"type": "string", "field": "copd.severity", "value": "severe", "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'ineligible', 'decline', 'none',
    'Only mild COPD is acceptable for Strong Foundation',
    ARRAY['COPD moderate or severe'], NOW(), NOW()
  );

  -- Rule 5: Non-smoker, mild, no oxygen, no steroids = Accept
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 50,
    'COPD - Mild Non-Smoker = Accept',
    'Per Foresters Impairment List: Non-smoker, mild COPD, no oxygen, no steroids = Accept',
    '{"version": 2, "root": {"all": [{"type": "boolean", "field": "client.tobacco", "value": false, "operator": "eq", "treatNullAs": "unknown"}, {"type": "string", "field": "copd.severity", "value": "mild", "operator": "eq", "treatNullAs": "unknown"}, {"type": "boolean", "field": "copd.oxygen_use", "value": false, "operator": "eq", "treatNullAs": "unknown"}, {"type": "boolean", "field": "copd.on_steroids", "value": false, "operator": "eq", "treatNullAs": "unknown"}]}}'::jsonb,
    2, 'eligible', 'standard', 'none',
    'Mild COPD acceptable for Strong Foundation with non-smoker, no oxygen, no steroids',
    ARRAY[]::text[], NOW(), NOW()
  );

  -- Rule 6: Fallback - refer
  INSERT INTO underwriting_rules (
    rule_set_id, priority, name, description, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_table_rating,
    outcome_reason, outcome_concerns, created_at, updated_at
  ) VALUES (
    v_rule_set_id, 60,
    'COPD - Refer for Review',
    'Fallback: refer cases that do not match other rules',
    '{"version": 2, "root": {}}'::jsonb,
    2, 'refer', 'refer', 'none',
    'COPD case requires manual review',
    ARRAY['Manual review required'], NOW(), NOW()
  );

  RAISE NOTICE 'Created Strong Foundation COPD rule set: %', v_rule_set_id;

END $$;

COMMIT;
