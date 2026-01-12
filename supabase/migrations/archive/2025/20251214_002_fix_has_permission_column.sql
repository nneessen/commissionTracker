-- Migration: Fix has_permission function column reference
-- Date: 2024-12-14
-- Bug: perms.permission_code should be perms.code
-- The get_user_permissions() function returns TABLE(code text), not permission_code

CREATE OR REPLACE FUNCTION public.has_permission(target_user_id uuid, permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM get_user_permissions(target_user_id) AS perms
    WHERE perms.code = has_permission.permission_code
  );
$function$;

COMMENT ON FUNCTION has_permission(uuid, text) IS
'Checks if a user has a specific permission. Fixed: uses perms.code (matches get_user_permissions return type).';
