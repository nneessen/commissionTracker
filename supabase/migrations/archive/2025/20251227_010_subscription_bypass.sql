-- Migration: Subscription bypass for staff roles
-- Trainers, contracting managers, and admins don't need subscriptions to access the app

BEGIN;

-- Create function to check if user has subscription bypass
CREATE OR REPLACE FUNCTION has_subscription_bypass()
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
      is_super_admin = true
      OR is_admin = true
      OR 'admin' = ANY(roles)
      OR 'trainer' = ANY(roles)
      OR 'contracting_manager' = ANY(roles)
      OR 'imo_owner' = ANY(roles)
      OR 'imo_admin' = ANY(roles)
    )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_subscription_bypass() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION has_subscription_bypass() IS 'Returns true if current user bypasses subscription requirements (super admin, admin, trainer, contracting_manager, imo_owner, imo_admin)';

COMMIT;
