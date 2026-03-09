-- Harden UW Wizard run tracking and expose real team-seat usage.
--
-- Goals:
-- 1. Make run recording idempotent with a caller-provided run key.
-- 2. Allow the frontend to record a run safely even if the edge function path
--    is stale or partially deployed.
-- 3. Harden quota RPCs so clients can only read/write their own usage.
-- 4. Expose per-seat team usage so Team billing screens show real counts.

BEGIN;

ALTER TABLE public.uw_wizard_usage_log
ADD COLUMN IF NOT EXISTS run_key TEXT;

COMMENT ON COLUMN public.uw_wizard_usage_log.run_key IS
'Idempotency key for a single UW Wizard run. Unique per user when provided.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_uw_wizard_usage_log_user_run_key_unique
  ON public.uw_wizard_usage_log(user_id, run_key)
  WHERE run_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assert_uw_wizard_usage_access(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_uw_wizard_usage_access(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_uw_wizard_usage(p_user_id UUID)
RETURNS TABLE (
  runs_used INTEGER,
  runs_limit INTEGER,
  runs_remaining INTEGER,
  usage_percent NUMERIC,
  billing_period_start DATE,
  billing_period_end DATE,
  tier_id TEXT,
  tier_name TEXT,
  source TEXT
) AS $$
DECLARE
  v_tier_id TEXT;
  v_tier_config JSONB;
  v_tier JSONB;
  v_runs_limit INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_runs_used INTEGER;
  v_source TEXT;
  v_tier_name TEXT;
  v_seat_limit INTEGER;
BEGIN
  PERFORM public.assert_uw_wizard_usage_access(p_user_id);

  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (
    date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'
  )::DATE;

  IF EXISTS (
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    v_runs_limit := 500;
    v_source := 'team_owner';
    v_tier_id := 'team_owner';
    v_tier_name := 'Team Owner';

    SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
    FROM uw_wizard_usage u
    WHERE u.user_id = p_user_id
      AND u.billing_period_start = v_period_start;

    v_runs_used := COALESCE(v_runs_used, 0);

    RETURN QUERY SELECT
      v_runs_used,
      v_runs_limit,
      GREATEST(0, v_runs_limit - v_runs_used),
      CASE
        WHEN v_runs_limit > 0
          THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
        ELSE 0
      END,
      v_period_start,
      v_period_end,
      v_tier_id,
      v_tier_name,
      v_source;
    RETURN;
  END IF;

  SELECT tws.runs_limit INTO v_seat_limit
  FROM team_uw_wizard_seats tws
  JOIN user_subscriptions us ON us.user_id = tws.team_owner_id
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE tws.agent_id = p_user_id
    AND sp.name = 'team'
    AND us.status IN ('active', 'trialing')
  LIMIT 1;

  IF v_seat_limit IS NOT NULL THEN
    v_runs_limit := v_seat_limit;
    v_source := 'team_seat';
    v_tier_id := 'team_seat';
    v_tier_name := 'Team Seat';

    SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
    FROM uw_wizard_usage u
    WHERE u.user_id = p_user_id
      AND u.billing_period_start = v_period_start;

    v_runs_used := COALESCE(v_runs_used, 0);

    RETURN QUERY SELECT
      v_runs_used,
      v_runs_limit,
      GREATEST(0, v_runs_limit - v_runs_used),
      CASE
        WHEN v_runs_limit > 0
          THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
        ELSE 0
      END,
      v_period_start,
      v_period_end,
      v_tier_id,
      v_tier_name,
      v_source;
    RETURN;
  END IF;

  v_source := 'addon';

  SELECT usa.tier_id INTO v_tier_id
  FROM user_subscription_addons usa
  JOIN subscription_addons sa ON sa.id = usa.addon_id
  WHERE usa.user_id = p_user_id
    AND sa.name = 'uw_wizard'
    AND usa.status IN ('active', 'manual_grant')
    AND (usa.current_period_end IS NULL OR usa.current_period_end > now())
  LIMIT 1;

  IF v_tier_id IS NULL THEN
    v_tier_id := 'starter';
  END IF;

  SELECT sa.tier_config INTO v_tier_config
  FROM subscription_addons sa
  WHERE sa.name = 'uw_wizard';

  SELECT t INTO v_tier
  FROM jsonb_array_elements(v_tier_config->'tiers') t
  WHERE t->>'id' = v_tier_id;

  v_runs_limit := COALESCE((v_tier->>'runs_per_month')::INTEGER, 100);
  v_tier_name := COALESCE(v_tier->>'name', 'Starter');

  SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
  FROM uw_wizard_usage u
  WHERE u.user_id = p_user_id
    AND u.billing_period_start = v_period_start;

  v_runs_used := COALESCE(v_runs_used, 0);

  RETURN QUERY SELECT
    v_runs_used,
    v_runs_limit,
    GREATEST(0, v_runs_limit - v_runs_used),
    CASE
      WHEN v_runs_limit > 0
        THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
      ELSE 0
    END,
    v_period_start,
    v_period_end,
    v_tier_id,
    v_tier_name,
    v_source;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_run_uw_wizard(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  runs_remaining INTEGER,
  tier_id TEXT,
  source TEXT
) AS $$
DECLARE
  v_usage RECORD;
  v_has_access BOOLEAN;
BEGIN
  PERFORM public.assert_uw_wizard_usage_access(p_user_id);

  SELECT public.user_has_uw_wizard_access(p_user_id) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'no_subscription'::TEXT,
      0::INTEGER,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_usage FROM public.get_uw_wizard_usage(p_user_id);

  IF v_usage.runs_remaining <= 0 THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'limit_exceeded'::TEXT,
      0::INTEGER,
      v_usage.tier_id::TEXT,
      v_usage.source::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN,
    'ok'::TEXT,
    v_usage.runs_remaining::INTEGER,
    v_usage.tier_id::TEXT,
    v_usage.source::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.record_uw_wizard_run(
  p_imo_id UUID,
  p_run_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_runs_used INTEGER,
  runs_remaining INTEGER,
  already_recorded BOOLEAN
) AS $$
DECLARE
  v_effective_user_id UUID;
  v_usage RECORD;
  v_quota RECORD;
  v_new_runs INTEGER;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_effective_user_id := p_user_id;
  ELSE
    v_effective_user_id := auth.uid();
    IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_effective_user_id THEN
      RAISE EXCEPTION 'Unauthorized'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_effective_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required'
      USING ERRCODE = '42501';
  END IF;

  IF p_run_key IS NULL OR btrim(p_run_key) = '' THEN
    RAISE EXCEPTION 'run_key is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_usage FROM public.get_uw_wizard_usage(v_effective_user_id);

  IF EXISTS (
    SELECT 1
    FROM public.uw_wizard_usage_log
    WHERE user_id = v_effective_user_id
      AND run_key = p_run_key
  ) THEN
    RETURN QUERY SELECT
      true,
      COALESCE(v_usage.runs_used, 0)::INTEGER,
      COALESCE(v_usage.runs_remaining, 0)::INTEGER,
      true;
    RETURN;
  END IF;

  SELECT * INTO v_quota FROM public.can_run_uw_wizard(v_effective_user_id);

  IF v_quota.allowed IS DISTINCT FROM true THEN
    RETURN QUERY SELECT
      false,
      COALESCE(v_usage.runs_used, 0)::INTEGER,
      COALESCE(v_usage.runs_remaining, 0)::INTEGER,
      false;
    RETURN;
  END IF;

  INSERT INTO public.uw_wizard_usage (
    user_id,
    imo_id,
    billing_period_start,
    billing_period_end,
    runs_used,
    runs_limit,
    last_run_at
  )
  VALUES (
    v_effective_user_id,
    p_imo_id,
    v_usage.billing_period_start,
    v_usage.billing_period_end,
    1,
    v_usage.runs_limit,
    now()
  )
  ON CONFLICT (user_id, billing_period_start)
  DO UPDATE SET
    runs_used = public.uw_wizard_usage.runs_used + 1,
    runs_limit = EXCLUDED.runs_limit,
    last_run_at = now(),
    updated_at = now()
  RETURNING public.uw_wizard_usage.runs_used INTO v_new_runs;

  INSERT INTO public.uw_wizard_usage_log (
    user_id,
    imo_id,
    session_id,
    input_tokens,
    output_tokens,
    estimated_cost_cents,
    run_key
  )
  VALUES (
    v_effective_user_id,
    p_imo_id,
    p_session_id,
    p_input_tokens,
    p_output_tokens,
    CASE
      WHEN p_input_tokens IS NOT NULL AND p_output_tokens IS NOT NULL
        THEN ROUND((p_input_tokens * 0.003 + p_output_tokens * 0.015) / 10)::INTEGER
      ELSE NULL
    END,
    p_run_key
  );

  RETURN QUERY SELECT
    true,
    v_new_runs,
    GREATEST(0, v_usage.runs_limit - v_new_runs),
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.record_uw_wizard_run(
  UUID,
  TEXT,
  UUID,
  UUID,
  INTEGER,
  INTEGER
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_uw_wizard_usage(
  p_user_id UUID,
  p_imo_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_runs_used INTEGER,
  runs_remaining INTEGER
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  PERFORM public.assert_uw_wizard_usage_access(p_user_id);

  SELECT * INTO v_result
  FROM public.record_uw_wizard_run(
    p_imo_id,
    gen_random_uuid()::TEXT,
    p_user_id,
    p_session_id,
    p_input_tokens,
    p_output_tokens
  );

  RETURN QUERY SELECT
    v_result.success::BOOLEAN,
    v_result.new_runs_used::INTEGER,
    v_result.runs_remaining::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_team_uw_wizard_seat_usage(p_owner_id UUID)
RETURNS TABLE (
  seat_id UUID,
  team_owner_id UUID,
  agent_id UUID,
  agent_first_name TEXT,
  agent_last_name TEXT,
  agent_email TEXT,
  runs_limit INTEGER,
  runs_used INTEGER,
  runs_remaining INTEGER,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_period_start DATE;
BEGIN
  IF auth.uid() != p_owner_id THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    ) INTO v_is_super_admin;

    IF NOT v_is_super_admin THEN
      RAISE EXCEPTION 'Unauthorized'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;

  RETURN QUERY
  SELECT
    tws.id,
    tws.team_owner_id,
    tws.agent_id,
    up.first_name::TEXT,
    up.last_name::TEXT,
    up.email::TEXT,
    tws.runs_limit,
    COALESCE(uwu.runs_used, 0)::INTEGER,
    GREATEST(0, tws.runs_limit - COALESCE(uwu.runs_used, 0))::INTEGER,
    uwu.last_run_at,
    tws.created_at
  FROM public.team_uw_wizard_seats tws
  JOIN public.user_profiles up ON up.id = tws.agent_id
  LEFT JOIN public.uw_wizard_usage uwu
    ON uwu.user_id = tws.agent_id
   AND uwu.billing_period_start = v_period_start
  WHERE tws.team_owner_id = p_owner_id
  ORDER BY
    up.last_name NULLS LAST,
    up.first_name NULLS LAST,
    up.email NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_team_uw_wizard_seat_usage(UUID)
  TO authenticated, service_role;

COMMIT;
