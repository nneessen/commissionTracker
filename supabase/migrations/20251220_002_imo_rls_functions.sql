-- =============================================================================
-- Multi-IMO RLS Helper Functions
-- =============================================================================
-- These SECURITY DEFINER functions provide safe access to IMO context
-- for use in RLS policies across all tables.
-- =============================================================================

-- =============================================================================
-- 1. Get current user's IMO ID
-- =============================================================================
CREATE OR REPLACE FUNCTION get_my_imo_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT imo_id FROM user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_my_imo_id() TO authenticated;

COMMENT ON FUNCTION get_my_imo_id IS 'Returns the IMO ID of the currently authenticated user. Used for RLS policies to enforce tenant isolation.';

-- =============================================================================
-- 2. Get current user's Agency ID
-- =============================================================================
CREATE OR REPLACE FUNCTION get_my_agency_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT agency_id FROM user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_my_agency_id() TO authenticated;

COMMENT ON FUNCTION get_my_agency_id IS 'Returns the Agency ID of the currently authenticated user. Used for RLS policies to enforce agency-level hierarchy scope.';

-- =============================================================================
-- 3. Check if user is IMO admin/owner
-- =============================================================================
CREATE OR REPLACE FUNCTION is_imo_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      'imo_owner' = ANY(roles) OR
      'imo_admin' = ANY(roles) OR
      is_super_admin = true
    )
  );
$$;

GRANT EXECUTE ON FUNCTION is_imo_admin() TO authenticated;

COMMENT ON FUNCTION is_imo_admin IS 'Returns true if the current user is an IMO owner, IMO admin, or super admin. Used for RLS policies.';

-- =============================================================================
-- 4. Check if user is agency owner
-- =============================================================================
CREATE OR REPLACE FUNCTION is_agency_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agencies
    WHERE owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_agency_owner() TO authenticated;

COMMENT ON FUNCTION is_agency_owner IS 'Returns true if the current user owns any agency. Used for RLS policies.';

-- =============================================================================
-- 5. Check if user is agency owner of a specific agency
-- =============================================================================
CREATE OR REPLACE FUNCTION is_agency_owner_of(target_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agencies
    WHERE id = target_agency_id
    AND owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_agency_owner_of(UUID) TO authenticated;

COMMENT ON FUNCTION is_agency_owner_of IS 'Returns true if the current user owns the specified agency.';

-- =============================================================================
-- 6. UPDATED: is_upline_of with agency check (replaces existing function)
-- =============================================================================
-- This is critical for multi-agency support: hierarchy is now per-agency,
-- so an upline can only see downlines within their own agency.

CREATE OR REPLACE FUNCTION is_upline_of(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if the current user's ID appears in the target user's hierarchy_path
  -- AND both users are in the same agency (hierarchy is per-agency)
  SELECT EXISTS (
    SELECT 1 FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    WHERE target.id = target_user_id
    -- CRITICAL: Must be in the same agency for hierarchy to apply
    AND target.agency_id IS NOT NULL
    AND target.agency_id = me.agency_id
    -- Check upline relationship via hierarchy_path
    AND target.hierarchy_path IS NOT NULL
    AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
    -- Don't count self as upline
    AND target.id != auth.uid()
  );
$$;

-- Grant is already in place but we re-grant to be safe
GRANT EXECUTE ON FUNCTION is_upline_of(uuid) TO authenticated;

COMMENT ON FUNCTION is_upline_of IS 'SECURITY DEFINER function to check if current user is an upline of the target user. IMPORTANT: Now enforces same-agency requirement - hierarchy is per-agency.';

-- =============================================================================
-- 7. Check if two users are in the same IMO
-- =============================================================================
CREATE OR REPLACE FUNCTION is_same_imo(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    WHERE target.id = target_user_id
    AND target.imo_id IS NOT NULL
    AND target.imo_id = me.imo_id
  );
$$;

GRANT EXECUTE ON FUNCTION is_same_imo(UUID) TO authenticated;

COMMENT ON FUNCTION is_same_imo IS 'Returns true if the target user is in the same IMO as the current user.';

-- =============================================================================
-- 8. Check if two users are in the same agency
-- =============================================================================
CREATE OR REPLACE FUNCTION is_same_agency(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    WHERE target.id = target_user_id
    AND target.agency_id IS NOT NULL
    AND target.agency_id = me.agency_id
  );
$$;

GRANT EXECUTE ON FUNCTION is_same_agency(UUID) TO authenticated;

COMMENT ON FUNCTION is_same_agency IS 'Returns true if the target user is in the same agency as the current user.';
