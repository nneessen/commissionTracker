-- supabase/migrations/20251226_013_pending_first_sale.sql
-- Add pending_policy_data column to daily_sales_logs for first-sale naming flow
-- When a first sale of the day occurs, we store the policy data here and wait
-- for the user to name the leaderboard before posting to Slack

-- ============================================================================
-- Add column to store pending policy data
-- ============================================================================

ALTER TABLE daily_sales_logs
ADD COLUMN IF NOT EXISTS pending_policy_data JSONB DEFAULT NULL;

COMMENT ON COLUMN daily_sales_logs.pending_policy_data IS
  'Stores policy notification payload for first sale of the day.
   When set, the Slack notification has not been sent yet.
   Frontend should show naming dialog, then call complete-first-sale action.
   NULL means either not a first sale, or the notification has been sent.';

-- ============================================================================
-- Drop old function first (return type is changing)
-- ============================================================================

DROP FUNCTION IF EXISTS check_first_seller_naming(uuid);

-- ============================================================================
-- Update check_first_seller_naming RPC to return pending status
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
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION check_first_seller_naming(UUID) IS
  'Checks if the given user is the first seller of the day and needs to name the leaderboard.
   Returns the log details if naming is needed or if there is a pending notification.
   has_pending_notification indicates the Slack message has not been sent yet.';
