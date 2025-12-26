-- supabase/migrations/20251226_008_agency_slack_credentials.sql
-- Store per-agency Slack app credentials for multi-workspace OAuth

-- ============================================================================
-- 1. Create agency_slack_credentials table
-- ============================================================================

CREATE TABLE IF NOT EXISTS agency_slack_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  -- NULL agency_id = IMO-level default credentials

  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  signing_secret_encrypted TEXT,

  -- Metadata
  app_name TEXT, -- e.g., "Self Made Sales Bot"
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one set of credentials per agency (or one IMO-level default)
  UNIQUE (imo_id, agency_id)
);

-- Enable RLS
ALTER TABLE agency_slack_credentials ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (credentials are sensitive)
CREATE POLICY "Service role full access to agency_slack_credentials"
ON agency_slack_credentials
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Agency owners can view their own agency's credentials (not the secrets, just metadata)
CREATE POLICY "Agency owners can view credential metadata"
ON agency_slack_credentials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.id = agency_slack_credentials.agency_id
      AND a.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.imo_id = agency_slack_credentials.imo_id
      AND up.role IN ('imo_admin', 'super_admin')
  )
);

-- IMO admins can insert/update credentials for their IMO
CREATE POLICY "IMO admins can manage credentials"
ON agency_slack_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.imo_id = agency_slack_credentials.imo_id
      AND up.role IN ('imo_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.imo_id = agency_slack_credentials.imo_id
      AND up.role IN ('imo_admin', 'super_admin')
  )
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agency_slack_credentials_lookup
ON agency_slack_credentials (imo_id, agency_id);

COMMENT ON TABLE agency_slack_credentials IS
'Stores Slack OAuth app credentials per agency. Each agency can have its own Slack app
to enable multi-workspace integration where policies post to all workspaces in the hierarchy.

The client_secret_encrypted and signing_secret_encrypted columns are encrypted using
the same encryption functions as slack_integrations.bot_token_encrypted.';

COMMENT ON COLUMN agency_slack_credentials.agency_id IS
'Agency this credential set belongs to. NULL = IMO-level default credentials used when no agency-specific credentials exist.';

COMMENT ON COLUMN agency_slack_credentials.client_id IS
'Slack App Client ID (not sensitive, can be stored in plain text)';

COMMENT ON COLUMN agency_slack_credentials.client_secret_encrypted IS
'Slack App Client Secret (encrypted). Used for OAuth token exchange.';

COMMENT ON COLUMN agency_slack_credentials.signing_secret_encrypted IS
'Slack Signing Secret (encrypted). Used for verifying webhook requests from Slack.';

