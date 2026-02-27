-- Add graded, modified, and guaranteed_issue health class values
-- These support whole life / final expense benefit-tier outcomes:
--   Full Benefit → standard (existing)
--   Graded Benefit → graded (NEW)
--   Modified Benefit → modified (NEW)
--   Guaranteed Issue → guaranteed_issue (NEW)
--   Declined → decline (existing)

-- ============================================================================
-- 1. Extend health_class enum
-- ============================================================================

ALTER TYPE health_class ADD VALUE IF NOT EXISTS 'graded' AFTER 'substandard';
ALTER TYPE health_class ADD VALUE IF NOT EXISTS 'modified' AFTER 'graded';
ALTER TYPE health_class ADD VALUE IF NOT EXISTS 'guaranteed_issue' AFTER 'modified';

-- ============================================================================
-- 2. Update health_class_rank() with new values
-- ============================================================================

CREATE OR REPLACE FUNCTION health_class_rank(hc health_class)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE hc
    WHEN 'preferred_plus' THEN 1
    WHEN 'preferred' THEN 2
    WHEN 'standard_plus' THEN 3
    WHEN 'standard' THEN 4
    WHEN 'substandard' THEN 5
    WHEN 'graded' THEN 6
    WHEN 'modified' THEN 7
    WHEN 'guaranteed_issue' THEN 8
    WHEN 'refer' THEN 9
    WHEN 'unknown' THEN 10
    WHEN 'decline' THEN 11
    ELSE 10 -- Default to unknown for safety
  END;
$$;

COMMENT ON FUNCTION health_class_rank IS
'Returns severity ranking for health class. Higher = worse. 1=preferred_plus through 11=decline. Includes graded/modified/guaranteed_issue benefit tiers.';

-- ============================================================================
-- 3. Update rank_to_health_class() with new values
-- ============================================================================

CREATE OR REPLACE FUNCTION rank_to_health_class(rank INTEGER)
RETURNS health_class
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE rank
    WHEN 1 THEN 'preferred_plus'::health_class
    WHEN 2 THEN 'preferred'::health_class
    WHEN 3 THEN 'standard_plus'::health_class
    WHEN 4 THEN 'standard'::health_class
    WHEN 5 THEN 'substandard'::health_class
    WHEN 6 THEN 'graded'::health_class
    WHEN 7 THEN 'modified'::health_class
    WHEN 8 THEN 'guaranteed_issue'::health_class
    WHEN 9 THEN 'refer'::health_class
    WHEN 10 THEN 'unknown'::health_class
    WHEN 11 THEN 'decline'::health_class
    ELSE 'unknown'::health_class
  END;
$$;

-- ============================================================================
-- 4. Update carrier_condition_acceptance CHECK constraint
-- ============================================================================

ALTER TABLE carrier_condition_acceptance
DROP CONSTRAINT IF EXISTS carrier_condition_acceptance_health_class_result_check;

ALTER TABLE carrier_condition_acceptance
ADD CONSTRAINT carrier_condition_acceptance_health_class_result_check
CHECK (
  health_class_result IS NULL OR
  health_class_result IN (
    'preferred_plus',
    'preferred',
    'standard_plus',
    'standard',
    'substandard',
    'graded',
    'modified',
    'guaranteed_issue',
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
