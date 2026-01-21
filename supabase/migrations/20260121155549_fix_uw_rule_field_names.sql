-- supabase/migrations/20260121155549_fix_uw_rule_field_names.sql
-- Fix field name mismatch in diabetes insulin rules
--
-- Problem: Seeded rules use 'uses_insulin' but conditionResponseTransformer outputs 'insulin_use'
-- Solution: Update all rule predicates to use the canonical field name 'insulin_use'

BEGIN;

-- Log the rules that will be updated (for audit purposes)
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM underwriting_rules
  WHERE predicate::text LIKE '%uses_insulin%';

  RAISE NOTICE 'Updating % rules with uses_insulin → insulin_use', affected_count;
END $$;

-- Update all rule predicates: uses_insulin → insulin_use
-- This handles the field in any position within the JSONB predicate
UPDATE underwriting_rules
SET
  predicate = REPLACE(predicate::text, 'uses_insulin', 'insulin_use')::jsonb,
  updated_at = NOW()
WHERE predicate::text LIKE '%uses_insulin%';

-- Note: carrier_condition_acceptance uses V1 format without predicate JSONB
-- No update needed for that table

-- Verify the fix
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM underwriting_rules
  WHERE predicate::text LIKE '%uses_insulin%';

  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rules still have uses_insulin', remaining_count;
  END IF;

  RAISE NOTICE 'Migration successful: all rules now use insulin_use';
END $$;

COMMIT;
