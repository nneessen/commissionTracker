-- Migration: Fix high-risk issues in custom_domains
-- Addresses code review findings:
-- 1. Add 'verified' status to DELETE policy (users can clean up verified domains)
-- 2. Improve hostname validation (reject single-char labels, numeric-only patterns)
-- 3. Clear last_error on success transitions (prevent stale error messages)

-- ============================================================================
-- 1. FIX DELETE POLICY - Add 'verified' status
-- ============================================================================
-- Users should be able to delete verified domains that haven't been provisioned yet
-- (no Vercel resources to clean up)

DROP POLICY IF EXISTS "Users can delete non-active domains" ON custom_domains;

CREATE POLICY "Users can delete non-active domains"
  ON custom_domains FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('draft', 'pending_dns', 'verified', 'error')
  );

COMMENT ON POLICY "Users can delete non-active domains" ON custom_domains IS
  'Users can delete domains in draft, pending_dns, verified, or error states. Active/provisioning domains must be deleted via Edge Function to ensure Vercel cleanup.';

-- ============================================================================
-- 2. IMPROVE HOSTNAME VALIDATION
-- ============================================================================
-- The original regex allowed dangerously short labels (e.g., a.b.c) and
-- numeric-only patterns that could be confused with IPs.
--
-- New validation requirements:
-- - Each label must be at least 2 characters
-- - Cannot be all numeric (to avoid IP confusion)
-- - Must have at least 2 dots (subdomain requirement for v1)
-- - Max 253 chars total, max 63 chars per label (DNS limits)
--
-- We'll use a CHECK constraint for basic format and rely on Edge Function
-- for comprehensive validation (hostname length, no reserved domains, etc.)

-- Drop the old constraint
ALTER TABLE custom_domains DROP CONSTRAINT IF EXISTS hostname_subdomain_format;

-- Add improved constraint:
-- - Starts with alphanumeric
-- - Labels are 2-63 chars of alphanumeric and hyphens (no leading/trailing hyphens)
-- - At least 3 labels (2 dots minimum for subdomain)
-- - Total length checked in Edge Function (253 char limit)
ALTER TABLE custom_domains ADD CONSTRAINT hostname_subdomain_format CHECK (
  -- Basic format: alphanumeric labels separated by dots, at least 3 labels
  hostname ~ '^[a-z0-9][a-z0-9-]{0,61}[a-z0-9](\.[a-z0-9][a-z0-9-]{0,61}[a-z0-9]){2,}$'
  -- Reject pure numeric labels in first segment (prevents IP-like patterns)
  AND hostname !~ '^[0-9]+\.'
);

COMMENT ON CONSTRAINT hostname_subdomain_format ON custom_domains IS
  'Validates subdomain format: 2+ char alphanumeric labels, at least 3 labels (2 dots), no IP-like patterns. Edge Function performs additional validation (length limits, reserved domains).';

-- ============================================================================
-- 3. FIX admin_update_domain_status TO CLEAR last_error ON SUCCESS
-- ============================================================================
-- Previously, last_error could persist after successful retries if the caller
-- didn't explicitly pass NULL. Now we clear it automatically on non-error transitions.

CREATE OR REPLACE FUNCTION admin_update_domain_status(
  p_domain_id UUID,
  p_user_id UUID,
  p_new_status custom_domain_status,
  p_verified_at TIMESTAMPTZ DEFAULT NULL,
  p_provider_domain_id TEXT DEFAULT NULL,
  p_provider_metadata JSONB DEFAULT NULL,
  p_last_error TEXT DEFAULT NULL
)
RETURNS custom_domains
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_domain custom_domains;
  v_old_status custom_domain_status;
BEGIN
  -- Fetch current domain and verify ownership
  SELECT * INTO v_domain
  FROM custom_domains
  WHERE id = p_domain_id AND user_id = p_user_id;

  IF v_domain IS NULL THEN
    RAISE EXCEPTION 'Domain not found or access denied';
  END IF;

  v_old_status := v_domain.status;

  -- Enforce state machine transitions:
  -- draft -> pending_dns
  -- pending_dns -> verified | error
  -- verified -> provisioning | error
  -- provisioning -> active | error
  -- error -> pending_dns (retry)
  IF NOT (
    (v_old_status = 'draft' AND p_new_status = 'pending_dns') OR
    (v_old_status = 'pending_dns' AND p_new_status IN ('verified', 'error')) OR
    (v_old_status = 'verified' AND p_new_status IN ('provisioning', 'error')) OR
    (v_old_status = 'provisioning' AND p_new_status IN ('active', 'error')) OR
    (v_old_status = 'error' AND p_new_status = 'pending_dns') -- Allow retry
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, p_new_status;
  END IF;

  -- Perform update
  -- Key fix: Clear last_error on successful transitions (non-error states)
  UPDATE custom_domains SET
    status = p_new_status,
    verified_at = COALESCE(p_verified_at, verified_at),
    provider_domain_id = COALESCE(p_provider_domain_id, provider_domain_id),
    provider_metadata = COALESCE(p_provider_metadata, provider_metadata),
    -- Clear last_error on success, set it on error
    last_error = CASE
      WHEN p_new_status = 'error' THEN p_last_error
      ELSE NULL  -- Clear stale errors on successful transitions
    END,
    updated_at = NOW()
  WHERE id = p_domain_id
  RETURNING * INTO v_domain;

  RETURN v_domain;
END;
$$;

COMMENT ON FUNCTION admin_update_domain_status IS
  'Transitions domain status with state machine enforcement. Clears last_error on successful transitions. Called by Edge Functions with service_role only.';

-- Ensure permissions remain restricted
REVOKE EXECUTE ON FUNCTION admin_update_domain_status FROM PUBLIC;

-- ============================================================================
-- 4. ADD COMPOSITE INDEX FOR RLS DELETE PERFORMANCE
-- ============================================================================
-- The DELETE policy checks (user_id, status), so a composite index helps

CREATE INDEX IF NOT EXISTS idx_custom_domains_user_status
  ON custom_domains(user_id, status);

COMMENT ON INDEX idx_custom_domains_user_status IS
  'Composite index for RLS DELETE policy performance: WHERE user_id = auth.uid() AND status IN (...)';
