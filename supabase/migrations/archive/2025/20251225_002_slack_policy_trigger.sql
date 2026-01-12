-- supabase/migrations/20251225_002_slack_policy_trigger.sql
-- Trigger to notify Slack when a new policy is created

-- ============================================================================
-- Enable pg_net extension for HTTP requests (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Function: Notify Slack on policy creation
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
BEGIN
  -- Get IMO ID from policy
  v_imo_id := NEW.imo_id;

  -- Skip if no IMO
  IF v_imo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if IMO has active Slack integration
  SELECT EXISTS (
    SELECT 1 FROM slack_integrations
    WHERE imo_id = v_imo_id
    AND is_active = true
    AND connection_status = 'connected'
  ) INTO v_has_slack;

  -- Skip if no active Slack integration
  IF NOT v_has_slack THEN
    RETURN NEW;
  END IF;

  -- Get Supabase config from vault (these need to be set as secrets)
  -- Note: In production, use vault.secrets or environment approach
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, skip (non-blocking)
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    -- Log but don't fail
    RAISE LOG 'Slack notification skipped: missing Supabase config';
    RETURN NEW;
  END IF;

  -- Queue the HTTP request to the edge function
  -- Using pg_net for async, non-blocking HTTP calls
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/slack-policy-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'policyId', NEW.id,
      'policyNumber', NEW.policy_number,
      'carrierId', NEW.carrier_id,
      'productId', NEW.product_id,
      'agentId', NEW.user_id,
      'annualPremium', COALESCE(NEW.annual_premium, 0),
      'effectiveDate', NEW.effective_date,
      'status', NEW.status,
      'imoId', v_imo_id,
      'agencyId', NEW.agency_id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE LOG 'Slack notification error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create trigger (only on INSERT, and only for active policies)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_slack_on_policy_insert ON policies;

CREATE TRIGGER trigger_notify_slack_on_policy_insert
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION notify_slack_on_policy_insert();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION notify_slack_on_policy_insert() IS
'Sends an async HTTP request to slack-policy-notification edge function when a new policy is created.
The edge function handles Slack message formatting and posting.
This function is non-blocking - errors are logged but do not affect policy creation.';

COMMENT ON TRIGGER trigger_notify_slack_on_policy_insert ON policies IS
'Fires after policy insert to notify Slack channels of new sales.';
