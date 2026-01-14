-- Migration: Custom Domains for Recruiting Pages
-- Enables users to connect their own subdomains (e.g., join.customer.com)
-- with DNS verification and Vercel provisioning

-- ============================================================================
-- 1. CREATE STATUS ENUM
-- ============================================================================

CREATE TYPE custom_domain_status AS ENUM (
  'draft',           -- Initial state, hostname entered but not submitted
  'pending_dns',     -- Awaiting DNS TXT verification
  'verified',        -- DNS verified, ready to provision on Vercel
  'provisioning',    -- Vercel API call in progress
  'active',          -- Domain is live and working
  'error'            -- Provisioning failed, can retry
);

-- ============================================================================
-- 2. CREATE CUSTOM_DOMAINS TABLE
-- ============================================================================

CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hostname is stored normalized (lowercase) and immutable after pending_dns
  hostname TEXT NOT NULL,

  -- Status managed by Edge Functions only (not direct PostgREST)
  status custom_domain_status NOT NULL DEFAULT 'draft',

  -- DNS Verification
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,

  -- Vercel provider data
  provider TEXT NOT NULL DEFAULT 'vercel',
  provider_domain_id TEXT,
  provider_metadata JSONB DEFAULT '{}',  -- Stores Vercel verification records, config status

  -- Error tracking
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_hostname UNIQUE (hostname),
  -- Subdomain format only: xxx.yyy.tld (at least 2 dots, no apex domains)
  CONSTRAINT hostname_subdomain_format CHECK (
    hostname ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?){2,}$'
  )
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Standard indexes
CREATE INDEX idx_custom_domains_imo_id ON custom_domains(imo_id);
CREATE INDEX idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX idx_custom_domains_hostname ON custom_domains(hostname);
CREATE INDEX idx_custom_domains_status ON custom_domains(status);

-- Partial index for fast active hostname lookup (used by public resolver)
CREATE INDEX idx_custom_domains_hostname_active
  ON custom_domains(hostname)
  WHERE status = 'active';

-- v1 Limit: One active domain per user (enforced via partial unique index)
CREATE UNIQUE INDEX idx_one_active_domain_per_user
  ON custom_domains(user_id)
  WHERE status = 'active';

-- ============================================================================
-- 4. CREATE HOSTNAME NORMALIZATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_custom_domain_hostname()
RETURNS TRIGGER AS $$
BEGIN
  -- Always normalize hostname to lowercase
  NEW.hostname := lower(NEW.hostname);

  -- Prevent hostname changes after leaving draft status
  IF TG_OP = 'UPDATE' AND OLD.status != 'draft' AND NEW.hostname != OLD.hostname THEN
    RAISE EXCEPTION 'Cannot change hostname after verification started';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_hostname_trigger
  BEFORE INSERT OR UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION normalize_custom_domain_hostname();

-- ============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER set_custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ENABLE RLS AND CREATE POLICIES
-- ============================================================================

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own domains only
CREATE POLICY "Users can view own domains"
  ON custom_domains FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert domains in their IMO (draft status only)
CREATE POLICY "Users can create draft domains"
  ON custom_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND imo_id = get_my_imo_id()
    AND status = 'draft'
  );

-- NO direct UPDATE policy - all status changes via Edge Functions using service_role
-- Users cannot update status directly through PostgREST

-- Users can delete draft/pending_dns/error domains (allows retry cleanup)
-- Active/provisioning domains must be deleted via Edge Function (to deprovision Vercel first)
CREATE POLICY "Users can delete non-active domains"
  ON custom_domains FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('draft', 'pending_dns', 'error')
  );

-- Super admins have full SELECT access for debugging
CREATE POLICY "Super admins can view all domains"
  ON custom_domains FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- ============================================================================
-- 7. CREATE SERVICE ROLE FUNCTIONS FOR EDGE FUNCTIONS
-- ============================================================================

-- Transition domain status (called by Edge Functions with service_role)
-- Enforces state machine transitions server-side
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
  UPDATE custom_domains SET
    status = p_new_status,
    verified_at = COALESCE(p_verified_at, verified_at),
    provider_domain_id = COALESCE(p_provider_domain_id, provider_domain_id),
    provider_metadata = COALESCE(p_provider_metadata, provider_metadata),
    last_error = p_last_error,
    updated_at = NOW()
  WHERE id = p_domain_id
  RETURNING * INTO v_domain;

  RETURN v_domain;
END;
$$;

-- Delete domain (called by Edge Function after Vercel cleanup)
CREATE OR REPLACE FUNCTION admin_delete_domain(
  p_domain_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM custom_domains
  WHERE id = p_domain_id AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Revoke execute from anon/authenticated (service_role only via Edge Functions)
REVOKE EXECUTE ON FUNCTION admin_update_domain_status FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_delete_domain FROM PUBLIC;

-- ============================================================================
-- 8. ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE custom_domains IS 'Custom subdomains for recruiting pages with DNS verification and Vercel provisioning. v1 supports subdomains only (e.g., join.customer.com).';
COMMENT ON COLUMN custom_domains.hostname IS 'Normalized lowercase subdomain (e.g., join.customer.com). Must have at least 2 dots. Immutable after draft status.';
COMMENT ON COLUMN custom_domains.status IS 'Domain lifecycle status. Transitions enforced server-side via admin_update_domain_status function.';
COMMENT ON COLUMN custom_domains.verification_token IS 'Cryptographically random token (32 bytes hex) for DNS TXT verification. User adds TXT record _thestandardhq-verify.{hostname} with this value.';
COMMENT ON COLUMN custom_domains.provider_metadata IS 'Vercel API response data including verification requirements and configuration status.';
COMMENT ON COLUMN custom_domains.last_error IS 'Last error message from verification or provisioning. Cleared on successful transition.';
