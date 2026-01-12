-- supabase/migrations/20251226_010_fix_agency_slack_credentials.sql
-- Fix issues with agency_slack_credentials migration

-- ============================================================================
-- 1. Fix RLS policies - use 'roles' instead of 'role'
-- ============================================================================

-- Drop and recreate the policies with correct column name
DROP POLICY IF EXISTS "Agency owners can view credential metadata" ON agency_slack_credentials;
DROP POLICY IF EXISTS "IMO admins can manage credentials" ON agency_slack_credentials;

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
      AND ('imo_admin' = ANY(up.roles) OR 'super_admin' = ANY(up.roles))
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
      AND ('imo_admin' = ANY(up.roles) OR 'super_admin' = ANY(up.roles))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.imo_id = agency_slack_credentials.imo_id
      AND ('imo_admin' = ANY(up.roles) OR 'super_admin' = ANY(up.roles))
  )
);

-- ============================================================================
-- 2. Fix get_agency_slack_credentials function - rename 'asc' alias to 'creds'
-- ============================================================================

DROP FUNCTION IF EXISTS get_agency_slack_credentials(UUID, UUID);

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
      creds.id as credential_id,
      creds.client_id,
      creds.client_secret_encrypted,
      creds.signing_secret_encrypted,
      creds.app_name,
      creds.agency_id as source_agency_id,
      false as is_fallback
    FROM agency_slack_credentials creds
    WHERE creds.imo_id = p_imo_id
      AND creds.agency_id = p_agency_id;

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
      creds.id as credential_id,
      creds.client_id,
      creds.client_secret_encrypted,
      creds.signing_secret_encrypted,
      creds.app_name,
      creds.agency_id as source_agency_id,
      true as is_fallback
    FROM agency_tree at
    INNER JOIN agency_slack_credentials creds ON creds.agency_id = at.id
    WHERE creds.imo_id = p_imo_id
    ORDER BY at.depth ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Fall back to IMO-level credentials
  RETURN QUERY
  SELECT
    creds.id as credential_id,
    creds.client_id,
    creds.client_secret_encrypted,
    creds.signing_secret_encrypted,
    creds.app_name,
    creds.agency_id as source_agency_id,
    true as is_fallback
  FROM agency_slack_credentials creds
  WHERE creds.imo_id = p_imo_id
    AND creds.agency_id IS NULL
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
