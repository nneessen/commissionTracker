-- supabase/migrations/reverts/20260105_003_revert_multi_channel_naming.sql
-- Reverts the multi-channel naming feature back to single-channel behavior
-- Original behavior: Returns only ONE pending log (user's direct agency) with LIMIT 1

-- ============================================================================
-- Drop the multi-channel version
-- ============================================================================

DROP FUNCTION IF EXISTS check_first_seller_naming(uuid);

-- ============================================================================
-- Restore original single-channel version with LIMIT 1
-- ============================================================================

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
  ORDER BY dsl.created_at ASC
  LIMIT 1;  -- Single-channel: only return first pending log
END;
$$;

COMMENT ON FUNCTION check_first_seller_naming(UUID) IS
  'Checks if the given user is the first seller of the day and needs to name the leaderboard.
   Returns the log details if naming is needed or if there is a pending notification.
   has_pending_notification indicates the Slack message has not been sent yet.
   NOTE: This is the single-channel version with LIMIT 1.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_first_seller_naming(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_first_seller_naming(UUID) TO service_role;
