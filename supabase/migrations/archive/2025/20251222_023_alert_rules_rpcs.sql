-- Migration: Alert Rules RPCs
-- Phase 10: Notifications & Alerts System
-- Creates functions for alert rule management

-- ============================================
-- GET ALERTABLE METRICS
-- Returns available metrics based on user's role
-- ============================================
CREATE OR REPLACE FUNCTION get_alertable_metrics()
RETURNS TABLE (
  metric TEXT,
  label TEXT,
  description TEXT,
  default_unit TEXT,
  default_threshold NUMERIC,
  default_comparison TEXT,
  available_for_self BOOLEAN,
  available_for_downlines BOOLEAN,
  available_for_team BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_imo_admin BOOLEAN;
  v_is_agency_owner BOOLEAN;
BEGIN
  -- Check user's roles
  v_is_imo_admin := is_imo_admin();
  v_is_agency_owner := EXISTS (
    SELECT 1 FROM agencies WHERE owner_id = auth.uid()
  );

  RETURN QUERY
  SELECT * FROM (
    VALUES
      ('policy_lapse_warning'::TEXT, 'Policy Lapse Warning',
       'Alert when a policy is approaching its lapse date',
       'days'::TEXT, 30::NUMERIC, 'lte'::TEXT, true, true, true),

      ('target_miss_risk'::TEXT, 'Target Miss Risk',
       'Alert when pacing behind production target',
       'percent'::TEXT, 80::NUMERIC, 'lt'::TEXT, true, true, true),

      ('commission_threshold'::TEXT, 'Commission Below Threshold',
       'Alert when commission earnings fall below threshold',
       'currency'::TEXT, 1000::NUMERIC, 'lt'::TEXT, true, true, true),

      ('new_policy_count'::TEXT, 'New Policy Count',
       'Alert when new policies in period are below expected',
       'count'::TEXT, 5::NUMERIC, 'lt'::TEXT, true, true, true),

      ('recruit_stall'::TEXT, 'Recruit Stall Warning',
       'Alert when a recruit is stuck in an onboarding phase',
       'days'::TEXT, 14::NUMERIC, 'gte'::TEXT, true, true, true),

      ('override_change'::TEXT, 'Override Commission Change',
       'Alert when override commission amount changes significantly',
       'percent'::TEXT, 10::NUMERIC, 'gte'::TEXT, true, true, false),

      ('team_production_drop'::TEXT, 'Team Production Drop',
       'Alert when team production decreases from previous period',
       'percent'::TEXT, 20::NUMERIC, 'gte'::TEXT, false, false, true),

      ('persistency_warning'::TEXT, 'Persistency Warning',
       'Alert when persistency rate falls below threshold',
       'percent'::TEXT, 85::NUMERIC, 'lt'::TEXT, true, true, true),

      ('license_expiration'::TEXT, 'License Expiration Warning',
       'Alert when license is approaching expiration',
       'days'::TEXT, 60::NUMERIC, 'lte'::TEXT, true, true, true)
  ) AS t(metric, label, description, default_unit, default_threshold, default_comparison,
         available_for_self, available_for_downlines, available_for_team)
  WHERE
    -- Team-level metrics require IMO admin or agency owner role
    (t.available_for_team = false OR v_is_imo_admin OR v_is_agency_owner)
    -- Downline metrics require having downlines (simplified: allow for all for now)
    AND true;
END;
$$;

-- ============================================
-- GET MY ALERT RULES
-- Returns all alert rules visible to current user
-- ============================================
CREATE OR REPLACE FUNCTION get_my_alert_rules()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  owner_name TEXT,
  imo_id UUID,
  agency_id UUID,
  name TEXT,
  description TEXT,
  metric alert_metric,
  comparison alert_comparison,
  threshold_value NUMERIC,
  threshold_unit TEXT,
  applies_to_self BOOLEAN,
  applies_to_downlines BOOLEAN,
  applies_to_team BOOLEAN,
  notify_in_app BOOLEAN,
  notify_email BOOLEAN,
  cooldown_hours INTEGER,
  is_active BOOLEAN,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.owner_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) AS owner_name,
    ar.imo_id,
    ar.agency_id,
    ar.name,
    ar.description,
    ar.metric,
    ar.comparison,
    ar.threshold_value,
    ar.threshold_unit,
    ar.applies_to_self,
    ar.applies_to_downlines,
    ar.applies_to_team,
    ar.notify_in_app,
    ar.notify_email,
    ar.cooldown_hours,
    ar.is_active,
    ar.last_triggered_at,
    ar.trigger_count,
    ar.created_at,
    ar.updated_at
  FROM alert_rules ar
  LEFT JOIN user_profiles up ON up.id = ar.owner_id
  WHERE
    -- Super admin sees all
    is_super_admin()
    -- Owner sees own rules
    OR ar.owner_id = auth.uid()
    -- IMO admin sees IMO rules
    OR (ar.imo_id = get_my_imo_id() AND is_imo_admin())
    -- Agency owner sees agency rules
    OR (ar.agency_id = get_my_agency_id() AND EXISTS (
      SELECT 1 FROM agencies WHERE agencies.id = ar.agency_id AND agencies.owner_id = auth.uid()
    ))
  ORDER BY ar.created_at DESC;
