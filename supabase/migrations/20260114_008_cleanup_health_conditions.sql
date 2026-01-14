-- supabase/migrations/20260114_008_cleanup_health_conditions.sql
-- Clean up junk health conditions from carrier seed scripts
--
-- Problem: Multiple seed scripts polluted underwriting_health_conditions with:
-- - 'medical_conditions' category: 200+ conditions with empty follow_up_schema
-- - 'knockout' category: Auto-decline conditions (shouldn't be user-selectable)
-- - 'lifestyle' category: Hobbies like "Auto Racing", "Hang Gliding"
--
-- This migration deletes all junk while preserving:
-- - The 27 proper conditions from the original seed (20260109_002)
-- - All underwriting_rule_sets that reference these codes (FK already removed)

BEGIN;

-- Log what we're about to delete for audit purposes
DO $$
DECLARE
  junk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO junk_count
  FROM underwriting_health_conditions
  WHERE category IN ('medical_conditions', 'lifestyle', 'knockout')
     OR (
       (follow_up_schema = '{}'::jsonb OR follow_up_schema = '{"questions": []}'::jsonb)
       AND category NOT IN (
         'cardiovascular', 'metabolic', 'cancer', 'respiratory',
         'mental_health', 'gastrointestinal', 'neurological',
         'autoimmune', 'renal', 'substance', 'endocrine', 'infectious'
       )
     );
  RAISE NOTICE 'About to delete % junk health conditions', junk_count;
END $$;

-- Step 1: Delete carrier_condition_acceptance rules referencing junk conditions
-- (These are FK-protected, must delete first)
DELETE FROM carrier_condition_acceptance
WHERE condition_code IN (
  SELECT code FROM underwriting_health_conditions
  WHERE category IN ('medical_conditions', 'lifestyle', 'knockout')
);

DELETE FROM carrier_condition_acceptance
WHERE condition_code IN (
  SELECT code FROM underwriting_health_conditions
  WHERE (follow_up_schema = '{}'::jsonb OR follow_up_schema = '{"questions": []}'::jsonb)
    AND category NOT IN (
      'cardiovascular', 'metabolic', 'cancer', 'respiratory',
      'mental_health', 'gastrointestinal', 'neurological',
      'autoimmune', 'renal', 'substance', 'endocrine', 'infectious'
    )
);

-- Step 2: Delete conditions in garbage categories
DELETE FROM underwriting_health_conditions
WHERE category IN ('medical_conditions', 'lifestyle', 'knockout');

-- Step 3: Delete conditions with empty follow_up_schema in wrong categories
-- (Catches any stragglers that slipped through with unusual category names)
DELETE FROM underwriting_health_conditions
WHERE (follow_up_schema = '{}'::jsonb OR follow_up_schema = '{"questions": []}'::jsonb)
  AND category NOT IN (
    'cardiovascular', 'metabolic', 'cancer', 'respiratory',
    'mental_health', 'gastrointestinal', 'neurological',
    'autoimmune', 'renal', 'substance', 'endocrine', 'infectious'
  );

-- Log remaining conditions
DO $$
DECLARE
  remaining_count INTEGER;
  category_summary TEXT;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM underwriting_health_conditions;

  SELECT string_agg(category || ': ' || cnt::text, ', ') INTO category_summary
  FROM (
    SELECT category, COUNT(*) as cnt
    FROM underwriting_health_conditions
    GROUP BY category
    ORDER BY category
  ) sub;

  RAISE NOTICE 'Remaining health conditions: % (%)', remaining_count, category_summary;
END $$;

COMMIT;
