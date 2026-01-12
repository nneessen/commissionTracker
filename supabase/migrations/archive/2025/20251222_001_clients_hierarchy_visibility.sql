-- Migration: Add hierarchy visibility for clients
-- Enables managers to view their downline's clients
-- Enables IMO admins to view all clients in their IMO

-- ============================================================================
-- 1. Add RLS policies for upline visibility
-- ============================================================================

-- Policy: Uplines can view their direct downlines' clients
-- Uses the existing is_upline_of function which checks hierarchy_path
CREATE POLICY "Uplines can view downline clients" ON clients FOR SELECT
USING (
  is_upline_of(user_id)
);

-- Policy: IMO admins can view all clients in their IMO
CREATE POLICY "IMO admins can view all clients in own IMO" ON clients FOR SELECT
USING (
  is_imo_admin() AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = clients.user_id
    AND user_profiles.imo_id = get_my_imo_id()
  )
);

-- Policy: Super admins can view all clients
CREATE POLICY "Super admins can view all clients" ON clients FOR SELECT
USING (is_super_admin());

-- ============================================================================
-- 2. Create function to get downline clients with stats
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
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as owner_name,
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
  JOIN user_profiles up ON c.user_id = up.id
  LEFT JOIN policies p ON c.id = p.client_id
  WHERE
    -- Include clients from downlines (using is_upline_of check logic)
    c.user_id IN (
      SELECT target.id
      FROM user_profiles target
      JOIN user_profiles me ON me.id = auth.uid()
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
  ORDER BY up.first_name, up.last_name, c.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_downline_clients_with_stats() TO authenticated;

-- ============================================================================
-- 3. Create function to get all IMO clients with stats (for IMO admins)
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
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as owner_name,
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
  JOIN user_profiles up ON c.user_id = up.id
  LEFT JOIN policies p ON c.id = p.client_id
  WHERE up.imo_id = get_my_imo_id()
  GROUP BY c.id, c.user_id, up.first_name, up.last_name, up.email, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY up.first_name, up.last_name, c.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_imo_clients_with_stats() TO authenticated;

-- ============================================================================
-- 4. Create function to check if user has downlines
-- ============================================================================

CREATE OR REPLACE FUNCTION has_downlines()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    WHERE
      me.agency_id IS NOT NULL
      AND target.agency_id IS NOT NULL
      AND target.agency_id = me.agency_id
      AND target.hierarchy_path IS NOT NULL
      AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
      AND target.id != auth.uid()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_downlines() TO authenticated;

-- ============================================================================
-- 5. Add index for performance
-- ============================================================================

-- Index on user_id for faster lookups when checking downline clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id_status_name
ON clients(user_id, status, name);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Uplines can view downline clients" ON clients IS
'Allows managers to view clients belonging to their direct downlines in the same agency';

COMMENT ON POLICY "IMO admins can view all clients in own IMO" ON clients IS
'Allows IMO admins/owners to view all clients within their IMO organization';

COMMENT ON POLICY "Super admins can view all clients" ON clients IS
'Allows super admins to view all clients across all organizations';

COMMENT ON FUNCTION get_downline_clients_with_stats() IS
'Returns clients belonging to downlines with aggregated policy statistics';

COMMENT ON FUNCTION get_imo_clients_with_stats() IS
'Returns all clients in the callers IMO with aggregated policy statistics (IMO admins only)';

COMMENT ON FUNCTION has_downlines() IS
'Checks if the current user has any downlines in their agency hierarchy';
