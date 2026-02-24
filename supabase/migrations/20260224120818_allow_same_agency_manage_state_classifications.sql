-- Allow same-agency agents to manage state classifications
-- Keeps admin/super-admin overrides.
-- This aligns the State Licenses color-classification UI with RLS.

DROP POLICY IF EXISTS state_classifications_insert_policy ON public.state_classifications;
CREATE POLICY state_classifications_insert_policy ON public.state_classifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
          OR up.agency_id = state_classifications.agency_id
        )
    )
  );

DROP POLICY IF EXISTS state_classifications_update_policy ON public.state_classifications;
CREATE POLICY state_classifications_update_policy ON public.state_classifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
          OR up.agency_id = state_classifications.agency_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
          OR up.agency_id = state_classifications.agency_id
        )
    )
  );

DROP POLICY IF EXISTS state_classifications_delete_policy ON public.state_classifications;
CREATE POLICY state_classifications_delete_policy ON public.state_classifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (
          up.is_super_admin = true
          OR up.is_admin = true
          OR up.agency_id = state_classifications.agency_id
        )
    )
  );
