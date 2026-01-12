-- Phase 8: Recruiting Pipeline Org Awareness
-- Migration 3 of 3: RPC functions for recruiting summaries

-- ============================================================================
-- 1. IMO Recruiting Summary - Funnel metrics across entire IMO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_recruiting_summary(p_imo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_imo_id uuid;
BEGIN
  -- Get caller's IMO ID
  SELECT imo_id INTO v_user_imo_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Authorization check: must be super_admin or in same IMO with admin role
  IF NOT (
    is_super_admin()
    OR (v_user_imo_id = p_imo_id AND is_imo_admin())
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Use CTEs to avoid cartesian join issues
  WITH recruits AS (
    SELECT *
    FROM user_profiles
    WHERE imo_id = p_imo_id
      AND recruiter_id IS NOT NULL
      AND archived_at IS NULL
  ),
  status_counts AS (
    SELECT
      COALESCE(onboarding_status, 'unknown') as status,
      COUNT(*) as cnt
    FROM recruits
    GROUP BY COALESCE(onboarding_status, 'unknown')
  ),
  agent_status_counts AS (
    SELECT
      agent_status::text as status,
      COUNT(*) as cnt
    FROM recruits
    WHERE agent_status IS NOT NULL
    GROUP BY agent_status
  ),
  metrics AS (
    SELECT
      COUNT(*) as total_recruits,
      COUNT(*) FILTER (WHERE onboarding_status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE onboarding_status = 'dropped') as dropped_count,
      COUNT(*) FILTER (WHERE onboarding_status NOT IN ('completed', 'dropped')) as active_in_pipeline
    FROM recruits
  ),
  avg_completion AS (
    SELECT ROUND(AVG(
      EXTRACT(EPOCH FROM (onboarding_completed_at - onboarding_started_at)) / 86400
    )::numeric, 1) as avg_days
    FROM recruits
    WHERE onboarding_completed_at IS NOT NULL
      AND onboarding_started_at IS NOT NULL
  )
  SELECT jsonb_build_object(
    'total_recruits', m.total_recruits,
    'by_status', COALESCE((SELECT jsonb_object_agg(status, cnt) FROM status_counts), '{}'::jsonb),
    'by_agent_status', COALESCE((SELECT jsonb_object_agg(status, cnt) FROM agent_status_counts), '{}'::jsonb),
    'conversion_rate', CASE
      WHEN m.total_recruits > 0 THEN
        ROUND((m.completed_count::numeric / m.total_recruits) * 100, 1)
      ELSE 0
    END,
    'avg_days_to_complete', ac.avg_days,
    'active_in_pipeline', m.active_in_pipeline,
    'completed_count', m.completed_count,
    'dropped_count', m.dropped_count
  ) INTO v_result
  FROM metrics m
  CROSS JOIN avg_completion ac;

  -- Handle NULL result (no recruits found)
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'total_recruits', 0,
      'by_status', '{}'::jsonb,
      'by_agent_status', '{}'::jsonb,
      'conversion_rate', 0,
      'avg_days_to_complete', NULL,
      'active_in_pipeline', 0,
      'completed_count', 0,
      'dropped_count', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. Agency Recruiting Summary - Funnel metrics for one agency
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_recruiting_summary(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_imo_id uuid;
  v_target_imo_id uuid;
BEGIN
  -- Get caller's IMO ID
  SELECT imo_id INTO v_user_imo_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Get target agency's IMO ID
  SELECT imo_id INTO v_target_imo_id
  FROM agencies
  WHERE id = p_agency_id;

  -- Authorization check
  IF NOT (
    is_super_admin()
    OR (v_user_imo_id = v_target_imo_id AND is_imo_admin())
    OR is_agency_owner_of(p_agency_id)
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'total_recruits', COUNT(*),
    'by_status', (
      SELECT jsonb_object_agg(
        COALESCE(onboarding_status, 'unknown'),
        cnt
      )
      FROM (
        SELECT onboarding_status, COUNT(*) as cnt
        FROM user_profiles
        WHERE agency_id = p_agency_id
          AND recruiter_id IS NOT NULL
          AND archived_at IS NULL
        GROUP BY onboarding_status
      ) status_counts
    ),
    'by_agent_status', (
      SELECT jsonb_object_agg(
        agent_status::text,
        cnt
      )
      FROM (
        SELECT agent_status, COUNT(*) as cnt
        FROM user_profiles
        WHERE agency_id = p_agency_id
          AND recruiter_id IS NOT NULL
          AND archived_at IS NULL
        GROUP BY agent_status
      ) ast
    ),
    'conversion_rate', CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE onboarding_status = 'completed')::numeric / COUNT(*)) * 100,
          1
        )
      ELSE 0
    END,
    'avg_days_to_complete', (
      SELECT ROUND(AVG(
        EXTRACT(EPOCH FROM (onboarding_completed_at - onboarding_started_at)) / 86400
      )::numeric, 1)
      FROM user_profiles
      WHERE agency_id = p_agency_id
        AND recruiter_id IS NOT NULL
        AND onboarding_completed_at IS NOT NULL
        AND onboarding_started_at IS NOT NULL
    ),
    'active_in_pipeline', COUNT(*) FILTER (WHERE onboarding_status NOT IN ('completed', 'dropped')),
    'completed_count', COUNT(*) FILTER (WHERE onboarding_status = 'completed'),
    'dropped_count', COUNT(*) FILTER (WHERE onboarding_status = 'dropped')
  ) INTO v_result
  FROM user_profiles
  WHERE agency_id = p_agency_id
    AND recruiter_id IS NOT NULL
    AND archived_at IS NULL;

  -- Handle NULL result
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'total_recruits', 0,
      'by_status', '{}'::jsonb,
      'by_agent_status', '{}'::jsonb,
      'conversion_rate', 0,
      'avg_days_to_complete', NULL,
      'active_in_pipeline', 0,
      'completed_count', 0,
      'dropped_count', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 3. Recruiting by Agency - For IMO dashboard showing agency breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recruiting_by_agency(p_imo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_imo_id uuid;
BEGIN
  -- Get caller's IMO ID
  SELECT imo_id INTO v_user_imo_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Authorization check
  IF NOT (
    is_super_admin()
    OR (v_user_imo_id = p_imo_id AND is_imo_admin())
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(agency_data ORDER BY agency_data->>'total_recruits' DESC NULLS LAST), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'agency_id', a.id,
      'agency_name', a.name,
      'total_recruits', COUNT(up.id),
      'active_in_pipeline', COUNT(up.id) FILTER (WHERE up.onboarding_status NOT IN ('completed', 'dropped')),
      'completed_count', COUNT(up.id) FILTER (WHERE up.onboarding_status = 'completed'),
      'dropped_count', COUNT(up.id) FILTER (WHERE up.onboarding_status = 'dropped'),
      'conversion_rate', CASE
        WHEN COUNT(up.id) > 0 THEN
          ROUND(
            (COUNT(up.id) FILTER (WHERE up.onboarding_status = 'completed')::numeric / COUNT(up.id)) * 100,
            1
          )
        ELSE 0
      END,
      'licensed_count', COUNT(up.id) FILTER (WHERE up.agent_status = 'licensed')
    ) as agency_data
    FROM agencies a
    LEFT JOIN user_profiles up ON up.agency_id = a.id
      AND up.recruiter_id IS NOT NULL
      AND up.archived_at IS NULL
    WHERE a.imo_id = p_imo_id
      AND a.is_active = true
    GROUP BY a.id, a.name
  ) agency_stats;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 4. Recruiting by Recruiter - For agency dashboard showing recruiter breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recruiting_by_recruiter(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_imo_id uuid;
  v_target_imo_id uuid;
BEGIN
  -- Get caller's IMO ID
  SELECT imo_id INTO v_user_imo_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Get target agency's IMO ID
  SELECT imo_id INTO v_target_imo_id
  FROM agencies
  WHERE id = p_agency_id;

  -- Authorization check
  IF NOT (
    is_super_admin()
    OR (v_user_imo_id = v_target_imo_id AND is_imo_admin())
    OR is_agency_owner_of(p_agency_id)
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(recruiter_data ORDER BY recruiter_data->>'total_recruits' DESC NULLS LAST), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'recruiter_id', recruiter.id,
      'recruiter_name', COALESCE(NULLIF(TRIM(CONCAT_WS(' ', recruiter.first_name, recruiter.last_name)), ''), recruiter.email),
      'recruiter_email', recruiter.email,
      'total_recruits', COUNT(recruit.id),
      'active_in_pipeline', COUNT(recruit.id) FILTER (WHERE recruit.onboarding_status NOT IN ('completed', 'dropped')),
      'completed_count', COUNT(recruit.id) FILTER (WHERE recruit.onboarding_status = 'completed'),
      'dropped_count', COUNT(recruit.id) FILTER (WHERE recruit.onboarding_status = 'dropped'),
      'conversion_rate', CASE
        WHEN COUNT(recruit.id) > 0 THEN
          ROUND(
            (COUNT(recruit.id) FILTER (WHERE recruit.onboarding_status = 'completed')::numeric / COUNT(recruit.id)) * 100,
            1
          )
        ELSE 0
      END,
      'licensed_count', COUNT(recruit.id) FILTER (WHERE recruit.agent_status = 'licensed')
    ) as recruiter_data
    FROM user_profiles recruiter
    LEFT JOIN user_profiles recruit ON recruit.recruiter_id = recruiter.id
      AND recruit.archived_at IS NULL
    WHERE recruiter.agency_id = p_agency_id
      AND recruiter.archived_at IS NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles r
        WHERE r.recruiter_id = recruiter.id
      )
    GROUP BY recruiter.id, recruiter.first_name, recruiter.last_name, recruiter.email
  ) recruiter_stats;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_imo_recruiting_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_recruiting_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recruiting_by_agency(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recruiting_by_recruiter(uuid) TO authenticated;
