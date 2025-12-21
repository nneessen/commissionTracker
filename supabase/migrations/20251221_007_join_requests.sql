-- =====================================================
-- Join Request System Migration
-- =====================================================
-- Allows new users to request joining an IMO/agency.
-- Requests are routed to the appropriate approver:
--   1. If upline specified → upline approves
--   2. If agency specified → agency owner approves
--   3. Otherwise → IMO admin approves
--
-- On approval, sets user's imo_id, agency_id, upline_id,
-- and approval_status.
-- =====================================================

-- =====================================================
-- 1. Helper Function: Find IMO Admin
-- =====================================================

CREATE OR REPLACE FUNCTION get_imo_admin(p_imo_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Find the first user with imo_owner or imo_admin role in this IMO
  SELECT id INTO v_admin_id
  FROM user_profiles
  WHERE imo_id = p_imo_id
    AND ('imo_owner' = ANY(roles) OR 'imo_admin' = ANY(roles))
  ORDER BY
    CASE WHEN 'imo_owner' = ANY(roles) THEN 0 ELSE 1 END, -- Prefer owner
    created_at ASC  -- Then oldest
  LIMIT 1;

  -- Fallback to super admin if no IMO admin found
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id
    FROM user_profiles
    WHERE is_super_admin = true
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_admin_id;
END;
$$;

COMMENT ON FUNCTION get_imo_admin IS 'Returns the admin user for a given IMO. Prefers imo_owner, then imo_admin, then falls back to super_admin.';

-- =====================================================
-- 2. Create join_requests Table
-- =====================================================

CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester (the new user wanting to join)
  requester_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Target organization
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  requested_upline_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Resolved approver (set by trigger/function)
  approver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  -- Context
  message TEXT,           -- "Why I want to join"
  rejection_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_join_requests_requester ON join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_approver ON join_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_imo ON join_requests(imo_id);

-- Unique: only one pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_join_requests_pending_unique
  ON join_requests(requester_id)
  WHERE status = 'pending';

-- Updated_at trigger
CREATE OR REPLACE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE join_requests IS 'Tracks new user requests to join an IMO/agency, requiring approval from appropriate person.';

-- =====================================================
-- 3. RLS Policies for join_requests
-- =====================================================

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view their own requests
CREATE POLICY "Requesters can view own requests" ON join_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Approvers can view requests they need to approve
CREATE POLICY "Approvers can view assigned requests" ON join_requests
  FOR SELECT TO authenticated
  USING (approver_id = auth.uid());

-- Users can create requests (self only, pending status)
CREATE POLICY "Users can create own requests" ON join_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND status = 'pending'
  );

-- Requesters can cancel their pending requests
CREATE POLICY "Requesters can cancel pending requests" ON join_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Approvers can only reject (approval goes through RPC function)
CREATE POLICY "Approvers can reject pending requests" ON join_requests
  FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    status = 'rejected'
  );

-- Super admins can view all requests
CREATE POLICY "Super admins can view all join requests" ON join_requests
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- IMO admins can view requests for their IMO
CREATE POLICY "IMO admins can view IMO join requests" ON join_requests
  FOR SELECT TO authenticated
  USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =====================================================
-- 4. Approval Function (transactional)
-- =====================================================

