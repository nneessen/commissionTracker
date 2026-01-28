-- supabase/migrations/20260128134836_fix_slack_trigger_remove_submit_date.sql
-- Fix: Remove submit_date check since that column doesn't exist
-- The previous migration (20260128133905) referenced a non-existent column

-- ============================================================================
-- Recreate trigger function without submit_date check
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_slack_on_policy_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_agency_id UUID;
  v_has_slack BOOLEAN;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get IMO ID and Agency ID from policy
  v_imo_id := NEW.imo_id;
  v_agency_id := NEW.agency_id;

  -- Skip if no IMO
  IF v_imo_id IS NULL THEN
    RAISE LOG 'Slack notification skipped: no imo_id on policy %', NEW.id;
    RETURN NEW;
  END IF;

  -- Check if there are ANY active Slack integrations with policy_channel_id set
  -- This checks:
  -- 1. IMO-level integrations (agency_id IS NULL)
  -- 2. Agency-level integrations (if agency_id matches policy's agency)
  -- 3. OR any integration in the agency hierarchy (parent agencies)
  SELECT EXISTS (
    SELECT 1
    FROM slack_integrations si
    WHERE si.imo_id = v_imo_id
      AND si.is_active = true
      AND si.connection_status = 'connected'
      AND si.policy_channel_id IS NOT NULL
      AND (
        -- IMO-level integration (applies to all agencies)
        si.agency_id IS NULL
        OR
        -- Agency-specific integration (check hierarchy if we have agency_id)
        (v_agency_id IS NOT NULL AND si.agency_id IN (
          SELECT h.agency_id FROM get_agency_hierarchy(v_agency_id) h
        ))
      )
  ) INTO v_has_slack;

  -- Skip if no active Slack integration with policy channel configured
  IF NOT v_has_slack THEN
    RAISE LOG 'Slack notification skipped for policy %: no active integration with policy_channel_id', NEW.id;
    RETURN NEW;
  END IF;

  -- Get config values from app_config table
  BEGIN
    SELECT value INTO v_supabase_url
    FROM app_config
    WHERE key = 'supabase_project_url';

    SELECT value INTO v_service_role_key
    FROM app_config
    WHERE key = 'supabase_service_role_key';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Slack notification skipped: app_config error: %', SQLERRM;
      RETURN NEW;
  END;

  -- If config not available, skip
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE LOG 'Slack notification skipped: missing app_config values (supabase_project_url or supabase_service_role_key)';
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
      'agencyId', v_agency_id::text
    )
  ) INTO v_request_id;

  RAISE LOG 'Slack notification queued for policy % (agency: %, request_id: %)', NEW.id, v_agency_id, v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE LOG 'Slack notification error for policy %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update function comment
-- ============================================================================

COMMENT ON FUNCTION notify_slack_on_policy_insert() IS
'Sends an async HTTP request to slack-policy-notification edge function when a new policy is created.

UPDATED (2026-01-28): Removed submit_date check - column does not exist.
TODO: Add date filtering once requirements are clarified (effective_date vs new submit_date column).

Requires app_config values: supabase_project_url, supabase_service_role_key
The edge function handles Slack message formatting and posting.
This function is non-blocking - errors are logged but do not affect policy creation.';
