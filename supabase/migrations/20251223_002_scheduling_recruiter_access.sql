-- Migration: Add RLS policy for recruits to access recruiter's scheduling integrations
-- Description: Allows recruits to view their recruiter's active scheduling integrations
--              so they can book appointments during the onboarding pipeline.
--
-- Background: Each recruiter can have their own Calendly/Zoom/Google Calendar links.
--             When a recruit views their pipeline, they need to see their recruiter's
--             scheduling links, not their own (they don't have any).

-- Add policy: Recruits can SELECT their recruiter's scheduling integrations
CREATE POLICY "scheduling_integrations_select_for_recruit" ON scheduling_integrations
  FOR SELECT
  USING (
    -- Allow if the authenticated user's recruiter_id matches the integration owner
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.recruiter_id = scheduling_integrations.user_id
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scheduling_integrations'
      AND policyname = 'scheduling_integrations_select_for_recruit'
  ) THEN
    RAISE NOTICE 'Policy scheduling_integrations_select_for_recruit created successfully';
  ELSE
    RAISE EXCEPTION 'Policy was not created!';
  END IF;
END;
$$;
