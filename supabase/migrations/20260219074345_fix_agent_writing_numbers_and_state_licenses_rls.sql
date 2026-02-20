-- Fix RLS policies for agent_writing_numbers and agent_state_licenses
-- Agents on a team need to:
--   - INSERT/UPDATE their own rows only
--   - SELECT their own rows and teammates' rows (same agency_id)

-- ============================================================
-- agent_writing_numbers
-- ============================================================

-- INSERT: add self-insert (agent can insert their own writing numbers)
DROP POLICY IF EXISTS agent_writing_numbers_insert_policy ON agent_writing_numbers;
CREATE POLICY agent_writing_numbers_insert_policy ON agent_writing_numbers
  FOR INSERT WITH CHECK (
    -- Agent can insert their own row
    agent_id = (SELECT auth.uid())
    OR
    -- IMO admin can insert for agents in their IMO
    (is_imo_admin() AND (
      imo_id = get_my_imo_id()
      OR (imo_id IS NULL AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = agent_writing_numbers.agent_id
          AND user_profiles.imo_id = get_my_imo_id()
      ))
    ))
    OR is_super_admin()
  );

-- UPDATE: add self-update (agent can update their own writing numbers)
DROP POLICY IF EXISTS agent_writing_numbers_update_policy ON agent_writing_numbers;
CREATE POLICY agent_writing_numbers_update_policy ON agent_writing_numbers
  FOR UPDATE
  USING (
    -- Agent can update their own row
    agent_id = (SELECT auth.uid())
    OR (is_imo_admin() AND imo_id = get_my_imo_id())
    OR is_super_admin()
  )
  WITH CHECK (
    agent_id = (SELECT auth.uid())
    OR (is_imo_admin() AND imo_id = get_my_imo_id())
    OR is_super_admin()
  );

-- SELECT: add is_same_agency so teammates can view each other's writing numbers
DROP POLICY IF EXISTS agent_writing_numbers_select_policy ON agent_writing_numbers;
CREATE POLICY agent_writing_numbers_select_policy ON agent_writing_numbers
  FOR SELECT USING (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR is_same_agency(agent_id)
    OR (is_imo_admin() AND imo_id = get_my_imo_id())
    OR is_super_admin()
  );


-- ============================================================
-- agent_state_licenses
-- ============================================================

-- INSERT: add self-insert (agent can insert their own license states)
DROP POLICY IF EXISTS agent_state_licenses_insert_policy ON agent_state_licenses;
CREATE POLICY agent_state_licenses_insert_policy ON agent_state_licenses
  FOR INSERT WITH CHECK (
    -- Agent can insert their own row
    agent_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  );

-- UPDATE: add self-update (agent can update their own license states, not others')
DROP POLICY IF EXISTS agent_state_licenses_update_policy ON agent_state_licenses;
CREATE POLICY agent_state_licenses_update_policy ON agent_state_licenses
  FOR UPDATE
  USING (
    agent_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  )
  WITH CHECK (
    agent_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  );

-- SELECT: existing policy uses agency_id subquery; replace with is_same_agency helper + own row
DROP POLICY IF EXISTS agent_state_licenses_select_policy ON agent_state_licenses;
CREATE POLICY agent_state_licenses_select_policy ON agent_state_licenses
  FOR SELECT USING (
    agent_id = (SELECT auth.uid())
    OR is_same_agency(agent_id)
    OR is_upline_of(agent_id)
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  );
