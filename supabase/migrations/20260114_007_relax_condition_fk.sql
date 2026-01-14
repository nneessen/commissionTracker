-- supabase/migrations/20260114_007_relax_condition_fk.sql
-- Remove FK constraint on underwriting_rule_sets.condition_code
--
-- Purpose: Allow underwriting rules to reference condition codes that don't exist
-- in the health_conditions table. Carrier-specific impairment rules reference
-- hundreds of conditions that are not user-selectable in the wizard.
--
-- This decouples:
-- - underwriting_health_conditions: User-selectable conditions with follow-up questions
-- - underwriting_rule_sets: Carrier-specific rules that can reference any impairment code

-- Drop the FK constraint if it exists
ALTER TABLE underwriting_rule_sets
DROP CONSTRAINT IF EXISTS underwriting_rule_sets_condition_code_fkey;

-- Also check for any constraint with different naming
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'underwriting_rule_sets'
    AND c.contype = 'f'
    AND EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = t.oid
        AND a.attnum = ANY(c.conkey)
        AND a.attname = 'condition_code'
    );

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE underwriting_rule_sets DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', constraint_name;
  END IF;
END $$;

-- Add a comment explaining why no FK exists
COMMENT ON COLUMN underwriting_rule_sets.condition_code IS
  'Condition code for the rule. Not a FK - rules can reference impairment codes not in health_conditions table.';
