-- Migration: Alert Rules Security Fixes
-- Phase 10 Security Hardening
-- Addresses: race conditions, org validation, and adds helper functions

-- ============================================
-- GET DUE ALERT RULES (SECURED VERSION)
-- With FOR UPDATE SKIP LOCKED to prevent race conditions
-- and proper atomic marking of rules being processed
-- ============================================

-- Create processing tracker table for locking
CREATE TABLE IF NOT EXISTS alert_rule_processing (
  rule_id UUID PRIMARY KEY REFERENCES alert_rules(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  worker_id TEXT
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_alert_rule_processing_started
  ON alert_rule_processing(started_at);

-- Drop old function first
DROP FUNCTION IF EXISTS get_due_alert_rules();

-- New secured version with locking
CREATE OR REPLACE FUNCTION get_due_alert_rules(
  p_worker_id TEXT DEFAULT gen_random_uuid()::TEXT,
  p_batch_size INTEGER DEFAULT 50
)
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
DECLARE
  v_rule_ids UUID[];
BEGIN
  -- Clean up stale processing records (older than 10 minutes)
  DELETE FROM alert_rule_processing
  WHERE started_at < now() - INTERVAL '10 minutes';

  -- Lock and claim rules atomically using FOR UPDATE SKIP LOCKED
  WITH due_rules AS (
    SELECT ar.id
    FROM alert_rules ar
    WHERE ar.is_active = true
      AND (
        ar.last_triggered_at IS NULL
        OR ar.last_triggered_at < now() - (ar.cooldown_hours || ' hours')::INTERVAL
      )
      -- Exclude rules already being processed
      AND NOT EXISTS (
        SELECT 1 FROM alert_rule_processing arp WHERE arp.rule_id = ar.id
      )
    ORDER BY ar.last_triggered_at NULLS FIRST
    LIMIT p_batch_size
    FOR UPDATE OF ar SKIP LOCKED
  ),
  claimed_rules AS (
    INSERT INTO alert_rule_processing (rule_id, worker_id)
    SELECT dr.id, p_worker_id FROM due_rules dr
    ON CONFLICT (rule_id) DO NOTHING
    RETURNING rule_id
  )
  SELECT array_agg(cr.rule_id) INTO v_rule_ids FROM claimed_rules cr;

  -- Return the claimed rules
  IF v_rule_ids IS NULL OR array_length(v_rule_ids, 1) IS NULL THEN
    RETURN;
  END IF;

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
  WHERE ar.id = ANY(v_rule_ids);
END;
$$;

-- ============================================
-- RELEASE ALERT RULES
-- Called after processing to release locks
-- ============================================
CREATE OR REPLACE FUNCTION release_alert_rules(
  p_rule_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM alert_rule_processing
  WHERE rule_id = ANY(p_rule_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- VALIDATE ORG SCOPE FOR USERS
-- Helper function to validate users belong to a rule's org
-- Used by edge function to filter out cross-org data
-- ============================================
CREATE OR REPLACE FUNCTION get_valid_users_for_rule(
  p_rule_id UUID,
  p_user_ids UUID[]
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_valid_ids UUID[];
BEGIN
  -- Get the rule
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  -- Filter users to only those in the rule's org scope
  IF v_rule.imo_id IS NOT NULL THEN
    -- Rule is IMO-scoped
    SELECT array_agg(up.id) INTO v_valid_ids
    FROM user_profiles up
    WHERE up.id = ANY(p_user_ids)
      AND up.imo_id = v_rule.imo_id;
  ELSIF v_rule.agency_id IS NOT NULL THEN
    -- Rule is Agency-scoped
    SELECT array_agg(up.id) INTO v_valid_ids
    FROM user_profiles up
    WHERE up.id = ANY(p_user_ids)
      AND up.agency_id = v_rule.agency_id;
  ELSE
    -- No org constraint (should not happen with proper data)
    v_valid_ids := ARRAY[]::UUID[];
  END IF;

  RETURN COALESCE(v_valid_ids, ARRAY[]::UUID[]);
END;
$$;

-- ============================================
-- BATCH GET POLICIES FOR LAPSE CHECK
-- Replaces N+1 pattern with single batched query
-- Returns policies grouped by agent with org scoping
-- ============================================
CREATE OR REPLACE FUNCTION get_policies_for_lapse_check(
  p_rule_id UUID,
  p_user_ids UUID[],
  p_warning_days INTEGER
)
RETURNS TABLE (
  policy_id UUID,
  policy_number TEXT,
  agent_id UUID,
  lapse_date DATE,
  days_until_lapse INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_valid_user_ids UUID[];
  v_today DATE := CURRENT_DATE;
  v_warning_date DATE := CURRENT_DATE + p_warning_days;
BEGIN
  -- Get rule for org scoping
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -- Validate users belong to rule's org
  v_valid_user_ids := get_valid_users_for_rule(p_rule_id, p_user_ids);
  IF array_length(v_valid_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Return policies with org scoping
  RETURN QUERY
  SELECT
    p.id AS policy_id,
    p.policy_number,
    p.agent_id,
    p.lapse_date,
    (p.lapse_date - v_today)::INTEGER AS days_until_lapse
  FROM policies p
  INNER JOIN user_profiles up ON up.id = p.agent_id
  WHERE p.agent_id = ANY(v_valid_user_ids)
    AND p.status = 'active'
    AND p.lapse_date IS NOT NULL
    AND p.lapse_date BETWEEN v_today AND v_warning_date
    -- Org scoping
    AND (
      (v_rule.imo_id IS NOT NULL AND up.imo_id = v_rule.imo_id)
      OR (v_rule.agency_id IS NOT NULL AND up.agency_id = v_rule.agency_id)
    );
END;
$$;

-- ============================================
-- BATCH GET COMMISSIONS FOR THRESHOLD CHECK
-- Replaces N+1 pattern with single batched query
-- ============================================
CREATE OR REPLACE FUNCTION get_commissions_for_threshold_check(
  p_rule_id UUID,
  p_user_ids UUID[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  agent_id UUID,
  total_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_valid_user_ids UUID[];
BEGIN
  -- Get rule for org scoping
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -- Validate users belong to rule's org
  v_valid_user_ids := get_valid_users_for_rule(p_rule_id, p_user_ids);
  IF array_length(v_valid_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Return aggregated commissions with org scoping
  RETURN QUERY
  SELECT
    c.agent_id,
    COALESCE(SUM(c.earned_amount), 0)::NUMERIC AS total_commission
  FROM commissions c
  INNER JOIN user_profiles up ON up.id = c.agent_id
  WHERE c.agent_id = ANY(v_valid_user_ids)
    AND c.effective_date BETWEEN p_start_date AND p_end_date
    -- Org scoping
    AND (
      (v_rule.imo_id IS NOT NULL AND up.imo_id = v_rule.imo_id)
      OR (v_rule.agency_id IS NOT NULL AND up.agency_id = v_rule.agency_id)
    )
  GROUP BY c.agent_id;
END;
$$;

-- ============================================
-- BATCH GET POLICY COUNTS
-- Replaces N+1 pattern with single batched query
-- ============================================
CREATE OR REPLACE FUNCTION get_policy_counts_for_check(
  p_rule_id UUID,
  p_user_ids UUID[],
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  agent_id UUID,
  policy_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_valid_user_ids UUID[];
BEGIN
  -- Get rule for org scoping
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -- Validate users belong to rule's org
  v_valid_user_ids := get_valid_users_for_rule(p_rule_id, p_user_ids);
  IF array_length(v_valid_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Return policy counts with org scoping
  RETURN QUERY
  SELECT
    p.agent_id,
    COUNT(p.id) AS policy_count
  FROM policies p
  INNER JOIN user_profiles up ON up.id = p.agent_id
  WHERE p.agent_id = ANY(v_valid_user_ids)
    AND p.effective_date BETWEEN p_start_date AND p_end_date
    -- Org scoping
    AND (
      (v_rule.imo_id IS NOT NULL AND up.imo_id = v_rule.imo_id)
      OR (v_rule.agency_id IS NOT NULL AND up.agency_id = v_rule.agency_id)
    )
  GROUP BY p.agent_id;
END;
$$;

-- ============================================
-- BATCH GET LICENSE EXPIRATIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_license_expirations_for_check(
  p_rule_id UUID,
  p_user_ids UUID[],
  p_warning_days INTEGER
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  license_expiration DATE,
  days_until_expiration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_valid_user_ids UUID[];
  v_today DATE := CURRENT_DATE;
  v_warning_date DATE := CURRENT_DATE + p_warning_days;
BEGIN
  -- Get rule for org scoping
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -- Validate users belong to rule's org
  v_valid_user_ids := get_valid_users_for_rule(p_rule_id, p_user_ids);
  IF array_length(v_valid_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Return license expirations with org scoping
  RETURN QUERY
  SELECT
    up.id AS user_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) AS user_name,
    up.license_expiration,
    (up.license_expiration - v_today)::INTEGER AS days_until_expiration
  FROM user_profiles up
  WHERE up.id = ANY(v_valid_user_ids)
    AND up.license_expiration IS NOT NULL
    AND up.license_expiration BETWEEN v_today AND v_warning_date
    -- Org scoping
    AND (
      (v_rule.imo_id IS NOT NULL AND up.imo_id = v_rule.imo_id)
      OR (v_rule.agency_id IS NOT NULL AND up.agency_id = v_rule.agency_id)
    );
END;
$$;

-- ============================================
-- SANITIZED NOTIFICATION CREATION
-- Creates notification with sanitized metadata
-- ============================================
CREATE OR REPLACE FUNCTION create_alert_notification_safe(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_rule_id UUID,
  p_metric TEXT,
  p_current_value NUMERIC,
  p_threshold_value NUMERIC,
  p_comparison TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule alert_rules;
  v_user user_profiles;
  v_notification_id UUID;
BEGIN
  -- Validate rule ownership
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;
  IF v_rule IS NULL THEN
    RAISE EXCEPTION 'Invalid rule ID';
  END IF;

  -- Validate user belongs to rule's org
  SELECT * INTO v_user FROM user_profiles WHERE id = p_user_id;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Invalid user ID';
  END IF;

  -- Verify org match
  IF v_rule.imo_id IS NOT NULL AND v_user.imo_id != v_rule.imo_id THEN
    RAISE EXCEPTION 'User org mismatch - IMO';
  END IF;
  IF v_rule.agency_id IS NOT NULL AND v_user.agency_id != v_rule.agency_id THEN
    RAISE EXCEPTION 'User org mismatch - Agency';
  END IF;

  -- Create notification with sanitized metadata (no raw context spread)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    jsonb_build_object(
      'rule_id', p_rule_id,
      'metric', p_metric,
      'current_value', p_current_value,
      'threshold_value', p_threshold_value,
      'comparison', p_comparison,
      'entity_type', p_entity_type,
      'entity_id', p_entity_id
    )
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_due_alert_rules(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION release_alert_rules(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_valid_users_for_rule(UUID, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_policies_for_lapse_check(UUID, UUID[], INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_commissions_for_threshold_check(UUID, UUID[], DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_policy_counts_for_check(UUID, UUID[], DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_license_expirations_for_check(UUID, UUID[], INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION create_alert_notification_safe(UUID, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, UUID) TO service_role;

-- RLS for processing table (service role only)
ALTER TABLE alert_rule_processing ENABLE ROW LEVEL SECURITY;
