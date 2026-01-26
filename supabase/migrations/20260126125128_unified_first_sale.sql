-- supabase/migrations/20260126125128_unified_first_sale.sql
-- Unified First Sale Dialog: Single naming dialog applies title to ALL hierarchy channels

-- ============================================================================
-- 1. Add first_sale_group_id column to daily_sales_logs
-- ============================================================================

ALTER TABLE daily_sales_logs
ADD COLUMN IF NOT EXISTS first_sale_group_id UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_sales_logs_group
ON daily_sales_logs (first_sale_group_id) WHERE first_sale_group_id IS NOT NULL;

COMMENT ON COLUMN daily_sales_logs.first_sale_group_id IS
'Groups related first sale logs across multiple channels. All logs in the same group share the same title.';

-- ============================================================================
-- 2. Create check_first_seller_naming_unified RPC
--    Returns a single representative row with metadata about ALL channels in group
-- ============================================================================

CREATE OR REPLACE FUNCTION check_first_seller_naming_unified(p_user_id UUID)
RETURNS TABLE (
  first_sale_group_id UUID,
  representative_log_id UUID,
  agency_name TEXT,
  log_date DATE,
  needs_naming BOOLEAN,
  has_pending_notification BOOLEAN,
  total_channels INT,
  channel_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH pending_logs AS (
    -- Get all pending logs for this user today
    SELECT
      dsl.id as log_id,
      dsl.first_sale_group_id,
      dsl.log_date,
      dsl.title,
      dsl.pending_policy_data,
      si.agency_id,
      COALESCE(a.name, 'Self Made Financial')::TEXT as agency_name,
      si.policy_channel_name,
      dsl.hierarchy_depth
    FROM daily_sales_logs dsl
    JOIN slack_integrations si ON si.id = dsl.slack_integration_id
    LEFT JOIN agencies a ON a.id = si.agency_id
    WHERE dsl.first_seller_id = p_user_id
      AND dsl.log_date = CURRENT_DATE
      AND (dsl.title IS NULL OR dsl.pending_policy_data IS NOT NULL)
  ),
  grouped AS (
    -- Group by first_sale_group_id (or treat each ungrouped log as its own group)
    SELECT
      COALESCE(pl.first_sale_group_id, pl.log_id) as effective_group_id,
      MIN(pl.log_id) as representative_log_id,
      -- Use the agency name from the lowest hierarchy_depth (most direct agency)
      (ARRAY_AGG(pl.agency_name ORDER BY pl.hierarchy_depth ASC))[1] as agency_name,
      MIN(pl.log_date) as log_date,
      BOOL_OR(pl.title IS NULL) as needs_naming,
      BOOL_OR(pl.pending_policy_data IS NOT NULL) as has_pending_notification,
      COUNT(*)::INT as total_channels,
      ARRAY_AGG(DISTINCT pl.policy_channel_name ORDER BY pl.policy_channel_name) as channel_names
    FROM pending_logs pl
    GROUP BY COALESCE(pl.first_sale_group_id, pl.log_id)
  )
  SELECT
    g.effective_group_id as first_sale_group_id,
    g.representative_log_id,
    g.agency_name,
    g.log_date,
    g.needs_naming,
    g.has_pending_notification,
    g.total_channels,
    g.channel_names
  FROM grouped g
  WHERE g.needs_naming = true OR g.has_pending_notification = true
  ORDER BY g.log_date DESC
  LIMIT 1;  -- Return only ONE group at a time
END;
$$;

COMMENT ON FUNCTION check_first_seller_naming_unified(UUID) IS
'Returns a single pending first sale group for the user with metadata about all channels.
Used for unified naming dialog that applies same title to all hierarchy channels.';

GRANT EXECUTE ON FUNCTION check_first_seller_naming_unified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_first_seller_naming_unified(UUID) TO service_role;

-- ============================================================================
-- 3. Create set_leaderboard_title_batch RPC
--    Updates ALL logs in a group with the same title
-- ============================================================================

CREATE OR REPLACE FUNCTION set_leaderboard_title_batch(
  p_first_sale_group_id UUID,
  p_title TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  updated_count INT,
  log_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_log_ids UUID[];
BEGIN
  -- Update all logs in the group
  WITH updated AS (
    UPDATE daily_sales_logs
    SET
      title = p_title,
      title_set_at = NOW(),
      updated_at = NOW()
    WHERE (
      first_sale_group_id = p_first_sale_group_id
      OR (first_sale_group_id IS NULL AND id = p_first_sale_group_id)  -- Handle ungrouped logs
    )
    AND (p_user_id IS NULL OR first_seller_id = p_user_id)  -- Optional user validation
    RETURNING id
  )
  SELECT COUNT(*)::INT, ARRAY_AGG(id)
  INTO v_count, v_log_ids
  FROM updated;

  RETURN QUERY SELECT v_count, v_log_ids;
END;
$$;

COMMENT ON FUNCTION set_leaderboard_title_batch(UUID, TEXT, UUID) IS
'Sets the leaderboard title for ALL logs in a first_sale_group.
Used by unified naming dialog to apply same title to all hierarchy channels.';

GRANT EXECUTE ON FUNCTION set_leaderboard_title_batch(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_leaderboard_title_batch(UUID, TEXT, UUID) TO service_role;

-- ============================================================================
-- 4. Create get_pending_first_sale_logs RPC
--    Returns all logs in a group for batch processing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_first_sale_logs(p_first_sale_group_id UUID)
RETURNS TABLE (
  log_id UUID,
  imo_id UUID,
  slack_integration_id UUID,
  channel_id TEXT,
  log_date DATE,
  title TEXT,
  pending_policy_data JSONB,
  first_seller_id UUID,
  hierarchy_depth INT,
  leaderboard_message_ts TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dsl.id as log_id,
    dsl.imo_id,
    dsl.slack_integration_id,
    dsl.channel_id,
    dsl.log_date,
    dsl.title,
    dsl.pending_policy_data,
    dsl.first_seller_id,
    dsl.hierarchy_depth,
    dsl.leaderboard_message_ts
  FROM daily_sales_logs dsl
  WHERE dsl.first_sale_group_id = p_first_sale_group_id
     OR (dsl.first_sale_group_id IS NULL AND dsl.id = p_first_sale_group_id)
  ORDER BY dsl.hierarchy_depth ASC;
END;
$$;

COMMENT ON FUNCTION get_pending_first_sale_logs(UUID) IS
'Returns all daily_sales_logs in a first_sale_group for batch processing.
Orders by hierarchy_depth so direct agency is processed first.';

GRANT EXECUTE ON FUNCTION get_pending_first_sale_logs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_first_sale_logs(UUID) TO service_role;
