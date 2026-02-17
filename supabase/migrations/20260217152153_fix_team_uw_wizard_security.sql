-- supabase/migrations/20260217152153_fix_team_uw_wizard_security.sql
-- Security fixes for Team UW Wizard RPCs:
--   H1: manage_team_uw_seat - add auth.uid() = p_owner_id check
--   H2: get_team_seat_limit - add auth.uid() check (own data only, or super admin)
--   M1: manage_team_uw_seat - fix race condition with row-level lock

BEGIN;

-- ============================================================
-- 1. Fix get_team_seat_limit: restrict to own data or super admin
-- ============================================================

CREATE OR REPLACE FUNCTION get_team_seat_limit(p_owner_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_pack_seats INTEGER;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Allow own data or super admin
  IF auth.uid() != p_owner_id THEN
    SELECT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    ) INTO v_is_super_admin;

    IF NOT v_is_super_admin THEN
      RETURN 0;
    END IF;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_pack_seats
  FROM team_seat_packs
  WHERE owner_id = p_owner_id AND status = 'active';

  RETURN 5 + (v_pack_seats * 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 2. Fix manage_team_uw_seat: add auth check + row lock for
--    race condition prevention
-- ============================================================

CREATE OR REPLACE FUNCTION manage_team_uw_seat(
  p_owner_id UUID,
  p_agent_id UUID,
  p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_seat_count INTEGER;
  v_seat_limit INTEGER;
  v_has_team_plan BOOLEAN;
  v_is_downline BOOLEAN;
BEGIN
  -- Auth check: caller must be the owner
  IF auth.uid() != p_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
  END IF;

  -- Validate action
  IF p_action NOT IN ('grant', 'revoke') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use grant or revoke.');
  END IF;

  IF p_action = 'grant' THEN
    -- 1. Verify owner has active Team plan
    SELECT EXISTS (
      SELECT 1 FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = p_owner_id
        AND sp.name = 'team'
        AND us.status IN ('active', 'trialing')
    ) INTO v_has_team_plan;

    IF NOT v_has_team_plan THEN
      RETURN jsonb_build_object('success', false, 'error', 'Active Team plan required.');
    END IF;

    -- 2. Verify agent is in owner's downline via hierarchy_path
    SELECT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = p_agent_id
        AND hierarchy_path LIKE '%' || p_owner_id::TEXT || '%'
        AND id != p_owner_id
    ) INTO v_is_downline;

    IF NOT v_is_downline THEN
      RETURN jsonb_build_object('success', false, 'error', 'Agent is not in your downline.');
    END IF;

    -- 3. Check seat limit with row lock to prevent race conditions
    SELECT COUNT(*) INTO v_seat_count
    FROM team_uw_wizard_seats
    WHERE team_owner_id = p_owner_id
    FOR UPDATE;

    SELECT get_team_seat_limit(p_owner_id) INTO v_seat_limit;

    IF v_seat_count >= v_seat_limit THEN
      RETURN jsonb_build_object('success', false, 'error', 'Seat limit reached. Purchase more seat packs to add agents.');
    END IF;

    -- 4. Check if agent is already seated by someone else
    IF EXISTS (
      SELECT 1 FROM team_uw_wizard_seats
      WHERE agent_id = p_agent_id AND team_owner_id != p_owner_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Agent is already assigned a seat by another team owner.');
    END IF;

    -- 5. Insert seat (upsert in case of re-grant)
    INSERT INTO team_uw_wizard_seats (team_owner_id, agent_id, runs_limit)
    VALUES (p_owner_id, p_agent_id, 100)
    ON CONFLICT (team_owner_id, agent_id) DO UPDATE SET
      runs_limit = 100,
      updated_at = now();

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'revoke' THEN
    DELETE FROM team_uw_wizard_seats
    WHERE team_owner_id = p_owner_id AND agent_id = p_agent_id;

    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Unknown error.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMIT;
