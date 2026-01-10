-- supabase/migrations/20260110_016_fix_health_class_result_enum.sql
-- Fix health_class_result CHECK constraint to match TypeScript enum values
-- Original used table_1, table_2, etc. but TypeScript uses table_a, table_b, etc.

-- Drop the existing CHECK constraint
ALTER TABLE carrier_condition_acceptance
DROP CONSTRAINT IF EXISTS carrier_condition_acceptance_health_class_result_check;

-- Add the corrected CHECK constraint matching TypeScript values
ALTER TABLE carrier_condition_acceptance
ADD CONSTRAINT carrier_condition_acceptance_health_class_result_check
CHECK (
  health_class_result IS NULL OR
  health_class_result IN (
    'preferred_plus',
    'preferred',
    'standard_plus',
    'standard',
    'table_a',
    'table_b',
    'table_c',
    'table_d',
    'table_e',
    'table_f',
    'table_g',
    'table_h',
    'decline'
  )
);

COMMENT ON COLUMN carrier_condition_acceptance.health_class_result IS
'Health class rating that results from this condition. Table ratings A-H map to +25% to +200% premium increase.';