END;
$$;

-- ============================================
-- CREATE ALERT RULE
-- Creates a new alert rule with validation
-- ============================================
CREATE OR REPLACE FUNCTION create_alert_rule(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_metric alert_metric DEFAULT 'policy_lapse_warning',
  p_comparison alert_comparison DEFAULT 'lte',
  p_threshold_value NUMERIC DEFAULT 30,
  p_threshold_unit TEXT DEFAULT 'days',
  p_applies_to_self BOOLEAN DEFAULT true,
  p_applies_to_downlines BOOLEAN DEFAULT false,
  p_applies_to_team BOOLEAN DEFAULT false,
  p_notify_in_app BOOLEAN DEFAULT true,
  p_notify_email BOOLEAN DEFAULT false,
  p_cooldown_hours INTEGER DEFAULT 24
)
RETURNS alert_rules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_imo_id UUID;
  v_agency_id UUID;
  v_result alert_rules;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's org
  SELECT imo_id, agency_id INTO v_imo_id, v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Validate org assignment
  IF v_imo_id IS NULL AND v_agency_id IS NULL THEN
    RAISE EXCEPTION 'User must be assigned to an IMO or Agency';
  END IF;

  -- Validate team-level access
  IF p_applies_to_team = true THEN
    IF NOT is_imo_admin() AND NOT EXISTS (
      SELECT 1 FROM agencies WHERE owner_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Only IMO admins or agency owners can create team-level alerts';
    END IF;
  END IF;

  -- Validate at least one scope
  IF NOT p_applies_to_self AND NOT p_applies_to_downlines AND NOT p_applies_to_team THEN
    RAISE EXCEPTION 'At least one scope (self, downlines, or team) must be enabled';
  END IF;

  -- Validate at least one notification method
  IF NOT p_notify_in_app AND NOT p_notify_email THEN
    RAISE EXCEPTION 'At least one notification method must be enabled';
  END IF;

  -- Create the rule
  INSERT INTO alert_rules (
    owner_id,
    imo_id,
    agency_id,
    name,
    description,
    metric,
    comparison,
    threshold_value,
    threshold_unit,
    applies_to_self,
    applies_to_downlines,
    applies_to_team,
    notify_in_app,
    notify_email,
    cooldown_hours
  ) VALUES (
    v_user_id,
    v_imo_id,
    v_agency_id,
    p_name,
    p_description,
    p_metric,
    p_comparison,
    p_threshold_value,
    p_threshold_unit,
    p_applies_to_self,
    p_applies_to_downlines,
    p_applies_to_team,
    p_notify_in_app,
    p_notify_email,
    p_cooldown_hours
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================
-- UPDATE ALERT RULE
-- Updates an existing alert rule
-- ============================================
CREATE OR REPLACE FUNCTION update_alert_rule(
  p_rule_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_threshold_value NUMERIC DEFAULT NULL,
  p_threshold_unit TEXT DEFAULT NULL,
  p_applies_to_self BOOLEAN DEFAULT NULL,
  p_applies_to_downlines BOOLEAN DEFAULT NULL,
  p_applies_to_team BOOLEAN DEFAULT NULL,
  p_notify_in_app BOOLEAN DEFAULT NULL,
  p_notify_email BOOLEAN DEFAULT NULL,
  p_cooldown_hours INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS alert_rules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result alert_rules;
  v_existing alert_rules;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get existing rule and check ownership
  SELECT * INTO v_existing
  FROM alert_rules
  WHERE id = p_rule_id
    AND (owner_id = v_user_id OR is_super_admin());

  IF v_existing IS NULL THEN
    RAISE EXCEPTION 'Alert rule not found or access denied';
  END IF;

  -- Calculate final values
  DECLARE
    v_applies_to_self BOOLEAN := COALESCE(p_applies_to_self, v_existing.applies_to_self);
    v_applies_to_downlines BOOLEAN := COALESCE(p_applies_to_downlines, v_existing.applies_to_downlines);
    v_applies_to_team BOOLEAN := COALESCE(p_applies_to_team, v_existing.applies_to_team);
    v_notify_in_app BOOLEAN := COALESCE(p_notify_in_app, v_existing.notify_in_app);
    v_notify_email BOOLEAN := COALESCE(p_notify_email, v_existing.notify_email);
  BEGIN
    -- Validate at least one scope
    IF NOT v_applies_to_self AND NOT v_applies_to_downlines AND NOT v_applies_to_team THEN
      RAISE EXCEPTION 'At least one scope must be enabled';
    END IF;

    -- Validate at least one notification method
    IF NOT v_notify_in_app AND NOT v_notify_email THEN
      RAISE EXCEPTION 'At least one notification method must be enabled';
    END IF;

    -- Validate team-level access
    IF v_applies_to_team = true AND NOT v_existing.applies_to_team THEN
      IF NOT is_imo_admin() AND NOT EXISTS (
        SELECT 1 FROM agencies WHERE owner_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Only IMO admins or agency owners can enable team-level alerts';
      END IF;
    END IF;
  END;

  -- Update the rule
  UPDATE alert_rules
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    threshold_value = COALESCE(p_threshold_value, threshold_value),
    threshold_unit = COALESCE(p_threshold_unit, threshold_unit),
    applies_to_self = COALESCE(p_applies_to_self, applies_to_self),
    applies_to_downlines = COALESCE(p_applies_to_downlines, applies_to_downlines),
    applies_to_team = COALESCE(p_applies_to_team, applies_to_team),
    notify_in_app = COALESCE(p_notify_in_app, notify_in_app),
    notify_email = COALESCE(p_notify_email, notify_email),
    cooldown_hours = COALESCE(p_cooldown_hours, cooldown_hours),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_rule_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================
-- TOGGLE ALERT RULE ACTIVE
-- Enables or disables an alert rule
-- ============================================
CREATE OR REPLACE FUNCTION toggle_alert_rule_active(
  p_rule_id UUID,
  p_is_active BOOLEAN
)
RETURNS alert_rules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result alert_rules;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE alert_rules
  SET is_active = p_is_active
  WHERE id = p_rule_id
    AND (owner_id = auth.uid() OR is_super_admin())
  RETURNING * INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Alert rule not found or access denied';
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- DELETE ALERT RULE
-- Deletes an alert rule
-- ============================================
CREATE OR REPLACE FUNCTION delete_alert_rule(p_rule_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM alert_rules
  WHERE id = p_rule_id
    AND (owner_id = auth.uid() OR is_super_admin());

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Alert rule not found or access denied';
  END IF;

  RETURN true;
END;
$$;

-- ============================================
-- GET ALERT RULE HISTORY
-- Returns recent evaluations for a rule
-- ============================================
CREATE OR REPLACE FUNCTION get_alert_rule_history(
  p_rule_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  triggered BOOLEAN,
  current_value NUMERIC,
  threshold_value NUMERIC,
  comparison alert_comparison,
  affected_user_id UUID,
  affected_user_name TEXT,
  affected_entity_type TEXT,
  affected_entity_id UUID,
  notification_id UUID,
  evaluated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify access to rule
  IF NOT EXISTS (
    SELECT 1 FROM alert_rules ar
    WHERE ar.id = p_rule_id
      AND (ar.owner_id = auth.uid() OR is_super_admin())
  ) THEN
    RAISE EXCEPTION 'Alert rule not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.triggered,
    e.current_value,
    e.threshold_value,
    e.comparison,
    e.affected_user_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) AS affected_user_name,
    e.affected_entity_type,
    e.affected_entity_id,
    e.notification_id,
    e.evaluated_at
  FROM alert_rule_evaluations e
  LEFT JOIN user_profiles up ON up.id = e.affected_user_id
  WHERE e.rule_id = p_rule_id
  ORDER BY e.evaluated_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- GET/UPDATE NOTIFICATION PREFERENCES
-- ============================================
CREATE OR REPLACE FUNCTION get_my_notification_preferences()
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result notification_preferences;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get or create preferences
  SELECT * INTO v_result
  FROM notification_preferences
  WHERE user_id = v_user_id;

  IF v_result IS NULL THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION update_my_notification_preferences(
  p_in_app_enabled BOOLEAN DEFAULT NULL,
  p_browser_push_enabled BOOLEAN DEFAULT NULL,
  p_email_digest_enabled BOOLEAN DEFAULT NULL,
  p_email_digest_frequency TEXT DEFAULT NULL,
  p_email_digest_time TIME DEFAULT NULL,
  p_email_digest_timezone TEXT DEFAULT NULL,
  p_quiet_hours_enabled BOOLEAN DEFAULT NULL,
  p_quiet_hours_start TIME DEFAULT NULL,
  p_quiet_hours_end TIME DEFAULT NULL
)
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result notification_preferences;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure preferences exist
  INSERT INTO notification_preferences (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update preferences
  UPDATE notification_preferences
  SET
    in_app_enabled = COALESCE(p_in_app_enabled, in_app_enabled),
    browser_push_enabled = COALESCE(p_browser_push_enabled, browser_push_enabled),
    email_digest_enabled = COALESCE(p_email_digest_enabled, email_digest_enabled),
    email_digest_frequency = COALESCE(p_email_digest_frequency, email_digest_frequency),
    email_digest_time = COALESCE(p_email_digest_time, email_digest_time),
    email_digest_timezone = COALESCE(p_email_digest_timezone, email_digest_timezone),
    quiet_hours_enabled = COALESCE(p_quiet_hours_enabled, quiet_hours_enabled),
    quiet_hours_start = COALESCE(p_quiet_hours_start, quiet_hours_start),
    quiet_hours_end = COALESCE(p_quiet_hours_end, quiet_hours_end),
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================
-- GET DUE ALERTS FOR EVALUATION
-- Used by edge function to find rules needing evaluation
-- ============================================
CREATE OR REPLACE FUNCTION get_due_alert_rules()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  imo_id UUID,
  agency_id UUID,
  metric alert_metric,
  comparison alert_comparison,
  threshold_value NUMERIC,
  threshold_unit TEXT,
  applies_to_self BOOLEAN,
  applies_to_downlines BOOLEAN,
  applies_to_team BOOLEAN,
  notify_in_app BOOLEAN,
  notify_email BOOLEAN,
  cooldown_hours INTEGER,
  last_triggered_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.owner_id,
    ar.imo_id,
    ar.agency_id,
    ar.metric,
    ar.comparison,
    ar.threshold_value,
    ar.threshold_unit,
    ar.applies_to_self,
    ar.applies_to_downlines,
    ar.applies_to_team,
    ar.notify_in_app,
    ar.notify_email,
    ar.cooldown_hours,
    ar.last_triggered_at
  FROM alert_rules ar
  WHERE ar.is_active = true
    AND (
      ar.last_triggered_at IS NULL
      OR ar.last_triggered_at < now() - (ar.cooldown_hours || ' hours')::INTERVAL
    );
END;
$$;

-- ============================================
-- RECORD ALERT EVALUATION
-- Records an evaluation result (called by edge function)
-- ============================================
CREATE OR REPLACE FUNCTION record_alert_evaluation(
  p_rule_id UUID,
  p_triggered BOOLEAN,
  p_current_value NUMERIC,
  p_affected_user_id UUID DEFAULT NULL,
  p_affected_entity_type TEXT DEFAULT NULL,
  p_affected_entity_id UUID DEFAULT NULL,
  p_notification_id UUID DEFAULT NULL,
  p_evaluation_context JSONB DEFAULT '{}'
)
RETURNS alert_rule_evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_result alert_rule_evaluations;
BEGIN
  -- Get the rule
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'Alert rule not found';
  END IF;

  -- Insert evaluation
  INSERT INTO alert_rule_evaluations (
    rule_id,
    triggered,
    current_value,
    threshold_value,
    comparison,
    affected_user_id,
    affected_entity_type,
    affected_entity_id,
    notification_id,
    evaluation_context
  ) VALUES (
    p_rule_id,
    p_triggered,
    p_current_value,
    v_rule.threshold_value,
    v_rule.comparison,
    p_affected_user_id,
    p_affected_entity_type,
    p_affected_entity_id,
    p_notification_id,
    p_evaluation_context
  )
  RETURNING * INTO v_result;

  -- Update rule stats if triggered
  IF p_triggered THEN
    UPDATE alert_rules
    SET
      last_triggered_at = now(),
      trigger_count = trigger_count + 1,
      consecutive_triggers = consecutive_triggers + 1
    WHERE id = p_rule_id;
  ELSE
    -- Reset consecutive count on non-trigger
    UPDATE alert_rules
    SET consecutive_triggers = 0
    WHERE id = p_rule_id
      AND consecutive_triggers > 0;
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_alertable_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_alert_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION create_alert_rule(TEXT, TEXT, alert_metric, alert_comparison, NUMERIC, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_alert_rule(UUID, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_alert_rule_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_alert_rule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_rule_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_notification_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION update_my_notification_preferences(BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TIME, TEXT, BOOLEAN, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_alert_rules() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_alert_evaluation(UUID, BOOLEAN, NUMERIC, UUID, TEXT, UUID, UUID, JSONB) TO authenticated, service_role;
