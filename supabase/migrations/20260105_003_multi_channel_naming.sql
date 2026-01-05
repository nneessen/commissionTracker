-- supabase/migrations/20260105_003_multi_channel_naming.sql
-- Enable multi-channel naming: when a user is first in multiple Slack channels,
-- they can name all leaderboards, not just their direct agency's.

-- ============================================================================
-- 1. Update check_first_seller_naming to return ALL pending logs (not just one)
-- ============================================================================

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS check_first_seller_naming(uuid);

CREATE OR REPLACE FUNCTION check_first_seller_naming(p_user_id UUID)
RETURNS TABLE (
  log_id UUID,
  agency_id UUID,
  agency_name TEXT,
  log_date DATE,
  needs_naming BOOLEAN,
  has_pending_notification BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return ALL pending logs for this user, not just the first one
  -- This enables multi-channel naming when user is first in multiple channels
  RETURN QUERY
  SELECT
    dsl.id as log_id,
    si.agency_id,
    COALESCE(a.name, 'IMO-Level')::TEXT as agency_name,
    dsl.log_date,
    (dsl.title IS NULL) as needs_naming,
    (dsl.pending_policy_data IS NOT NULL) as has_pending_notification
  FROM daily_sales_logs dsl
  JOIN slack_integrations si ON si.id = dsl.slack_integration_id
  LEFT JOIN agencies a ON a.id = si.agency_id
  WHERE dsl.first_seller_id = p_user_id
    AND dsl.log_date = CURRENT_DATE
    AND (dsl.title IS NULL OR dsl.pending_policy_data IS NOT NULL)
  ORDER BY dsl.hierarchy_depth ASC, dsl.created_at ASC;
  -- No LIMIT - return all pending logs for multi-channel naming
END;
$$;

COMMENT ON FUNCTION check_first_seller_naming(UUID) IS
  'Returns ALL pending logs where the user is the first seller of the day.
   Enables multi-channel naming when user is first in multiple Slack channels.
   Results are ordered by hierarchy_depth (direct agency first) then created_at.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_first_seller_naming(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_first_seller_naming(UUID) TO service_role;
