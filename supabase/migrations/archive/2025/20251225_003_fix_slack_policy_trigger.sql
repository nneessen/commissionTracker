-- supabase/migrations/20251225_003_fix_slack_policy_trigger.sql
-- Fix Slack policy trigger to work without app.settings configuration
-- Uses Supabase Vault for secure secret storage

-- ============================================================================
-- Drop old trigger and function
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_slack_on_policy_insert ON policies;
DROP FUNCTION IF EXISTS notify_slack_on_policy_insert();

-- ============================================================================
-- Create secrets in vault (run these manually in Supabase dashboard):
-- INSERT INTO vault.secrets (name, secret) VALUES ('supabase_url', 'https://xxx.supabase.co');
-- INSERT INTO vault.secrets (name, secret) VALUES ('supabase_service_key', 'eyJhbG...');
-- ============================================================================

-- ============================================================================
-- Function: Notify Slack on policy creation (async via pg_net)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_slack_on_policy_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_has_slack BOOLEAN;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get IMO ID from policy
  v_imo_id := NEW.imo_id;

  -- Skip if no IMO
  IF v_imo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if IMO has active Slack integration with policy_created configs
  SELECT EXISTS (
    SELECT 1
    FROM slack_integrations si
    JOIN slack_channel_configs scc ON scc.slack_integration_id = si.id
    WHERE si.imo_id = v_imo_id
    AND si.is_active = true
    AND si.connection_status = 'connected'
    AND scc.notification_type = 'policy_created'
    AND scc.is_active = true
  ) INTO v_has_slack;

  -- Skip if no active Slack integration with policy configs
  IF NOT v_has_slack THEN
    RETURN NEW;
  END IF;

  -- Try to get secrets from vault
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_key';
  EXCEPTION
    WHEN OTHERS THEN
      -- Vault not available or secrets not set
      RAISE LOG 'Slack notification skipped: vault secrets not configured';
      RETURN NEW;
  END;

  -- If secrets not available, skip
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE LOG 'Slack notification skipped: missing vault secrets (supabase_url or supabase_service_key)';
    RETURN NEW;
  END IF;

  -- Queue the HTTP request to the edge function using pg_net
  -- This is async and non-blocking
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/slack-policy-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'policyId', NEW.id::text,
      'policyNumber', COALESCE(NEW.policy_number, ''),
      'carrierId', NEW.carrier_id::text,
      'productId', NEW.product_id::text,
      'agentId', NEW.user_id::text,
      'annualPremium', COALESCE(NEW.annual_premium, 0),
      'effectiveDate', COALESCE(NEW.effective_date::text, ''),
      'status', COALESCE(NEW.status, ''),
      'imoId', v_imo_id::text,
      'agencyId', NEW.agency_id::text
    )
  ) INTO v_request_id;

  RAISE LOG 'Slack notification queued for policy % (request_id: %)', NEW.id, v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE LOG 'Slack notification error for policy %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Recreate trigger
-- ============================================================================

CREATE TRIGGER trigger_notify_slack_on_policy_insert
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION notify_slack_on_policy_insert();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION notify_slack_on_policy_insert() IS
'Sends an async HTTP request to slack-policy-notification edge function when a new policy is created.
Requires vault secrets: supabase_url, supabase_service_key
The edge function handles Slack message formatting and posting.
This function is non-blocking - errors are logged but do not affect policy creation.

SETUP: Run these in Supabase SQL editor to configure vault secrets:
  INSERT INTO vault.secrets (name, secret) VALUES (''supabase_url'', ''https://YOUR-PROJECT.supabase.co'');
  INSERT INTO vault.secrets (name, secret) VALUES (''supabase_service_key'', ''YOUR-SERVICE-ROLE-KEY'');
';
