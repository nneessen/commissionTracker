-- supabase/migrations/20260129171835_agent_milestone_celebrations.sql
-- Agent Milestone Celebrations - Track and prevent duplicate celebration posts

-- ============================================================================
-- 1. Add milestone tracking columns to daily_sales_logs
-- ============================================================================

ALTER TABLE daily_sales_logs
ADD COLUMN IF NOT EXISTS last_policy_milestone INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ap_milestone NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sms_milestone_date DATE DEFAULT NULL;

COMMENT ON COLUMN daily_sales_logs.last_policy_milestone IS
'Last policy count milestone triggered (2, 3, or 5). Prevents duplicate celebrations.';

COMMENT ON COLUMN daily_sales_logs.last_ap_milestone IS
'Last AP milestone triggered (2500, 5000, 7500, 10000). Prevents duplicate celebrations.';

COMMENT ON COLUMN daily_sales_logs.last_sms_milestone_date IS
'Date when SMS blast was last sent for mega milestone. Max 1 SMS per agent per day.';

-- ============================================================================
-- 2. Create helper function to get agent daily stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agent_daily_stats(
  p_user_id UUID,
  p_imo_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  policy_count INT,
  total_ap NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(p.id)::INT as policy_count,
    COALESCE(SUM(p.annual_premium), 0)::NUMERIC as total_ap
  FROM policies p
  WHERE p.user_id = p_user_id
    AND p.imo_id = p_imo_id
    AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) = p_target_date
    AND p.status IN ('active', 'pending', 'approved');
END;
$$;

GRANT EXECUTE ON FUNCTION get_agent_daily_stats(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_daily_stats(UUID, UUID, DATE) TO service_role;

-- ============================================================================
-- 3. Create function to check and update milestones
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_update_milestones(
  p_log_id UUID,
  p_policy_count INT,
  p_total_ap NUMERIC
)
RETURNS TABLE (
  new_policy_milestone INT,
  new_ap_milestone NUMERIC,
  should_send_sms BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_policy_milestone INT;
  v_last_ap_milestone NUMERIC;
  v_last_sms_date DATE;
  v_new_policy_milestone INT := 0;
  v_new_ap_milestone NUMERIC := 0;
  v_should_send_sms BOOLEAN := false;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current milestone state
  SELECT
    COALESCE(last_policy_milestone, 0),
    COALESCE(last_ap_milestone, 0),
    last_sms_milestone_date
  INTO v_last_policy_milestone, v_last_ap_milestone, v_last_sms_date
  FROM daily_sales_logs
  WHERE id = p_log_id;

  -- Determine new policy milestone (2, 3, or 5)
  IF p_policy_count >= 5 AND v_last_policy_milestone < 5 THEN
    v_new_policy_milestone := 5;
  ELSIF p_policy_count >= 3 AND v_last_policy_milestone < 3 THEN
    v_new_policy_milestone := 3;
  ELSIF p_policy_count >= 2 AND v_last_policy_milestone < 2 THEN
    v_new_policy_milestone := 2;
  END IF;

  -- Determine new AP milestone (2500, 5000, 7500, 10000)
  IF p_total_ap >= 10000 AND v_last_ap_milestone < 10000 THEN
    v_new_ap_milestone := 10000;
  ELSIF p_total_ap >= 7500 AND v_last_ap_milestone < 7500 THEN
    v_new_ap_milestone := 7500;
  ELSIF p_total_ap >= 5000 AND v_last_ap_milestone < 5000 THEN
    v_new_ap_milestone := 5000;
  ELSIF p_total_ap >= 2500 AND v_last_ap_milestone < 2500 THEN
    v_new_ap_milestone := 2500;
  END IF;

  -- Check if we should send SMS (mega milestone + not sent today)
  IF (v_new_policy_milestone = 5 OR v_new_ap_milestone = 10000)
     AND (v_last_sms_date IS NULL OR v_last_sms_date != v_today) THEN
    v_should_send_sms := true;
  END IF;

  -- Update the milestone tracking columns if any new milestone was hit
  IF v_new_policy_milestone > 0 OR v_new_ap_milestone > 0 THEN
    UPDATE daily_sales_logs
    SET
      last_policy_milestone = GREATEST(last_policy_milestone, COALESCE(v_new_policy_milestone, 0)),
      last_ap_milestone = GREATEST(last_ap_milestone, COALESCE(v_new_ap_milestone, 0)),
      last_sms_milestone_date = CASE WHEN v_should_send_sms THEN v_today ELSE last_sms_milestone_date END,
      updated_at = NOW()
    WHERE id = p_log_id;
  END IF;

  RETURN QUERY SELECT v_new_policy_milestone, v_new_ap_milestone, v_should_send_sms;
END;
$$;

GRANT EXECUTE ON FUNCTION check_and_update_milestones(UUID, INT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_update_milestones(UUID, INT, NUMERIC) TO service_role;

-- ============================================================================
-- 4. Create function to get agency users for SMS blast
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_users_for_sms(
  p_agency_id UUID,
  p_imo_id UUID,
  p_exclude_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  phone TEXT,
  first_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    up.id as user_id,
    up.phone,
    up.first_name
  FROM user_profiles up
  WHERE up.phone IS NOT NULL
    AND up.phone != ''
    AND up.id != p_exclude_user_id
    AND (
      -- Same agency
      (p_agency_id IS NOT NULL AND up.agency_id = p_agency_id)
      -- Or same IMO if no agency specified
      OR (p_agency_id IS NULL AND up.imo_id = p_imo_id)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_users_for_sms(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_users_for_sms(UUID, UUID, UUID) TO service_role;
