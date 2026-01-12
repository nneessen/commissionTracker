-- =============================================================================
-- Phase 3: Enhanced Condition Questionnaires with Field Requirements
-- =============================================================================
-- Adds versioned field requirements to acceptance rules and enhances
-- health conditions with acceptance key field tracking.
--
-- Design: Keep questionnaire definitions (what to ask) separate from
-- acceptance rules (which thresholds imply which outcomes).
-- =============================================================================

-- =============================================================================
-- Add field requirement columns to carrier_condition_acceptance
-- =============================================================================

-- Required fields that must be answered to evaluate this rule
-- Array of follow_up_schema field IDs
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS required_fields JSONB DEFAULT '[]'::jsonb;

-- Field requirements with operators and thresholds
-- Example: {"a1c": {"operator": "lte", "value": 7.5}, "insulin_use": {"operator": "eq", "value": false}}
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS field_requirements JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN carrier_condition_acceptance.required_fields IS
'Array of follow_up_schema field IDs required to evaluate this rule. E.g., ["a1c", "diagnosis_date", "complications"]';

COMMENT ON COLUMN carrier_condition_acceptance.field_requirements IS
'Field requirements with operators. Structure: {"field_id": {"operator": "lte|gte|eq|neq|between|contains_any", "value": <threshold>, "treatNullAs": "fail|skip|default"}}';

-- =============================================================================
-- Enhance underwriting_health_conditions with schema versioning
-- =============================================================================

-- Schema version for the follow_up_schema
ALTER TABLE underwriting_health_conditions
ADD COLUMN IF NOT EXISTS follow_up_schema_version INTEGER DEFAULT 1;

-- Fields that affect acceptance decisions (for quick reference)
ALTER TABLE underwriting_health_conditions
ADD COLUMN IF NOT EXISTS acceptance_key_fields TEXT[] DEFAULT '{}'::text[];

COMMENT ON COLUMN underwriting_health_conditions.follow_up_schema_version IS
'Version of the follow_up_schema structure. Increment when adding required fields or changing structure.';

COMMENT ON COLUMN underwriting_health_conditions.acceptance_key_fields IS
'Field IDs from follow_up_schema that are used in acceptance rules. E.g., ["a1c", "ejection_fraction"]';

-- =============================================================================
-- Update existing health conditions with acceptance_key_fields
-- =============================================================================

-- Diabetes conditions
UPDATE underwriting_health_conditions
SET acceptance_key_fields = ARRAY['a1c', 'diagnosis_date', 'insulin_use', 'complications', 'treatment']
WHERE code IN ('diabetes_type_1', 'diabetes_type_2');

-- Cardiovascular conditions
UPDATE underwriting_health_conditions
SET acceptance_key_fields = ARRAY['ejection_fraction', 'diagnosis_date', 'surgery_date', 'medications', 'last_event_date']
WHERE category = 'cardiovascular';

-- Cancer conditions
UPDATE underwriting_health_conditions
SET acceptance_key_fields = ARRAY['diagnosis_date', 'stage', 'treatment_status', 'remission_date', 'recurrence']
WHERE category = 'cancer';

-- Mental health conditions
UPDATE underwriting_health_conditions
SET acceptance_key_fields = ARRAY['diagnosis_date', 'hospitalization_history', 'current_treatment', 'medication_stable']
WHERE category = 'mental_health';

-- =============================================================================
-- Add index for efficient field requirement lookups
-- =============================================================================

-- Index for finding rules that require specific fields
CREATE INDEX IF NOT EXISTS idx_acceptance_required_fields
ON carrier_condition_acceptance USING gin (required_fields);

-- =============================================================================
-- Validation function for field_requirements DSL
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_field_requirements(p_requirements JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_field TEXT;
  v_requirement JSONB;
  v_operator TEXT;
  v_valid_operators TEXT[] := ARRAY['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'contains_any', 'not_contains'];
  v_valid_null_handlers TEXT[] := ARRAY['fail', 'skip', 'default'];
BEGIN
  -- Empty object is valid
  IF p_requirements IS NULL OR p_requirements = '{}'::jsonb THEN
    RETURN TRUE;
  END IF;

  -- Must be an object
  IF jsonb_typeof(p_requirements) != 'object' THEN
    RETURN FALSE;
  END IF;

  -- Validate each field requirement
  FOR v_field, v_requirement IN SELECT * FROM jsonb_each(p_requirements)
  LOOP
    -- Each requirement must have an operator
    v_operator := v_requirement->>'operator';
    IF v_operator IS NULL OR NOT (v_operator = ANY(v_valid_operators)) THEN
      RETURN FALSE;
    END IF;

    -- Each requirement must have a value (except for some operators)
    IF v_requirement->'value' IS NULL AND v_operator NOT IN ('eq', 'neq') THEN
      RETURN FALSE;
    END IF;

    -- If treatNullAs is specified, it must be valid
    IF v_requirement->>'treatNullAs' IS NOT NULL
       AND NOT (v_requirement->>'treatNullAs' = ANY(v_valid_null_handlers)) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION validate_field_requirements IS
'Validates the structure of field_requirements JSONB. Returns TRUE if valid.';

-- =============================================================================
-- Add constraint to validate field_requirements format
-- =============================================================================

ALTER TABLE carrier_condition_acceptance
ADD CONSTRAINT chk_field_requirements_valid
CHECK (validate_field_requirements(field_requirements));
