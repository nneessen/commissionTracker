-- supabase/migrations/20251226_012_first_seller_naming_rpc.sql
-- RPC function to check if user is the first seller and needs to name the leaderboard
-- This is called by the frontend after policy creation

-- ============================================================================
-- Create RPC function to check if user should name leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION check_first_seller_naming(p_user_id UUID)
RETURNS TABLE (
  log_id UUID,
  agency_id UUID,
  agency_name TEXT,
  log_date DATE,
  needs_naming BOOLEAN
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
    (dsl.title IS NULL) as needs_naming
  FROM daily_sales_logs dsl
  JOIN slack_integrations si ON si.id = dsl.slack_integration_id
  LEFT JOIN agencies a ON a.id = si.agency_id
  WHERE dsl.first_seller_id = p_user_id
    AND dsl.log_date = CURRENT_DATE
    AND dsl.title IS NULL  -- Only return if leaderboard hasn't been named yet
  ORDER BY dsl.created_at ASC
  LIMIT 1;  -- Return only the first one (user's own agency level)
END;
$$;

COMMENT ON FUNCTION check_first_seller_naming(UUID) IS
  'Checks if the given user is the first seller of the day and needs to name the leaderboard.
   Returns the log details if naming is needed, empty result otherwise.
   Called by frontend after policy creation to show naming dialog.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_first_seller_naming(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_first_seller_naming(UUID) TO service_role;

-- ============================================================================
-- Create RPC function to set leaderboard title
-- ============================================================================

CREATE OR REPLACE FUNCTION set_leaderboard_title(p_log_id UUID, p_title TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_first_seller BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is the first seller for this log
  SELECT (first_seller_id = v_user_id) INTO v_is_first_seller
  FROM daily_sales_logs
  WHERE id = p_log_id;

  IF NOT v_is_first_seller THEN
    RAISE EXCEPTION 'Only the first seller can name the leaderboard';
  END IF;

  -- Update the title
  UPDATE daily_sales_logs
  SET title = p_title,
      updated_at = NOW()
  WHERE id = p_log_id
    AND first_seller_id = v_user_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION set_leaderboard_title(UUID, TEXT) IS
  'Allows the first seller to set the leaderboard title.
   Validates that the calling user is the first_seller_id for this log.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_leaderboard_title(UUID, TEXT) TO authenticated;
