-- Migration: Fix issues identified in code review
-- 1. Fix NULL safety in owner_name concatenation
-- 2. Make orphaned client exclusion explicit
-- 3. Add trigram index for hierarchy_path LIKE queries

-- ============================================================================
-- 1. Add trigram extension for efficient LIKE queries
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index on hierarchy_path for efficient LIKE '%uuid%' queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_hierarchy_path_trgm
ON user_profiles USING GIN (hierarchy_path gin_trgm_ops);

-- ============================================================================
-- 2. Fix get_downline_clients_with_stats function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_downline_clients_with_stats()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  owner_name text,
  name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  notes text,
  status varchar(20),
  created_at timestamptz,
  updated_at timestamptz,
  policy_count bigint,
  active_policy_count bigint,
  total_premium numeric,
  avg_premium numeric,
  last_policy_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    -- FIX: Proper NULL handling for name concatenation
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as policy_count,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_policy_count,
    COALESCE(SUM(p.annual_premium), 0) as total_premium,
    CASE
      WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(p.annual_premium), 0) / COUNT(p.id)
      ELSE 0
    END as avg_premium,
    MAX(p.effective_date) as last_policy_date
  FROM clients c
  -- FIX: Explicit INNER JOIN - orphaned clients (user_id IS NULL) excluded intentionally
  INNER JOIN user_profiles up ON c.user_id = up.id
  LEFT JOIN policies p ON c.id = p.client_id
  WHERE
    -- FIX: Explicit NULL check for clarity
    c.user_id IS NOT NULL
    -- Include clients from downlines (using is_upline_of check logic)
    AND c.user_id IN (
      SELECT target.id
      FROM user_profiles target
      INNER JOIN user_profiles me ON me.id = auth.uid()
      WHERE
        -- Both must have agency_id set
        me.agency_id IS NOT NULL
        AND target.agency_id IS NOT NULL
        -- Must be in same agency
        AND target.agency_id = me.agency_id
        -- Check upline relationship via hierarchy_path
        AND target.hierarchy_path IS NOT NULL
        AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
        -- Don't include self
        AND target.id != auth.uid()
    )
  GROUP BY c.id, c.user_id, up.first_name, up.last_name, up.email, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY owner_name, c.name;
END;
$$;

-- ============================================================================
-- 3. Fix get_imo_clients_with_stats function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_clients_with_stats()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  owner_name text,
  name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  notes text,
  status varchar(20),
  created_at timestamptz,
  updated_at timestamptz,
  policy_count bigint,
  active_policy_count bigint,
  total_premium numeric,
  avg_premium numeric,
  last_policy_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow IMO admins
  IF NOT is_imo_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    -- FIX: Proper NULL handling for name concatenation
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as policy_count,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_policy_count,
    COALESCE(SUM(p.annual_premium), 0) as total_premium,
    CASE
      WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(p.annual_premium), 0) / COUNT(p.id)
      ELSE 0
    END as avg_premium,
    MAX(p.effective_date) as last_policy_date
  FROM clients c
  -- FIX: Explicit INNER JOIN - orphaned clients excluded intentionally
  INNER JOIN user_profiles up ON c.user_id = up.id
  LEFT JOIN policies p ON c.id = p.client_id
  WHERE
    -- FIX: Explicit NULL check
    c.user_id IS NOT NULL
    AND up.imo_id = get_my_imo_id()
  GROUP BY c.id, c.user_id, up.first_name, up.last_name, up.email, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY owner_name, c.name;
END;
$$;

-- ============================================================================
-- 4. Add helper function to check if user is IMO admin (for frontend use)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_is_imo_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN is_imo_admin();
END;
$$;

GRANT EXECUTE ON FUNCTION check_is_imo_admin() TO authenticated;

COMMENT ON FUNCTION check_is_imo_admin() IS
'Public wrapper to check if current user is an IMO admin. Use for UI permission checks.';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_user_profiles_hierarchy_path_trgm IS
'Trigram index for efficient LIKE queries on hierarchy_path';
