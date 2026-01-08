-- supabase/migrations/20260108_006_unipile_config.sql
-- Unipile API Configuration Table
-- Stores Unipile credentials and settings per IMO

-- ============================================================================
-- Table: unipile_config
-- Stores Unipile API configuration for each organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS unipile_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE UNIQUE,

  -- Unipile credentials (encrypted using same pattern as other integrations)
  api_key_encrypted TEXT NOT NULL,             -- Encrypted Unipile access token
  dsn TEXT NOT NULL,                            -- Unipile DSN endpoint (e.g., "api12345")

  -- Webhook configuration
  webhook_secret TEXT,                          -- For verifying webhook signatures

  -- Account limits (based on Unipile plan)
  monthly_account_limit INTEGER DEFAULT 10,     -- Max LinkedIn accounts per month
  current_account_count INTEGER DEFAULT 0,      -- Current connected accounts

  -- Feature flags
  linkedin_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,       -- Future: WhatsApp via Unipile

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_unipile_config_imo
  ON unipile_config(imo_id);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_unipile_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unipile_config_updated_at ON unipile_config;
CREATE TRIGGER trigger_unipile_config_updated_at
  BEFORE UPDATE ON unipile_config
  FOR EACH ROW
  EXECUTE FUNCTION update_unipile_config_updated_at();

-- ============================================================================
-- Trigger: Update account count when integrations change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_unipile_account_count()
RETURNS TRIGGER AS $$
DECLARE
  v_imo_id UUID;
  v_count INTEGER;
BEGIN
  -- Get the imo_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_imo_id := OLD.imo_id;
  ELSE
    v_imo_id := NEW.imo_id;
  END IF;

  -- Count active integrations for this IMO
  SELECT COUNT(*)
  INTO v_count
  FROM linkedin_integrations
  WHERE imo_id = v_imo_id
    AND is_active = true;

  -- Update the config
  UPDATE unipile_config
  SET current_account_count = v_count
  WHERE imo_id = v_imo_id;

  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unipile_account_count ON linkedin_integrations;
CREATE TRIGGER trigger_update_unipile_account_count
  AFTER INSERT OR UPDATE OR DELETE ON linkedin_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_unipile_account_count();

-- ============================================================================
-- Function: Check if IMO can add more LinkedIn accounts
-- ============================================================================

CREATE OR REPLACE FUNCTION can_add_linkedin_account(p_imo_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
  v_enabled BOOLEAN;
BEGIN
  SELECT monthly_account_limit, current_account_count, linkedin_enabled
  INTO v_limit, v_count, v_enabled
  FROM unipile_config
  WHERE imo_id = p_imo_id;

  -- No config means not set up
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if LinkedIn is enabled and under limit
  RETURN v_enabled AND (v_count < v_limit);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION can_add_linkedin_account TO authenticated;

-- ============================================================================
-- Function: Get Unipile config for IMO (service role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unipile_config(p_imo_id UUID)
RETURNS TABLE (
  api_key_encrypted TEXT,
  dsn TEXT,
  webhook_secret TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.api_key_encrypted,
    uc.dsn,
    uc.webhook_secret
  FROM unipile_config uc
  WHERE uc.imo_id = p_imo_id;
END;
$$ LANGUAGE plpgsql;

-- Note: This function is called by edge functions with service role

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE unipile_config ENABLE ROW LEVEL SECURITY;

-- Only IMO admins can view config (without decrypted keys)
CREATE POLICY "unipile_config_select"
  ON unipile_config
  FOR SELECT
  USING (is_imo_admin_for(imo_id));

-- Only IMO admins can manage config
CREATE POLICY "unipile_config_insert"
  ON unipile_config
  FOR INSERT
  WITH CHECK (is_imo_admin_for(imo_id));

CREATE POLICY "unipile_config_update"
  ON unipile_config
  FOR UPDATE
  USING (is_imo_admin_for(imo_id));

CREATE POLICY "unipile_config_delete"
  ON unipile_config
  FOR DELETE
  USING (is_imo_admin_for(imo_id));

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON unipile_config TO authenticated;

COMMENT ON TABLE unipile_config IS 'Unipile API configuration per organization for LinkedIn messaging';
COMMENT ON COLUMN unipile_config.api_key_encrypted IS 'Encrypted Unipile API access token';
COMMENT ON COLUMN unipile_config.dsn IS 'Unipile Data Source Name for API calls';
COMMENT ON COLUMN unipile_config.monthly_account_limit IS 'Maximum LinkedIn accounts allowed based on Unipile plan';

-- ============================================================================
-- Additional helper function: Check LinkedIn access similar to Instagram
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_linkedin_access(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_has_config BOOLEAN;
BEGIN
  -- Get user's IMO
  SELECT imo_id INTO v_imo_id
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_imo_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if IMO has Unipile configured and LinkedIn enabled
  SELECT EXISTS (
    SELECT 1 FROM unipile_config
    WHERE imo_id = v_imo_id
      AND linkedin_enabled = true
  ) INTO v_has_config;

  RETURN v_has_config;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION user_has_linkedin_access TO authenticated;
