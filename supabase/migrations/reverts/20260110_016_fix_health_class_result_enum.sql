-- supabase/migrations/reverts/20260110_016_fix_health_class_result_enum.sql
-- Revert health_class_result CHECK constraint to original values

-- Drop the corrected CHECK constraint
ALTER TABLE carrier_condition_acceptance
DROP CONSTRAINT IF EXISTS carrier_condition_acceptance_health_class_result_check;

-- Re-add the original CHECK constraint (with numeric table ratings)
ALTER TABLE carrier_condition_acceptance
ADD CONSTRAINT carrier_condition_acceptance_health_class_result_check
CHECK (
  health_class_result IN (
    'preferred_plus',
    'preferred',
    'standard_plus',
    'standard',
    'table_1',
    'table_2',
    'table_3',
    'table_4',
    'table_6',
    'table_8'
  )
);
