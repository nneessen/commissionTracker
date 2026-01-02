-- supabase/migrations/20260102_008_diagnose_slack_routing.sql
-- Comprehensive diagnostic for Slack notification routing

-- ============================================================================
-- 1. CHECK ALL SLACK INTEGRATION FIELDS
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  SLACK INTEGRATIONS - FULL CONFIGURATION                        ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';

  FOR rec IN
    SELECT
      si.id,
      si.team_name,
      si.agency_id,
      a.name as agency_name,
      si.is_active,
      si.connection_status,
      si.policy_channel_id,
      si.policy_channel_name,
      CASE
        WHEN si.policy_channel_id IS NULL THEN '❌ MISSING'
        ELSE '✅ SET'
      END as channel_status,
      CASE
        WHEN si.is_active = false THEN '❌ INACTIVE'
        WHEN si.connection_status != 'connected' THEN '❌ NOT CONNECTED'
        WHEN si.policy_channel_id IS NULL THEN '❌ NO CHANNEL'
        ELSE '✅ READY'
      END as overall_status
    FROM slack_integrations si
    LEFT JOIN agencies a ON si.agency_id = a.id
    ORDER BY si.team_name
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Workspace: %', rec.team_name;
    RAISE NOTICE '  agency_id: %', rec.agency_id;
    RAISE NOTICE '  agency_name: %', COALESCE(rec.agency_name, 'NULL (IMO-level)');
    RAISE NOTICE '  is_active: %', rec.is_active;
    RAISE NOTICE '  connection_status: %', rec.connection_status;
    RAISE NOTICE '  policy_channel_id: %', COALESCE(rec.policy_channel_id, 'NULL ❌');
    RAISE NOTICE '  policy_channel_name: %', COALESCE(rec.policy_channel_name, 'NULL');
    RAISE NOTICE '  STATUS: %', rec.overall_status;
  END LOOP;
END $$;

-- ============================================================================
-- 2. TEST THE AGENCY HIERARCHY FUNCTION
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  v_the_standard_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  AGENCY HIERARCHY FOR "THE STANDARD"                            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';

  FOR rec IN
    SELECT * FROM get_agency_hierarchy(v_the_standard_id)
  LOOP
    RAISE NOTICE 'depth=%: % (id: %)', rec.depth, rec.agency_name, rec.agency_id;
  END LOOP;
END $$;

-- ============================================================================
-- 3. TEST THE SLACK INTEGRATIONS FOR HIERARCHY FUNCTION
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  v_the_standard_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  SLACK INTEGRATIONS FOR HIERARCHY (what edge function sees)     ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';

  FOR rec IN
    SELECT * FROM get_slack_integrations_for_agency_hierarchy(v_the_standard_id)
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE '';
    RAISE NOTICE 'Integration %:', v_count;
    RAISE NOTICE '  team_name: %', rec.team_name;
    RAISE NOTICE '  agency_name: %', rec.agency_name;
    RAISE NOTICE '  agency_id: %', rec.agency_id;
    RAISE NOTICE '  hierarchy_depth: %', rec.hierarchy_depth;
    RAISE NOTICE '  policy_channel_id: %', rec.policy_channel_id;
  END LOOP;

  IF v_count = 0 THEN
    RAISE NOTICE '❌ NO INTEGRATIONS RETURNED!';
  ELSIF v_count = 1 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ONLY 1 INTEGRATION RETURNED - Self Made is being filtered out';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ % integrations returned', v_count;
  END IF;
END $$;

-- ============================================================================
-- 4. IDENTIFY THE EXACT PROBLEM
-- ============================================================================

DO $$
DECLARE
  v_self_made_policy_channel TEXT;
  v_self_made_is_active BOOLEAN;
  v_self_made_status TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ROOT CAUSE ANALYSIS                                            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';

  SELECT
    si.policy_channel_id,
    si.is_active,
    si.connection_status
  INTO
    v_self_made_policy_channel,
    v_self_made_is_active,
    v_self_made_status
  FROM slack_integrations si
  WHERE si.team_name ILIKE '%SELF MADE%';

  IF v_self_made_policy_channel IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '🚨 PROBLEM FOUND: "Self Made" workspace has NO policy_channel_id!';
    RAISE NOTICE '   The RPC function filters out integrations where policy_channel_id IS NULL';
    RAISE NOTICE '';
    RAISE NOTICE '   FIX: Set the policy_channel_id for Self Made workspace to the';
    RAISE NOTICE '   "daily-scoreboard" channel ID';
  ELSIF v_self_made_is_active = false THEN
    RAISE NOTICE '🚨 PROBLEM FOUND: "Self Made" workspace is INACTIVE (is_active = false)';
  ELSIF v_self_made_status != 'connected' THEN
    RAISE NOTICE '🚨 PROBLEM FOUND: "Self Made" workspace is NOT CONNECTED (status = %)', v_self_made_status;
  ELSE
    RAISE NOTICE '✅ Self Made workspace configuration looks correct';
    RAISE NOTICE '   policy_channel_id: %', v_self_made_policy_channel;
    RAISE NOTICE '   is_active: %', v_self_made_is_active;
    RAISE NOTICE '   connection_status: %', v_self_made_status;
  END IF;
END $$;
