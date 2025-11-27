-- ============================================================================
-- RBAC Table Security - RLS Policies, Triggers, and Recursive Permission Fetching
-- ============================================================================
-- Purpose: Add security layer to RBAC tables and efficient permission inheritance
-- Created: 2025-11-27
-- ============================================================================

-- ============================================================================
-- PART 1: Enable Row Level Security on RBAC Tables
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: RLS Policies for Read Access (Everyone Needs This for UI)
-- ============================================================================

-- Everyone can READ roles (needed for dropdown lists, role display)
CREATE POLICY "read_roles" ON roles
  FOR SELECT
  USING (true);

-- Everyone can READ permissions (needed for permission display)
CREATE POLICY "read_permissions" ON permissions
  FOR SELECT
  USING (true);

-- Everyone can READ role_permissions mappings (needed for UI display)
CREATE POLICY "read_role_permissions" ON role_permissions
  FOR SELECT
  USING (true);

-- ============================================================================
-- PART 3: RLS Policies for Write Access (Admin Only)
-- ============================================================================

-- Only admins can INSERT role_permissions (assign permissions to roles)
CREATE POLICY "admin_manage_role_permissions_insert" ON role_permissions
  FOR INSERT
  WITH CHECK (is_admin_user());

-- Only admins can DELETE role_permissions (remove permissions from roles)
CREATE POLICY "admin_manage_role_permissions_delete" ON role_permissions
  FOR DELETE
  USING (is_admin_user());

-- ============================================================================
-- PART 4: Database Trigger for System Role Protection
-- ============================================================================
-- This provides backend validation that cannot be bypassed by UI manipulation

CREATE OR REPLACE FUNCTION prevent_system_role_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trying to modify permissions for a system role
  -- NEW.role_id is used for INSERT, OLD.role_id for DELETE
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM roles
      WHERE id = NEW.role_id AND is_system_role = true
    ) THEN
      RAISE EXCEPTION 'Cannot modify permissions for system roles';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM roles
      WHERE id = OLD.role_id AND is_system_role = true
    ) THEN
      RAISE EXCEPTION 'Cannot modify permissions for system roles';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce system role protection on INSERT and DELETE
CREATE TRIGGER prevent_system_role_changes
  BEFORE INSERT OR DELETE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_role_permission_changes();

-- ============================================================================
-- PART 5: Recursive CTE Function for Efficient Permission Inheritance
-- ============================================================================
-- Solves: N+1 query problem, infinite recursion bug, missing deduplication

CREATE OR REPLACE FUNCTION get_role_permissions_with_inheritance(p_role_id UUID)
RETURNS TABLE (
  permission_id UUID,
  permission_code TEXT,
  permission_resource TEXT,
  permission_action TEXT,
  permission_scope TEXT,
  permission_description TEXT,
  permission_type TEXT,  -- 'direct' or 'inherited'
  inherited_from_role_name TEXT  -- NULL if direct
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_hierarchy AS (
    -- Base case: start with the requested role
    SELECT
      id,
      parent_role_id,
      name,
      1 as depth
    FROM roles
    WHERE id = p_role_id

    UNION ALL

    -- Recursive case: get parent roles
    SELECT
      r.id,
      r.parent_role_id,
      r.name,
      rh.depth + 1
    FROM roles r
    INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
    WHERE rh.depth < 5  -- Max depth protection (prevents infinite loops)
  )
  SELECT DISTINCT
    p.id as permission_id,
    p.code as permission_code,
    p.resource as permission_resource,
    p.action as permission_action,
    p.scope as permission_scope,
    p.description as permission_description,
    CASE
      WHEN rh.id = p_role_id THEN 'direct'::TEXT
      ELSE 'inherited'::TEXT
    END as permission_type,
    CASE
      WHEN rh.id = p_role_id THEN NULL
      ELSE rh.name
    END as inherited_from_role_name
  FROM role_hierarchy rh
  INNER JOIN role_permissions rp ON rh.id = rp.role_id
  INNER JOIN permissions p ON rp.permission_id = p.id
  ORDER BY p.resource, p.scope, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PART 6: Performance Indexes
-- ============================================================================

-- Index for faster role_permissions lookups by role_id
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id
  ON role_permissions(role_id);

-- Index for faster role_permissions lookups by permission_id
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions(permission_id);

-- Composite index for faster joins (role_id, permission_id)
CREATE INDEX IF NOT EXISTS idx_role_permissions_composite
  ON role_permissions(role_id, permission_id);

-- Index for faster parent role lookups in recursive CTE
CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id
  ON roles(parent_role_id) WHERE parent_role_id IS NOT NULL;

-- ============================================================================
-- PART 7: Documentation Comments
-- ============================================================================

COMMENT ON POLICY "read_roles" ON roles IS
  'Allow all authenticated users to read roles for UI display';

COMMENT ON POLICY "read_permissions" ON permissions IS
  'Allow all authenticated users to read permissions for UI display';

COMMENT ON POLICY "read_role_permissions" ON role_permissions IS
  'Allow all authenticated users to read role-permission mappings for UI display';

COMMENT ON POLICY "admin_manage_role_permissions_insert" ON role_permissions IS
  'Only admins can assign permissions to roles';

COMMENT ON POLICY "admin_manage_role_permissions_delete" ON role_permissions IS
  'Only admins can remove permissions from roles';

COMMENT ON TRIGGER prevent_system_role_changes ON role_permissions IS
  'Prevents modification of system role permissions via database constraint';

COMMENT ON FUNCTION get_role_permissions_with_inheritance(UUID) IS
  'Recursively fetches all permissions for a role including inherited permissions from parent roles. Uses CTE with max depth of 5 to prevent infinite loops. Returns permissions marked as direct or inherited with source role information.';

COMMENT ON FUNCTION prevent_system_role_permission_changes() IS
  'Trigger function that prevents INSERT/DELETE operations on role_permissions for system roles (is_system_role=true). Provides backend validation that cannot be bypassed by UI manipulation.';

-- ============================================================================
-- End of Migration
-- ============================================================================
