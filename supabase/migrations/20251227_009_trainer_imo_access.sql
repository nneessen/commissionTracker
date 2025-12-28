-- Migration: Fix Trainer and Contracting Manager IMO-wide access
-- Trainers and contracting_managers need to see ALL recruits in their IMO, not just specific statuses

BEGIN;

-- Create helper function to check if user is IMO staff (trainer or contracting_manager)
CREATE OR REPLACE FUNCTION is_imo_staff_role()
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
      'trainer' = ANY(roles) OR
      'contracting_manager' = ANY(roles)
    )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_imo_staff_role() TO authenticated;

-- Drop the old restrictive trainer policy
DROP POLICY IF EXISTS "user_profiles_select_trainer" ON user_profiles;

-- Drop the old contracting policy (we'll recreate with IMO scope)
DROP POLICY IF EXISTS "user_profiles_select_contracting" ON user_profiles;

-- Create new trainer policy: See all users in same IMO who are recruits
-- This allows trainers to work with any recruit regardless of their specific onboarding_status
CREATE POLICY "trainers_view_imo_recruits"
ON user_profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'trainer')
  AND imo_id = get_my_imo_id()
  AND imo_id IS NOT NULL
  AND 'recruit' = ANY(roles)
);

-- Create new contracting manager policy: See all users in same IMO who are recruits
CREATE POLICY "contracting_managers_view_imo_recruits"
ON user_profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contracting_manager')
  AND imo_id = get_my_imo_id()
  AND imo_id IS NOT NULL
  AND 'recruit' = ANY(roles)
);

-- Also allow trainers and contracting managers to view ALL agents in their IMO
-- (for context when working with recruits who have uplines)
CREATE POLICY "imo_staff_view_imo_agents"
ON user_profiles FOR SELECT
TO authenticated
USING (
  is_imo_staff_role()
  AND imo_id = get_my_imo_id()
  AND imo_id IS NOT NULL
  AND 'agent' = ANY(roles)
);

-- Add comments for documentation
COMMENT ON FUNCTION is_imo_staff_role() IS 'Returns true if current user has trainer or contracting_manager role';

COMMIT;
