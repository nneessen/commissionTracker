-- =============================================================================
-- Harden Underwriting Session Persistence
-- =============================================================================
-- 1. Persist exact requested face amounts for faithful session replay.
-- 2. Move underwriting session persistence to a DB-auth-bound RPC that accepts
--    raw wizard inputs only and derives tenant/user ownership in the database.
-- 3. Remove direct client inserts for sessions, recommendations, and audit logs.
-- =============================================================================

ALTER TABLE public.underwriting_sessions
ADD COLUMN IF NOT EXISTS requested_face_amounts JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.underwriting_sessions
SET requested_face_amounts = jsonb_build_array(requested_face_amount)
WHERE requested_face_amount IS NOT NULL
  AND (
    requested_face_amounts = '[]'::jsonb
    OR requested_face_amounts IS NULL
  );

COMMENT ON COLUMN public.underwriting_sessions.requested_face_amounts IS
'Exact requested face amounts entered in the wizard, preserved in order for session replay and audit reconstruction.';

DROP POLICY IF EXISTS sessions_insert ON public.underwriting_sessions;
DROP POLICY IF EXISTS sessions_update ON public.underwriting_sessions;
DROP POLICY IF EXISTS sessions_delete ON public.underwriting_sessions;
DROP POLICY IF EXISTS "System can insert recommendations" ON public.underwriting_session_recommendations;
DROP POLICY IF EXISTS "Users can delete recommendations for their sessions" ON public.underwriting_session_recommendations;
DROP POLICY IF EXISTS eval_log_insert ON public.underwriting_rule_evaluation_log;

DROP FUNCTION IF EXISTS public.save_underwriting_session(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.save_underwriting_session_v2(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_imo_id UUID;
  v_agency_id UUID;
  v_payload JSONB := COALESCE(p_payload, '{}'::jsonb);
  v_allowed_keys TEXT[] := ARRAY[
    'clientName',
    'clientDob',
    'clientAge',
    'clientGender',
    'clientState',
    'clientHeightInches',
    'clientWeightLbs',
    'healthResponses',
    'conditionsReported',
    'tobaccoUse',
    'tobaccoDetails',
    'requestedFaceAmounts',
    'requestedProductTypes',
    'decisionTreeId',
    'sessionDurationSeconds',
    'notes'
  ];
  v_requested_face_amounts JSONB := COALESCE(
    v_payload->'requestedFaceAmounts',
    '[]'::jsonb
  );
  v_requested_face_amount NUMERIC(15, 2);
  v_conditions_reported TEXT[];
  v_requested_product_types TEXT[];
  v_client_height_inches INTEGER;
  v_client_weight_lbs INTEGER;
  v_client_bmi NUMERIC(5, 2);
  v_session public.underwriting_sessions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'unauthorized',
      'error',
      'Unauthorized'
    );
  END IF;

  SELECT imo_id, agency_id
  INTO v_imo_id, v_agency_id
  FROM public.user_profiles
  WHERE id = v_user_id;

  IF NOT FOUND OR v_imo_id IS NULL THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'profile_not_configured',
      'error',
      'User profile is not configured for UW Wizard'
    );
  END IF;

  IF jsonb_typeof(v_payload) <> 'object'
     OR jsonb_typeof(COALESCE(v_payload->'healthResponses', 'null'::jsonb)) <> 'object'
     OR jsonb_typeof(v_requested_face_amounts) <> 'array'
     OR jsonb_typeof(COALESCE(v_payload->'requestedProductTypes', 'null'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(v_payload->'conditionsReported', 'null'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(v_payload->'clientAge', 'null'::jsonb)) <> 'number' THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'invalid_payload',
      'error',
      'Invalid underwriting session payload'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_payload) AS payload_key(key_name)
    WHERE key_name <> ALL(v_allowed_keys)
  ) THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'invalid_payload',
      'error',
      'Only raw wizard inputs may be persisted'
    );
  END IF;

  IF jsonb_array_length(v_requested_face_amounts) = 0 THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'invalid_payload',
      'error',
      'At least one face amount is required'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_requested_face_amounts) AS amount(value)
    WHERE jsonb_typeof(value) <> 'number'
       OR (value #>> '{}')::NUMERIC <= 0
  ) THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'invalid_payload',
      'error',
      'Requested face amounts must be positive numbers'
    );
  END IF;

  v_client_height_inches := NULLIF(v_payload->>'clientHeightInches', '')::INTEGER;
  v_client_weight_lbs := NULLIF(v_payload->>'clientWeightLbs', '')::INTEGER;

  IF COALESCE(v_client_height_inches, 0) <= 0
     OR COALESCE(v_client_weight_lbs, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'invalid_payload',
      'error',
      'Client height and weight must be positive values'
    );
  END IF;

  SELECT COALESCE(array_agg(value), '{}'::TEXT[])
  INTO v_conditions_reported
  FROM jsonb_array_elements_text(COALESCE(v_payload->'conditionsReported', '[]'::jsonb)) AS value;

  SELECT COALESCE(array_agg(value), '{}'::TEXT[])
  INTO v_requested_product_types
  FROM jsonb_array_elements_text(COALESCE(v_payload->'requestedProductTypes', '[]'::jsonb)) AS value;

  v_requested_face_amount := NULLIF(v_requested_face_amounts->>0, '')::NUMERIC;
  v_client_bmi := ROUND(
    ((v_client_weight_lbs::NUMERIC * 703) / POWER(v_client_height_inches::NUMERIC, 2))::NUMERIC,
    2
  );

  INSERT INTO public.underwriting_sessions (
    imo_id,
    agency_id,
    created_by,
    client_name,
    client_dob,
    client_age,
    client_gender,
    client_state,
    client_height_inches,
    client_weight_lbs,
    client_bmi,
    health_responses,
    conditions_reported,
    tobacco_use,
    tobacco_details,
    requested_face_amount,
    requested_face_amounts,
    requested_product_types,
    ai_analysis,
    health_tier,
    risk_factors,
    recommendations,
    eligibility_summary,
    decision_tree_id,
    session_duration_seconds,
    notes,
    status
  )
  VALUES (
    v_imo_id,
    v_agency_id,
    v_user_id,
    NULLIF(v_payload->>'clientName', ''),
    NULLIF(v_payload->>'clientDob', '')::DATE,
    (v_payload->>'clientAge')::INTEGER,
    NULLIF(v_payload->>'clientGender', ''),
    NULLIF(v_payload->>'clientState', ''),
    v_client_height_inches,
    v_client_weight_lbs,
    v_client_bmi,
    v_payload->'healthResponses',
    v_conditions_reported,
    COALESCE((v_payload->>'tobaccoUse')::BOOLEAN, false),
    v_payload->'tobaccoDetails',
    v_requested_face_amount,
    v_requested_face_amounts,
    v_requested_product_types,
    NULL,
    NULL,
    '{}'::TEXT[],
    '[]'::jsonb,
    NULL,
    NULLIF(v_payload->>'decisionTreeId', '')::UUID,
    NULLIF(v_payload->>'sessionDurationSeconds', '')::INTEGER,
    NULLIF(v_payload->>'notes', ''),
    'saved'
  )
  RETURNING *
  INTO v_session;

  RETURN jsonb_build_object(
    'success',
    true,
    'session',
    to_jsonb(v_session)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'save_failed',
      'error',
      'Failed to save underwriting session'
    );
