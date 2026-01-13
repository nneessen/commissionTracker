-- supabase/migrations/20260112_003_fix_knockout_scope.sql
-- Fix: Knockout rules should use scope='condition' (not 'global') since they have condition_code

-- =============================================================================
-- FUNCTION: Generate Global Knockout Rule Sets (FIXED SCOPE)
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_global_knockout_rules(
  p_carrier_id uuid,
  p_imo_id uuid,
  p_user_id uuid,
  p_knockout_codes text[] DEFAULT NULL,
  p_strategy text DEFAULT 'skip_if_exists'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conditions knockout_condition_def[];
  v_condition knockout_condition_def;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
  v_rule_set_ids uuid[] := ARRAY[]::uuid[];
  v_rule_set_id uuid;
  v_existing_id uuid;
  v_predicate jsonb;
  v_default_outcome jsonb;
BEGIN
  -- Validate strategy
  IF p_strategy NOT IN ('skip_if_exists', 'create_new_draft', 'upsert_draft') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid strategy. Must be: skip_if_exists, create_new_draft, or upsert_draft'
    );
  END IF;

  -- Verify user has access to this IMO
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id
    AND imo_id = p_imo_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not have access to this IMO'
    );
  END IF;

  -- Verify carrier belongs to IMO
  IF NOT EXISTS (
    SELECT 1 FROM carriers
    WHERE id = p_carrier_id
    AND imo_id = p_imo_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Carrier not found or does not belong to this IMO'
    );
  END IF;

  -- Get all knockout conditions
  v_conditions := get_knockout_conditions();

  -- Default outcome for knockout rules - use 'refer' as default (actual knockout in rule)
  v_default_outcome := jsonb_build_object(
    'eligibility', 'refer',
    'healthClass', 'refer',
    'reason', 'Requires review for knockout condition'
  );

  -- Process each condition
  FOREACH v_condition IN ARRAY v_conditions
  LOOP
    -- Filter by requested codes if provided
    IF p_knockout_codes IS NOT NULL AND v_condition.code != ALL(p_knockout_codes) THEN
      CONTINUE;
    END IF;

    -- Check for existing rule set (scope='condition' since we have condition_code)
    SELECT id INTO v_existing_id
    FROM underwriting_rule_sets
    WHERE carrier_id = p_carrier_id
      AND imo_id = p_imo_id
      AND scope = 'condition'
      AND condition_code = v_condition.code
      AND source = 'imported'
    ORDER BY version DESC NULLS LAST
    LIMIT 1;

    -- Handle based on strategy
    IF v_existing_id IS NOT NULL THEN
      IF p_strategy = 'skip_if_exists' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      ELSIF p_strategy = 'upsert_draft' THEN
        -- Check if existing is approved - if so, we can't modify it
        IF EXISTS (
          SELECT 1 FROM underwriting_rule_sets
          WHERE id = v_existing_id AND review_status = 'approved'
        ) THEN
          v_skipped_count := v_skipped_count + 1;
          CONTINUE;
        END IF;
        -- Delete existing draft and its rules (cascade)
        DELETE FROM underwriting_rule_sets WHERE id = v_existing_id;
      END IF;
      -- For create_new_draft, we continue to create a new version
    END IF;

    -- Build predicate for condition presence
    v_predicate := jsonb_build_object(
      'version', 2,
      'root', jsonb_build_object(
        'type', 'all',
        'children', jsonb_build_array(
          jsonb_build_object(
            'type', 'condition_presence',
            'field', 'condition.present',
            'operator', 'eq',
            'value', true
          )
        )
      )
    );

    -- Create rule set with scope='condition' (required when condition_code is set)
    INSERT INTO underwriting_rule_sets (
      carrier_id,
      imo_id,
      name,
      description,
      scope,
      condition_code,
      source,
      review_status,
      created_by,
      default_outcome,
      variant,
      version
    ) VALUES (
      p_carrier_id,
      p_imo_id,
      'Knockout: ' || v_condition.name,
      'Auto-generated knockout rule for ' || v_condition.name || ' (' || v_condition.severity || ')',
      'condition',  -- FIXED: use 'condition' scope since we have condition_code
      v_condition.code,
      'imported',
      'draft',
      p_user_id,
      v_default_outcome,
      'generated',
      COALESCE((
        SELECT MAX(version) + 1
        FROM underwriting_rule_sets
        WHERE carrier_id = p_carrier_id
        AND condition_code = v_condition.code
      ), 1)
    )
    RETURNING id INTO v_rule_set_id;

    -- Create the knockout rule
    INSERT INTO underwriting_rules (
      rule_set_id,
      priority,
      name,
      description,
      predicate,
      predicate_version,
      outcome_eligibility,
      outcome_health_class,
      outcome_reason,
      outcome_concerns
    ) VALUES (
      v_rule_set_id,
      1,
      v_condition.name || ' Present',
      'Decline if ' || v_condition.name || ' is present',
      v_predicate,
      2,
      CASE WHEN v_condition.severity = 'absolute' THEN 'ineligible' ELSE 'refer' END,
      CASE WHEN v_condition.severity = 'absolute' THEN 'decline' ELSE 'refer' END,
      v_condition.default_reason,
      ARRAY[v_condition.code]
    );

    v_rule_set_ids := array_append(v_rule_set_ids, v_rule_set_id);
    v_created_count := v_created_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created', v_created_count,
    'skipped', v_skipped_count,
    'rule_set_ids', to_jsonb(v_rule_set_ids)
  );
END;
$$;
