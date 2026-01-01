-- supabase/migrations/20260102_001_user_search_rpc.sql
-- Creates RPC for server-side user search (upline selection, etc.)

-- Search users for assignment (upline selection, recruiter assignment, etc.)
-- Supports filtering by roles, approval status, and exclusion of specific IDs
-- Uses server-side pagination with limit for scalability
CREATE OR REPLACE FUNCTION search_users_for_assignment(
  p_search_term TEXT DEFAULT '',
  p_roles TEXT[] DEFAULT NULL,
  p_approval_status TEXT DEFAULT 'approved',
  p_exclude_ids UUID[] DEFAULT NULL,
  p_limit INT DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  roles TEXT[],
  agent_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.first_name,
    up.last_name,
    up.email,
    up.roles::TEXT[],
    up.agent_status::TEXT
  FROM user_profiles up
  WHERE
    -- Approval status filter (null means any status)
    (p_approval_status IS NULL OR up.approval_status = p_approval_status)
    -- Role filter - user must have at least one of the specified roles
    AND (p_roles IS NULL OR up.roles && p_roles)
    -- Exclude specific IDs (for excluding self, downlines, etc.)
    AND (p_exclude_ids IS NULL OR up.id != ALL(p_exclude_ids))
    -- Exclude deleted users
    AND (up.is_deleted IS NULL OR up.is_deleted = false)
    -- Search filter - matches name or email (case-insensitive)
    AND (
      p_search_term = ''
      OR up.email ILIKE '%' || p_search_term || '%'
      OR (COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')) ILIKE '%' || p_search_term || '%'
    )
  ORDER BY
    -- Prioritize exact email prefix matches
    CASE WHEN p_search_term != '' AND up.email ILIKE p_search_term || '%' THEN 0 ELSE 1 END,
    -- Then by name alphabetically
    up.first_name NULLS LAST,
    up.last_name NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_for_assignment(TEXT, TEXT[], TEXT, UUID[], INT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_users_for_assignment IS
'Server-side search for user assignment (upline selection, recruiter assignment).
Supports filtering by roles, approval status, and ID exclusions.
Returns max p_limit results ordered by email match priority then alphabetically.';