CREATE OR REPLACE FUNCTION approve_join_request(
  p_request_id UUID,
  p_agency_id UUID DEFAULT NULL,  -- Override agency if approver wants
  p_upline_id UUID DEFAULT NULL   -- Override upline if approver wants
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_current_user_id UUID;
  v_final_agency_id UUID;
  v_final_upline_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get and lock the request
  SELECT * INTO v_request
  FROM join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (current status: %)', v_request.status;
  END IF;

  IF v_request.approver_id != v_current_user_id THEN
    -- Also allow super admins to approve
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = v_current_user_id AND is_super_admin = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to approve this request';
    END IF;
  END IF;

  -- Determine final agency_id and upline_id
  -- Priority: parameter override > request value > NULL
  v_final_agency_id := COALESCE(p_agency_id, v_request.agency_id);
  v_final_upline_id := COALESCE(p_upline_id, v_request.requested_upline_id);

  -- If upline specified but no agency, inherit upline's agency
  IF v_final_upline_id IS NOT NULL AND v_final_agency_id IS NULL THEN
    SELECT agency_id INTO v_final_agency_id
    FROM user_profiles
    WHERE id = v_final_upline_id;
  END IF;

  -- Update the requester's profile
  UPDATE user_profiles
  SET
    imo_id = v_request.imo_id,
    agency_id = v_final_agency_id,
    upline_id = v_final_upline_id,
    approval_status = 'approved',
    approved_at = now(),
    updated_at = now()
  WHERE id = v_request.requester_id;

  -- Update the request as approved
  UPDATE join_requests
  SET
    status = 'approved',
    agency_id = v_final_agency_id,
    requested_upline_id = v_final_upline_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RAISE NOTICE 'Join request approved: user % joined IMO % (agency: %, upline: %)',
    v_request.requester_id, v_request.imo_id, v_final_agency_id, v_final_upline_id;
END;
$$;

COMMENT ON FUNCTION approve_join_request IS 'Approves a join request: sets the user imo_id, agency_id, upline_id, and approval_status. Approver can optionally override agency and upline.';

-- =====================================================
-- 5. Reject Function
-- =====================================================

CREATE OR REPLACE FUNCTION reject_join_request(
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
  FROM join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (current status: %)', v_request.status;
  END IF;

  IF v_request.approver_id != v_current_user_id THEN
    -- Also allow super admins to reject
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = v_current_user_id AND is_super_admin = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to reject this request';
    END IF;
  END IF;

  -- Update the request as rejected
  UPDATE join_requests
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
END;
$$;

COMMENT ON FUNCTION reject_join_request IS 'Rejects a join request with optional reason. Must be called by the approver or super admin.';

-- =====================================================
-- 6. Helper: Resolve Approver for Join Request
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_join_request_approver(
  p_imo_id UUID,
  p_agency_id UUID DEFAULT NULL,
  p_upline_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id UUID;
BEGIN
  -- Priority 1: If upline specified, they approve
  IF p_upline_id IS NOT NULL THEN
    RETURN p_upline_id;
  END IF;

  -- Priority 2: If agency specified, agency owner approves
  IF p_agency_id IS NOT NULL THEN
    SELECT owner_id INTO v_approver_id
    FROM agencies
    WHERE id = p_agency_id;

    IF v_approver_id IS NOT NULL THEN
      RETURN v_approver_id;
    END IF;
  END IF;

  -- Priority 3: IMO admin approves
  v_approver_id := get_imo_admin(p_imo_id);

  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'No approver found for IMO %', p_imo_id;
  END IF;

  RETURN v_approver_id;
END;
$$;

COMMENT ON FUNCTION resolve_join_request_approver IS 'Determines the approver for a join request based on upline > agency owner > IMO admin priority.';

-- =====================================================
-- 7. Trigger: Auto-set Approver on Insert
-- =====================================================

CREATE OR REPLACE FUNCTION set_join_request_approver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resolve approver if not already set
  IF NEW.approver_id IS NULL THEN
    NEW.approver_id := resolve_join_request_approver(
      NEW.imo_id,
      NEW.agency_id,
      NEW.requested_upline_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_join_request_approver_trigger
  BEFORE INSERT ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_join_request_approver();

-- =====================================================
-- 8. Get Pending Count for Approver
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_join_request_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM join_requests
    WHERE approver_id = auth.uid()
    AND status = 'pending'
  );
END;
$$;

COMMENT ON FUNCTION get_pending_join_request_count IS 'Returns count of pending join requests awaiting approval by current user.';

-- =====================================================
-- 9. Check if User Can Submit Join Request
-- =====================================================

CREATE OR REPLACE FUNCTION can_submit_join_request()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_pending BOOLEAN;
  v_already_approved BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user already has a pending request
  SELECT EXISTS(
    SELECT 1 FROM join_requests
    WHERE requester_id = v_user_id
    AND status = 'pending'
  ) INTO v_has_pending;

  IF v_has_pending THEN
    RETURN FALSE;
  END IF;

  -- Check if user is already approved with an IMO
  SELECT EXISTS(
    SELECT 1 FROM user_profiles
    WHERE id = v_user_id
    AND approval_status = 'approved'
    AND imo_id IS NOT NULL
  ) INTO v_already_approved;

  IF v_already_approved THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION can_submit_join_request IS 'Returns true if current user can submit a join request (no pending request, not already approved with IMO).';

-- =====================================================
-- 10. List Available IMOs for Join Request
-- =====================================================

CREATE OR REPLACE FUNCTION get_available_imos_for_join()
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.name, i.code, i.description
  FROM imos i
  WHERE i.is_active = true
  ORDER BY i.name;
END;
$$;

COMMENT ON FUNCTION get_available_imos_for_join IS 'Returns list of active IMOs that users can request to join.';

-- =====================================================
-- 11. List Agencies in IMO for Join Request
-- =====================================================

CREATE OR REPLACE FUNCTION get_agencies_for_join(p_imo_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name, a.code, a.description
  FROM agencies a
  WHERE a.imo_id = p_imo_id
    AND a.is_active = true
  ORDER BY a.name;
END;
$$;

COMMENT ON FUNCTION get_agencies_for_join IS 'Returns list of active agencies in an IMO that users can request to join.';
