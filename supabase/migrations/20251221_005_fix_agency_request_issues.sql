-- =====================================================
-- Agency Request Fixes Migration
-- =====================================================
-- Addresses code review issues:
-- 1. CRITICAL: Fix hierarchy_path LIKE pattern (wrong UUID matching)
-- 2. HIGH: Fix RLS policy gap (prevent direct field manipulation)
-- 3. HIGH: Add unique constraint on pending codes (race condition)
-- =====================================================

-- =====================================================
-- 1. Fix RLS Policy - Prevent Direct Field Manipulation
-- =====================================================
-- Approvers could previously set created_agency_id directly,
-- bypassing the approve_agency_request() function.
-- Now approvers can only REJECT through direct UPDATE.
-- Approvals must go through the SECURITY DEFINER function.

DROP POLICY IF EXISTS "Approvers can review pending requests" ON agency_requests;

CREATE POLICY "Approvers can reject pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    status = 'rejected'
    AND created_agency_id IS NULL
  );

-- =====================================================
-- 2. Add Unique Constraint on Pending Codes
-- =====================================================
-- Prevents race condition where two users could submit
-- the same agency code simultaneously.

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_requests_pending_code_unique
  ON agency_requests(imo_id, proposed_code)
  WHERE status = 'pending';

-- =====================================================
-- 3. Fix approve_agency_request Function
-- =====================================================
-- hierarchy_path uses '.' as delimiter (e.g., "parent.child.grandchild")
-- The old LIKE pattern could match partial UUIDs.
-- New pattern correctly matches complete UUIDs using delimiters.

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
  v_requester_id_text TEXT;
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
  -- FIXED: Use proper delimiter matching for hierarchy_path
  -- hierarchy_path format: "uuid1.uuid2.uuid3" (dot-separated)
  v_requester_id_text := v_request.requester_id::text;

  UPDATE user_profiles
  SET agency_id = v_new_agency_id,
      updated_at = now()
  WHERE (
    -- ID appears at the start of path (e.g., "requester.child")
    hierarchy_path LIKE v_requester_id_text || '.%'
    -- ID appears in the middle (e.g., "parent.requester.child")
    OR hierarchy_path LIKE '%.' || v_requester_id_text || '.%'
    -- ID appears at the end (e.g., "parent.requester")
    OR hierarchy_path LIKE '%.' || v_requester_id_text
    -- Exact match (single user in path)
    OR hierarchy_path = v_requester_id_text
  )
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