-- ============================================================================
-- 2. Function to look up Slack credentials for an agency
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_slack_credentials(
  p_imo_id UUID,
  p_agency_id UUID DEFAULT NULL
)
RETURNS TABLE(
  credential_id UUID,
  client_id TEXT,
  client_secret_encrypted TEXT,
  signing_secret_encrypted TEXT,
  app_name TEXT,
  source_agency_id UUID,
  is_fallback BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, try to find credentials for the specific agency
  IF p_agency_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      asc.id as credential_id,
      asc.client_id,
      asc.client_secret_encrypted,
      asc.signing_secret_encrypted,
      asc.app_name,
      asc.agency_id as source_agency_id,
      false as is_fallback
    FROM agency_slack_credentials asc
    WHERE asc.imo_id = p_imo_id
      AND asc.agency_id = p_agency_id;

    IF FOUND THEN
      RETURN;
    END IF;

    -- Walk up the agency hierarchy to find parent credentials
    RETURN QUERY
    WITH RECURSIVE agency_tree AS (
      SELECT a.id, a.parent_agency_id, 0 as depth
      FROM agencies a
      WHERE a.id = p_agency_id

      UNION ALL

      SELECT a.id, a.parent_agency_id, at.depth + 1
      FROM agencies a
      INNER JOIN agency_tree at ON a.id = at.parent_agency_id
    )
    SELECT
      asc.id as credential_id,
      asc.client_id,
      asc.client_secret_encrypted,
      asc.signing_secret_encrypted,
      asc.app_name,
      asc.agency_id as source_agency_id,
      true as is_fallback
    FROM agency_tree at
    INNER JOIN agency_slack_credentials asc ON asc.agency_id = at.id
    WHERE asc.imo_id = p_imo_id
    ORDER BY at.depth ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Fall back to IMO-level credentials
  RETURN QUERY
  SELECT
    asc.id as credential_id,
    asc.client_id,
    asc.client_secret_encrypted,
    asc.signing_secret_encrypted,
    asc.app_name,
    asc.agency_id as source_agency_id,
    true as is_fallback
  FROM agency_slack_credentials asc
  WHERE asc.imo_id = p_imo_id
    AND asc.agency_id IS NULL
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_slack_credentials(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_agency_slack_credentials(UUID, UUID) IS
'Looks up Slack app credentials for an agency. Tries in order:
1. Exact match for agency_id
2. Walk up agency hierarchy to find parent credentials
3. Fall back to IMO-level credentials (agency_id IS NULL)

Returns is_fallback=true if using parent/IMO credentials instead of agency-specific.';

-- ============================================================================
-- 3. Add title_updated_at column to daily_sales_logs (if not exists)
-- ============================================================================

ALTER TABLE daily_sales_logs
ADD COLUMN IF NOT EXISTS title_set_at TIMESTAMPTZ;

COMMENT ON COLUMN daily_sales_logs.title_set_at IS
'When the custom title was set by the first seller. NULL if using default title.';

-- ============================================================================
-- 4. Function to update leaderboard title
-- ============================================================================

CREATE OR REPLACE FUNCTION update_daily_leaderboard_title(
  p_log_id UUID,
  p_title TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_seller_id UUID;
  v_log_date DATE;
BEGIN
  -- Verify the user is the first seller for this log
  SELECT first_seller_id, log_date INTO v_first_seller_id, v_log_date
  FROM daily_sales_logs
  WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Daily sales log not found';
  END IF;

  -- Only allow naming on the same day (or allow anyone for flexibility?)
  -- For now, only the first seller can name it
  IF v_first_seller_id != p_user_id THEN
    RAISE EXCEPTION 'Only the first seller can name the leaderboard';
  END IF;

  -- Only allow naming on the same day
  IF v_log_date != CURRENT_DATE THEN
    RAISE EXCEPTION 'Can only name the leaderboard on the day of the first sale';
  END IF;

  -- Update the title
  UPDATE daily_sales_logs
  SET title = p_title,
      title_set_at = NOW(),
      updated_at = NOW()
  WHERE id = p_log_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION update_daily_leaderboard_title(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_leaderboard_title(UUID, TEXT, UUID) TO service_role;

COMMENT ON FUNCTION update_daily_leaderboard_title(UUID, TEXT, UUID) IS
'Allows the first seller to update the daily leaderboard title.
Only works on the day of the first sale and only by the first seller.';

-- ============================================================================
-- 5. Function to get today's daily log for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_daily_sales_logs()
RETURNS TABLE(
  id UUID,
  imo_id UUID,
  slack_integration_id UUID,
  channel_id TEXT,
  log_date DATE,
  title TEXT,
  first_seller_id UUID,
  is_first_seller BOOLEAN,
  can_rename BOOLEAN,
  leaderboard_message_ts TEXT,
  title_set_at TIMESTAMPTZ,
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
    dsl.id,
    dsl.imo_id,
    dsl.slack_integration_id,
    dsl.channel_id,
    dsl.log_date,
    dsl.title,
    dsl.first_seller_id,
    (dsl.first_seller_id = auth.uid()) as is_first_seller,
    (dsl.first_seller_id = auth.uid() AND dsl.log_date = CURRENT_DATE AND dsl.title_set_at IS NULL) as can_rename,
    dsl.leaderboard_message_ts,
    dsl.title_set_at,
    dsl.created_at,
    dsl.updated_at
  FROM daily_sales_logs dsl
  WHERE dsl.imo_id IN (
    SELECT up.imo_id FROM user_profiles up WHERE up.id = auth.uid()
  )
  AND dsl.log_date = CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_daily_sales_logs() TO authenticated;

COMMENT ON FUNCTION get_my_daily_sales_logs() IS
'Returns today''s daily sales logs for the current user''s IMO.
Includes is_first_seller and can_rename flags for UI logic.';
