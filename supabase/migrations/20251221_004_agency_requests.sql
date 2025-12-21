-- =====================================================
-- Agency Request Workflow Migration
-- =====================================================
-- Adds support for agents to request becoming an agency
-- with upline approval workflow.
--
-- Key changes:
-- 1. Add parent_agency_id to agencies (agency hierarchy)
-- 2. Create agency_requests table
-- 3. RLS policies for agency_requests
-- 4. approve_agency_request() function
-- =====================================================

-- =====================================================
-- 1. Add parent_agency_id to agencies table
-- =====================================================

ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS parent_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agencies_parent ON agencies(parent_agency_id);

COMMENT ON COLUMN agencies.parent_agency_id IS 'Parent agency in the MLM hierarchy. When an agent becomes an agency, their new agency has parent = their previous agency.';

-- =====================================================
-- 2. Create agency_requests table
-- =====================================================

CREATE TABLE IF NOT EXISTS agency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester (the agent wanting to become an agency)
  requester_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Approver (the agent's direct upline)
  approver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- IMO context (inherited from requester)
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Current agency (before becoming own agency)
  current_agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Proposed agency details
  proposed_name TEXT NOT NULL,
  proposed_code TEXT NOT NULL,
  proposed_description TEXT,

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  -- If approved, link to created agency
  created_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- Rejection reason (if rejected)
  rejection_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_requests_requester ON agency_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_agency_requests_approver ON agency_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_agency_requests_status ON agency_requests(status);
CREATE INDEX IF NOT EXISTS idx_agency_requests_imo ON agency_requests(imo_id);

-- Unique: only one pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_requests_pending_unique
  ON agency_requests(requester_id)
  WHERE status = 'pending';

-- Updated_at trigger
CREATE OR REPLACE TRIGGER update_agency_requests_updated_at
  BEFORE UPDATE ON agency_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agency_requests IS 'Tracks agent requests to become an agency, requiring upline approval.';

-- =====================================================
-- 3. RLS Policies for agency_requests
-- =====================================================

ALTER TABLE agency_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view their own requests
CREATE POLICY "Requesters can view own requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Approvers can view requests they need to approve
CREATE POLICY "Approvers can view pending requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (approver_id = auth.uid());

-- Agents can create requests (self only)
CREATE POLICY "Agents can create own requests" ON agency_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Requesters can cancel their pending requests
CREATE POLICY "Requesters can cancel pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Approvers can approve/reject pending requests
CREATE POLICY "Approvers can review pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (status IN ('approved', 'rejected'));

-- Super admins can view all requests
CREATE POLICY "Super admins can view all agency requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- IMO admins can view requests in their IMO
CREATE POLICY "IMO admins can view IMO agency requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =====================================================
-- 4. Approval Function (transactional)
-- =====================================================

CREATE OR REPLACE FUNCTION approve_agency_request(
  p_request_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_new_agency_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get and lock the request
  SELECT * INTO v_request
  FROM agency_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (current status: %)', v_request.status;
  END IF;

  IF v_request.approver_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized to approve this request';
  END IF;

  -- Validate agency code is still available
  IF EXISTS (
    SELECT 1 FROM agencies
    WHERE imo_id = v_request.imo_id
    AND code = v_request.proposed_code
  ) THEN
    RAISE EXCEPTION 'Agency code "%" is already in use', v_request.proposed_code;
  END IF;

  -- Create the new agency
  INSERT INTO agencies (
    imo_id,
    name,
    code,
    description,
    owner_id,
    parent_agency_id,
    is_active
  ) VALUES (
    v_request.imo_id,
    v_request.proposed_name,
    v_request.proposed_code,
    v_request.proposed_description,
    v_request.requester_id,
    v_request.current_agency_id,
    true
  ) RETURNING id INTO v_new_agency_id;

  -- Update the requester's agency_id to their new agency
  UPDATE user_profiles
  SET agency_id = v_new_agency_id,
      updated_at = now()
  WHERE id = v_request.requester_id;

  -- Move all downline agents to the new agency
  -- (agents whose hierarchy_path contains the requester's ID)
  UPDATE user_profiles
  SET agency_id = v_new_agency_id,
      updated_at = now()
  WHERE hierarchy_path LIKE '%' || v_request.requester_id::text || '%'
    AND id != v_request.requester_id;

  -- Add agency_owner role to the requester if not already present
  UPDATE user_profiles
  SET roles = array_append(
    COALESCE(roles, ARRAY[]::text[]),
    'agency_owner'
  ),
  updated_at = now()
  WHERE id = v_request.requester_id
    AND NOT ('agency_owner' = ANY(COALESCE(roles, ARRAY[]::text[])));

  -- Update the request as approved
  UPDATE agency_requests
  SET
    status = 'approved',
    created_agency_id = v_new_agency_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN v_new_agency_id;
END;
$$;

COMMENT ON FUNCTION approve_agency_request IS 'Approves an agency request: creates the new agency, moves the requester and their downline to it, and grants agency_owner role. Must be called by the request approver.';

-- =====================================================
-- 5. Reject Function (for consistency)
-- =====================================================

CREATE OR REPLACE FUNCTION reject_agency_request(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get and lock the request
  SELECT * INTO v_request
  FROM agency_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (current status: %)', v_request.status;
  END IF;

  IF v_request.approver_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized to reject this request';
  END IF;

  -- Update the request as rejected
  UPDATE agency_requests
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
END;
$$;

COMMENT ON FUNCTION reject_agency_request IS 'Rejects an agency request with optional reason. Must be called by the request approver.';

-- =====================================================
-- 6. Helper function to check if user can request agency
-- =====================================================

CREATE OR REPLACE FUNCTION can_request_agency()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_upline_id UUID;
  v_has_pending BOOLEAN;
  v_already_owner BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has an upline (required for approval)
  SELECT upline_id INTO v_upline_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_upline_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user already has a pending request
  SELECT EXISTS(
    SELECT 1 FROM agency_requests
    WHERE requester_id = v_user_id
    AND status = 'pending'
  ) INTO v_has_pending;

  IF v_has_pending THEN
    RETURN FALSE;
  END IF;

  -- Check if user already owns an agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE owner_id = v_user_id
    AND is_active = true
  ) INTO v_already_owner;

  IF v_already_owner THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION can_request_agency IS 'Returns true if current user can submit an agency request (has upline, no pending request, not already an agency owner).';

-- =====================================================
-- 7. Get pending approval count for sidebar badge
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_agency_request_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM agency_requests
    WHERE approver_id = auth.uid()
    AND status = 'pending'
  );
END;
$$;

COMMENT ON FUNCTION get_pending_agency_request_count IS 'Returns count of pending agency requests awaiting approval by current user.';