END;
$$;

COMMENT ON FUNCTION public.save_underwriting_session_v2(JSONB) IS
'Saves a UW Wizard session from raw wizard inputs only, binding actor identity with auth.uid() and rejecting client-authored underwriting results.';

REVOKE ALL ON FUNCTION public.save_underwriting_session_v2(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_underwriting_session_v2(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_underwriting_rule_evaluation(
  p_session_id UUID,
  p_rule_set_id UUID,
  p_rule_id UUID,
  p_condition_code TEXT,
  p_predicate_result TEXT,
  p_matched_conditions JSONB DEFAULT NULL,
  p_failed_conditions JSONB DEFAULT NULL,
  p_missing_fields JSONB DEFAULT NULL,
  p_outcome_applied JSONB DEFAULT NULL,
  p_input_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session_imo_id UUID;
  v_session_owner UUID;
BEGIN
  IF v_user_id IS NULL OR p_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  SELECT imo_id, created_by
  INTO v_session_imo_id, v_session_owner
  FROM public.underwriting_sessions
  WHERE id = p_session_id;

  IF NOT FOUND
     OR v_session_imo_id IS NULL
     OR v_session_imo_id IS DISTINCT FROM get_my_imo_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  IF v_session_owner IS DISTINCT FROM v_user_id AND NOT is_imo_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  IF p_rule_set_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.underwriting_rule_sets
    WHERE id = p_rule_set_id
      AND imo_id = v_session_imo_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  IF p_rule_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.underwriting_rules rules
    JOIN public.underwriting_rule_sets rule_sets
      ON rule_sets.id = rules.rule_set_id
    WHERE rules.id = p_rule_id
      AND rule_sets.imo_id = v_session_imo_id
      AND (
        p_rule_set_id IS NULL
        OR rules.rule_set_id = p_rule_set_id
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  INSERT INTO public.underwriting_rule_evaluation_log (
    session_id,
    imo_id,
    rule_set_id,
    rule_id,
    condition_code,
    predicate_result,
    matched_conditions,
    failed_conditions,
    missing_fields,
    outcome_applied,
    input_hash
  )
  VALUES (
    p_session_id,
    v_session_imo_id,
    p_rule_set_id,
    p_rule_id,
    p_condition_code,
    p_predicate_result,
    p_matched_conditions,
    p_failed_conditions,
    p_missing_fields,
    p_outcome_applied,
    p_input_hash
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'Failed to write underwriting audit log'
    );
END;
$$;

COMMENT ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) IS
'Writes an underwriting rule evaluation log row only for the authenticated user''s own session or an IMO admin in the same tenant.';

REVOKE ALL ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_underwriting_rule_evaluation(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  TEXT
) TO authenticated;
