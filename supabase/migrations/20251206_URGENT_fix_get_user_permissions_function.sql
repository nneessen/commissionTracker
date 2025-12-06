-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251206_URGENT_fix_get_user_permissions_function.sql
-- URGENT FIX: The get_user_permissions RPC function is broken
-- It's using 'id' instead of 'user_id' to match users

-- Drop the broken function
DROP FUNCTION IF EXISTS get_user_permissions(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_user_permissions(target_user_id uuid)
RETURNS TABLE(permission_code text)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_role_names AS (
    -- Get the user's roles from user_profiles
    SELECT unnest(roles) AS role_name
    FROM user_profiles
    WHERE user_id = target_user_id  -- THIS WAS THE BUG: was using 'id' instead of 'user_id'
  ),
  user_role_ids AS (
    -- Convert role names to role IDs
    SELECT r.id AS role_id
    FROM roles r
    INNER JOIN user_role_names urn ON r.name = urn.role_name
  )
  -- Get all permissions for those roles
  SELECT DISTINCT p.code
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN user_role_ids uri ON rp.role_id = uri.role_id
  ORDER BY p.code;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO anon;

-- Test the fix for nick.neessen@gmail.com
DO $$
DECLARE
  v_user_id uuid;
  v_permission_count integer;
BEGIN
  -- Get the user_id for nick.neessen@gmail.com
  SELECT user_id INTO v_user_id
  FROM user_profiles
  WHERE email = 'nick.neessen@gmail.com';

  -- Count permissions using the fixed function
  SELECT COUNT(*)
  INTO v_permission_count
  FROM get_user_permissions(v_user_id);

  -- Report the results
  RAISE NOTICE 'User nick.neessen@gmail.com (user_id: %) now has % permissions', v_user_id, v_permission_count;

  IF v_permission_count = 0 THEN
    RAISE WARNING 'STILL BROKEN: User has no permissions!';
  ELSE
    RAISE NOTICE 'SUCCESS: Permissions are now accessible';
  END IF;
END $$;

-- Also ensure the permissions include the specific nav items needed
SELECT 'Checking navigation permissions for active_agent:' as status;
SELECT p.code
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'active_agent'
  AND p.code LIKE 'nav.%'
ORDER BY p.code;