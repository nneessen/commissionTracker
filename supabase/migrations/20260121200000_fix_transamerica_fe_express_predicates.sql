-- supabase/migrations/20260121200000_fix_transamerica_fe_express_predicates.sql
-- Fix Transamerica FE Express WL rules that have empty predicates
--
-- CRITICAL BUG: The original seed script created all rules with predicate = { version: 2, root: {} }
-- This means NO rules will ever match because the predicate evaluator treats empty root as "no conditions = no match"
--
-- FIX: The FE Express WL product uses a "simplified" underwriting model where:
-- - If a condition is present, check if within/after the lookback period
-- - Decision is based on timeframe: select (immediate), graded (2yr wait), or decline
--
-- APPROACH: For this product, the condition_code in the rule_set IS the condition match.
-- We only need predicates when there are timeframe-based distinctions.
-- Empty predicate { root: {} } should mean "always matches when this condition is present"
-- But the current evaluator may not work that way, so we need to add explicit condition presence checks.

BEGIN;

-- Step 1: Count existing Transamerica rules (for audit)
DO $$
DECLARE
  v_rule_count INTEGER;
  v_empty_predicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_rule_count
  FROM underwriting_rules r
  JOIN underwriting_rule_sets rs ON r.rule_set_id = rs.id
  WHERE rs.carrier_id = 'cf4b8c4d-6332-44c3-8eca-c83f280ebaa0';

  SELECT COUNT(*) INTO v_empty_predicate_count
  FROM underwriting_rules r
  JOIN underwriting_rule_sets rs ON r.rule_set_id = rs.id
  WHERE rs.carrier_id = 'cf4b8c4d-6332-44c3-8eca-c83f280ebaa0'
    AND (r.predicate->'root' = '{}'::jsonb OR r.predicate->'root' IS NULL);

  RAISE NOTICE 'Transamerica rules: % total, % with empty predicates', v_rule_count, v_empty_predicate_count;
END $$;

-- Step 2: Delete ALL existing Transamerica FE Express WL rules (they're broken)
-- We'll recreate them in the import script
DELETE FROM underwriting_rules
WHERE rule_set_id IN (
  SELECT id FROM underwriting_rule_sets
  WHERE carrier_id = 'cf4b8c4d-6332-44c3-8eca-c83f280ebaa0'
    AND product_id = '4361e8f9-5996-4518-ad9f-accce92ea842'
);

DELETE FROM underwriting_rule_sets
WHERE carrier_id = 'cf4b8c4d-6332-44c3-8eca-c83f280ebaa0'
  AND product_id = '4361e8f9-5996-4518-ad9f-accce92ea842';

DO $$
BEGIN
  RAISE NOTICE 'Deleted all Transamerica FE Express WL rules. Re-run seed script with fixed predicates.';
END $$;

COMMIT;
