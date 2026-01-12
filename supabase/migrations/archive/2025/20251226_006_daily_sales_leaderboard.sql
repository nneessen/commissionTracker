-- supabase/migrations/20251226_006_daily_sales_leaderboard.sql
-- Add support for daily sales leaderboard with first-seller naming

-- ============================================================================
-- Add slack_member_id to user_slack_preferences for @mentions
-- ============================================================================

ALTER TABLE user_slack_preferences
ADD COLUMN IF NOT EXISTS slack_member_id TEXT;

COMMENT ON COLUMN user_slack_preferences.slack_member_id IS
'The Slack member ID (e.g., U12345678) for this user, used for @mentions in Slack messages';

-- ============================================================================
-- Create daily_sales_logs table to track daily leaderboard state
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_sales_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  slack_integration_id UUID REFERENCES slack_integrations(id) ON DELETE SET NULL,
  channel_id TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT, -- e.g., "Freaky Friday Sales" - set by first seller
  first_seller_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  leaderboard_message_ts TEXT, -- The Slack message timestamp for updating
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one log per day per channel per integration
  UNIQUE (imo_id, slack_integration_id, channel_id, log_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_sales_logs_lookup
ON daily_sales_logs (imo_id, slack_integration_id, channel_id, log_date);

-- Enable RLS
ALTER TABLE daily_sales_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role can manage daily_sales_logs"
ON daily_sales_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy for users to view logs for their IMO
CREATE POLICY "Users can view their IMO daily_sales_logs"
ON daily_sales_logs
FOR SELECT
USING (
  imo_id IN (
    SELECT imo_id FROM user_profiles WHERE id = auth.uid()
  )
);

COMMENT ON TABLE daily_sales_logs IS
'Tracks daily sales leaderboard state for each Slack channel.
The first seller of the day can name the log (e.g., "Freaky Friday Sales").
The leaderboard_message_ts is used to UPDATE the leaderboard instead of posting new messages.';

-- ============================================================================
-- Function to get today's daily production for leaderboard
-- (Daily cumulative AP per agent)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_production_by_agent(
  p_imo_id UUID,
  p_agency_id UUID DEFAULT NULL
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  slack_member_id TEXT,
  total_annual_premium NUMERIC,
  policy_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name,
    up.email as agent_email,
    usp.slack_member_id,
    COALESCE(SUM(p.annual_premium), 0)::NUMERIC as total_annual_premium,
    COUNT(p.id)::INTEGER as policy_count
  FROM policies p
  JOIN user_profiles up ON p.user_id = up.id
  LEFT JOIN user_slack_preferences usp ON usp.user_id = up.id AND usp.imo_id = p.imo_id
  WHERE p.imo_id = p_imo_id
    AND p.created_at::DATE = CURRENT_DATE
    AND p.status IN ('active', 'pending', 'approved')
    AND (p_agency_id IS NULL OR p.agency_id = p_agency_id OR p.agency_id IN (
      SELECT h.agency_id FROM get_agency_hierarchy(p_agency_id) h
    ))
  GROUP BY p.user_id, up.first_name, up.last_name, up.email, usp.slack_member_id
  ORDER BY total_annual_premium DESC;
END;
$$;

COMMENT ON FUNCTION get_daily_production_by_agent(UUID, UUID) IS
'Returns daily (today only) production by agent for leaderboard.
Returns agent info including slack_member_id for @mentions.
Sorted by total annual premium descending.';
