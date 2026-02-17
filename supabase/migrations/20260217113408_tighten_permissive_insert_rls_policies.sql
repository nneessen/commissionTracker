-- Tighten 5 overly permissive INSERT RLS policies flagged by Supabase Security Advisor.
-- Each had WITH CHECK (true), effectively bypassing row-level security for inserts.
-- Service-role and SECURITY DEFINER contexts bypass RLS entirely, so these changes
-- only affect direct client-side inserts from authenticated/anon users.

BEGIN;

-- 1. lead_purchases: DROP redundant policy.
--    Two other policies already enforce user_id = auth.uid() for inserts:
--    - "Users can create own lead purchases" (WITH CHECK user_id = auth.uid())
--    - "Enable insert for users based on user_id" (WITH CHECK auth.uid() = user_id)
DROP POLICY "Enable insert for authenticated users only" ON public.lead_purchases;

-- 2. notifications: Replace wide-open anon+authenticated policy with
--    authenticated-only, scoped to user's own notifications.
--    Edge functions use service_role (bypasses RLS). RPCs are SECURITY DEFINER (bypasses RLS).
DROP POLICY "Allow authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. slack_messages: DROP the wide-open PUBLIC insert policy.
--    Only edge functions insert into this table, using service_role which bypasses RLS.
--    No client-side code inserts directly. Default deny is correct here.
DROP POLICY "slack_messages_insert_service" ON public.slack_messages;

-- 4. user_profiles: DROP redundant policy.
--    Already covered by "allow_trigger_insert" policy:
--    WITH CHECK ((auth.uid() IS NULL) OR (auth.uid() = id))
DROP POLICY "Authenticated users can create user profiles" ON public.user_profiles;

-- 5. workflow_events: Replace wide-open PUBLIC policy with authenticated-only.
--    Table has no user_id column, so we just ensure the caller is authenticated.
--    Client code (workflowEventEmitter.ts) inserts as authenticated user.
DROP POLICY "Authenticated users can create workflow events" ON public.workflow_events;
CREATE POLICY "Authenticated users can create workflow events"
  ON public.workflow_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
