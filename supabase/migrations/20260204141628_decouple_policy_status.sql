-- supabase/migrations/20260204141628_decouple_policy_status.sql
-- Decouple policy status from commission status
--
-- CHANGES:
-- 1. Add lifecycle_status column (active, lapsed, cancelled, expired)
-- 2. Update status values: pending, approved, denied, withdrawn (application outcome)
-- 3. Migrate existing data
-- 4. Update all triggers and functions to use lifecycle_status for "active" checks
--
-- MAPPING:
-- Old status     | New status  | New lifecycle_status
-- --------------|-------------|---------------------
-- pending       | pending     | NULL
-- active        | approved    | active
-- lapsed        | approved    | lapsed
-- cancelled     | approved    | cancelled
-- expired       | approved    | expired

-- ============================================================================
-- 1. Add lifecycle_status column
-- ============================================================================

-- First, add the new column as nullable
ALTER TABLE policies ADD COLUMN IF NOT EXISTS lifecycle_status TEXT;

-- ============================================================================
-- 2. Migrate existing data BEFORE changing status values
-- ============================================================================

-- Migrate: active → approved/active
UPDATE policies
SET lifecycle_status = 'active', status = 'approved'
WHERE status = 'active';

-- Migrate: lapsed → approved/lapsed
UPDATE policies
SET lifecycle_status = 'lapsed', status = 'approved'
WHERE status = 'lapsed';

-- Migrate: cancelled → approved/cancelled
UPDATE policies
SET lifecycle_status = 'cancelled', status = 'approved'
WHERE status = 'cancelled';

-- Migrate: expired → approved/expired
UPDATE policies
SET lifecycle_status = 'expired', status = 'approved'
WHERE status = 'expired';

-- pending stays as pending with NULL lifecycle_status (no change needed)

-- ============================================================================
-- 3. Create indexes for the new column
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_policies_lifecycle_status
ON policies(lifecycle_status) WHERE lifecycle_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_policies_status_lifecycle
ON policies(status, lifecycle_status);

-- ============================================================================
-- 4. Update create_override_commissions trigger function
-- Uses lifecycle_status = 'active' instead of status = 'active'
-- ============================================================================

CREATE OR REPLACE FUNCTION create_override_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_upline_record RECORD;
  v_base_comp_level INTEGER;
  v_base_commission_rate DECIMAL(5,4);
  v_base_commission_amount DECIMAL(12,2);
  v_upline_commission_rate DECIMAL(5,4);
  v_upline_commission_amount DECIMAL(12,2);
  v_override_amount DECIMAL(12,2);
  v_floor_commission_amount DECIMAL(12,2);
  v_floor_comp_level INTEGER;
BEGIN
  -- Only process if policy lifecycle is active
  IF NEW.lifecycle_status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Get base agent's contract comp level from user_profiles
  SELECT contract_level
  INTO v_base_comp_level
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- If base agent has no comp level, skip override calculation
  IF v_base_comp_level IS NULL THEN
    RAISE WARNING 'Policy % created by user % has no contract_level set in user_profiles - skipping override calculation',
      NEW.id, NEW.user_id;
    RETURN NEW;
  END IF;

  -- Get base agent's commission rate from comp_guide
  SELECT commission_percentage
  INTO v_base_commission_rate
  FROM comp_guide
  WHERE carrier_id = NEW.carrier_id
    AND (product_id = NEW.product_id OR product_type = NEW.product)
    AND contract_level = v_base_comp_level
    AND effective_date <= NEW.effective_date
    AND (expiration_date IS NULL OR expiration_date >= NEW.effective_date)
  ORDER BY effective_date DESC
  LIMIT 1;

  -- If no commission rate found in comp_guide, skip override calculation
  IF v_base_commission_rate IS NULL THEN
    RAISE WARNING 'No comp_guide entry found for carrier=%, product=%, level=% - skipping override calculation',
      NEW.carrier_id, NEW.product, v_base_comp_level;
    RETURN NEW;
  END IF;

  -- Calculate base commission amount
  v_base_commission_amount := NEW.annual_premium * v_base_commission_rate;

  -- Initialize floor to base agent's values (first upline compares against base)
  v_floor_commission_amount := v_base_commission_amount;
  v_floor_comp_level := v_base_comp_level;

  -- Walk up the hierarchy chain and create override records for each upline
  -- CRITICAL: ORDER BY depth ASC ensures we process level 1 before level 2, etc.
  FOR v_upline_record IN (
    WITH RECURSIVE upline_chain AS (
      -- Base case: Get immediate upline (depth = 1)
      SELECT
        up.id as upline_id,
        up.contract_level as upline_comp_level,
        1 as depth
      FROM user_profiles up
      WHERE up.id = (
        SELECT upline_id FROM user_profiles WHERE id = NEW.user_id
      )
      AND up.id IS NOT NULL
      AND up.contract_level IS NOT NULL

      UNION

      -- Recursive case: Get upline's upline (depth = 2, 3, ...)
      SELECT
        up.id as upline_id,
        up.contract_level as upline_comp_level,
        uc.depth + 1
      FROM user_profiles up
      JOIN upline_chain uc ON up.id = (
        SELECT upline_id FROM user_profiles WHERE id = uc.upline_id
      )
      WHERE up.id IS NOT NULL
      AND up.contract_level IS NOT NULL
    )
    SELECT * FROM upline_chain
    ORDER BY depth ASC  -- CRITICAL: Process in depth order for correct floor tracking
  ) LOOP
    -- Skip if upline has same or lower comp level than current floor
    IF v_upline_record.upline_comp_level <= v_floor_comp_level THEN
      RAISE WARNING 'Upline % has contract_level=% <= floor_level=% - skipping override (no spread)',
        v_upline_record.upline_id, v_upline_record.upline_comp_level, v_floor_comp_level;
      CONTINUE;
    END IF;

    -- Get upline's commission rate from comp_guide
    SELECT commission_percentage
    INTO v_upline_commission_rate
    FROM comp_guide
    WHERE carrier_id = NEW.carrier_id
      AND (product_id = NEW.product_id OR product_type = NEW.product)
      AND contract_level = v_upline_record.upline_comp_level
      AND effective_date <= NEW.effective_date
      AND (expiration_date IS NULL OR expiration_date >= NEW.effective_date)
    ORDER BY effective_date DESC
    LIMIT 1;

    -- Skip if no commission rate found for upline's level
    IF v_upline_commission_rate IS NULL THEN
      RAISE WARNING 'No comp_guide entry found for upline % at level % - skipping override',
        v_upline_record.upline_id, v_upline_record.upline_comp_level;
      CONTINUE;
    END IF;

    -- Calculate upline's commission amount
    v_upline_commission_amount := NEW.annual_premium * v_upline_commission_rate;

    -- Calculate override against FLOOR (previous captured level), not base
    v_override_amount := v_upline_commission_amount - v_floor_commission_amount;

    -- Only create override if amount is positive
    IF v_override_amount > 0 THEN
      -- Use ON CONFLICT DO NOTHING to handle race conditions safely
      -- The UNIQUE constraint (policy_id, override_agent_id) prevents duplicates
      INSERT INTO override_commissions (
        policy_id,
        base_agent_id,
        override_agent_id,
        hierarchy_depth,
        base_comp_level,
        override_comp_level,
        carrier_id,
        product_id,
        policy_premium,
        base_commission_amount,
        override_commission_amount,
        advance_months,
        months_paid,
        earned_amount,
        unearned_amount,
        status,
        created_at
      ) VALUES (
        NEW.id,
        NEW.user_id,
        v_upline_record.upline_id,
        v_upline_record.depth,
        v_base_comp_level,
        v_upline_record.upline_comp_level,
        NEW.carrier_id,
        NEW.product_id,
        NEW.annual_premium,
        v_base_commission_amount,
        v_override_amount,
        9,  -- Default advance months
        0,
        0,
        v_override_amount,
        'pending',
        NOW()
      )
      ON CONFLICT (policy_id, override_agent_id) DO NOTHING;

      -- Update floor to this upline's commission for the next iteration
      v_floor_commission_amount := v_upline_commission_amount;
      v_floor_comp_level := v_upline_record.upline_comp_level;
    ELSE
      RAISE WARNING 'Override amount for upline % is <= 0 (%.2f) - skipping',
        v_upline_record.upline_id, v_override_amount;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 5. Update update_commission_on_policy_status trigger function
-- Uses lifecycle_status for chargeback/earned logic
-- ============================================================================

CREATE OR REPLACE FUNCTION update_commission_on_policy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  v_chargeback_result JSONB;
BEGIN
  -- When policy lifecycle becomes active, set commission to 'earned' (not 'paid')
  IF NEW.lifecycle_status = 'active' AND (OLD.lifecycle_status IS NULL OR OLD.lifecycle_status != 'active') THEN
    UPDATE commissions
    SET
      status = 'earned',
      updated_at = NOW()
    WHERE policy_id = NEW.id
      AND status = 'pending';  -- Only update if currently pending

  -- When policy lifecycle is cancelled or lapsed, calculate chargeback automatically
  ELSIF NEW.lifecycle_status IN ('cancelled', 'lapsed') AND (OLD.lifecycle_status IS NULL OR OLD.lifecycle_status NOT IN ('cancelled', 'lapsed')) THEN

    -- Call chargeback calculation function
    v_chargeback_result := calculate_chargeback_on_policy_lapse(
      NEW.id,
      CURRENT_DATE
    );

    -- Log the result
    IF (v_chargeback_result->>'success')::BOOLEAN THEN
      RAISE NOTICE 'Chargeback processed for policy %: %',
        NEW.id,
        v_chargeback_result->>'chargeback_reason';
    ELSE
      RAISE WARNING 'Chargeback calculation failed for policy %: %',
        NEW.id,
        v_chargeback_result->>'error';
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 6. Update update_override_commissions_on_policy_change trigger function
-- Uses lifecycle_status for chargeback/earned logic
-- ============================================================================

CREATE OR REPLACE FUNCTION update_override_commissions_on_policy_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act if policy lifecycle_status changed
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN

    -- Policy lapsed or cancelled → charge back overrides
    IF NEW.lifecycle_status IN ('lapsed', 'cancelled') THEN
      UPDATE override_commissions
      SET
        status = 'charged_back',
        chargeback_amount = unearned_amount,
        chargeback_date = CURRENT_DATE,
        chargeback_reason = 'Policy ' || NEW.lifecycle_status
      WHERE policy_id = NEW.id
        AND status NOT IN ('charged_back', 'cancelled'); -- don't re-charge already charged back

      RAISE NOTICE 'Charged back % override commissions for policy %',
        (SELECT COUNT(*) FROM override_commissions WHERE policy_id = NEW.id), NEW.id;

    -- Policy activated → mark overrides as earned
    ELSIF NEW.lifecycle_status = 'active' AND (OLD.lifecycle_status IS NULL OR OLD.lifecycle_status != 'active') THEN
      UPDATE override_commissions
      SET status = 'earned'
      WHERE policy_id = NEW.id
        AND status = 'pending';

      RAISE NOTICE 'Marked % override commissions as earned for policy %',
        (SELECT COUNT(*) FROM override_commissions WHERE policy_id = NEW.id), NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 7. Update get_leaderboard_data function
-- IP = lifecycle_status = 'active', AP = status = 'pending'
-- ============================================================================

DROP FUNCTION IF EXISTS get_leaderboard_data(date, date, text, uuid, integer);

CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_scope text DEFAULT 'all',
  p_scope_id uuid DEFAULT NULL,
  p_team_threshold integer DEFAULT 5
)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  profile_photo_url text,
  agency_id uuid,
  agency_name text,
  direct_downline_count bigint,
  ip_total numeric,
  ap_total numeric,
  policy_count bigint,
  pending_policy_count bigint,
  prospect_count bigint,
  pipeline_count bigint,
  rank_overall bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  -- Get all active agents (not recruits, not archived)
  active_agents AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      u.hierarchy_path,
      u.upline_id
    FROM user_profiles u
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  scoped_agents AS (
    SELECT a.*
    FROM active_agents a
    WHERE
      CASE
        WHEN p_scope = 'all' THEN true
        WHEN p_scope = 'agency' AND p_scope_id IS NOT NULL THEN a.agency_id = p_scope_id
        WHEN p_scope = 'team' AND p_scope_id IS NOT NULL THEN
          a.id = p_scope_id
          OR a.hierarchy_path LIKE (p_scope_id::text || '.%')
          OR a.upline_id = p_scope_id
        ELSE true
      END
  ),

  downline_counts AS (
    SELECT
      u.upline_id AS agent_id,
      COUNT(*) AS downline_count
    FROM user_profiles u
    WHERE u.upline_id IS NOT NULL
      AND u.approval_status = 'approved'
      AND u.archived_at IS NULL
    GROUP BY u.upline_id
  ),

  -- IP: Active lifecycle policies with effective_date in range
  ip_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM policies p
    WHERE p.lifecycle_status = 'active'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY p.user_id
  ),

  -- AP: ALL pending status policies (NO date filter)
  ap_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM policies p
    WHERE p.status = 'pending'
    GROUP BY p.user_id
  ),

  prospect_data AS (
    SELECT
      u.recruiter_id,
      COUNT(*) AS prospect_count
    FROM user_profiles u
    WHERE u.recruiter_id IS NOT NULL
      AND u.roles @> ARRAY['recruit']
      AND (
        u.onboarding_status = 'prospect'
        OR (u.onboarding_started_at IS NULL AND u.onboarding_status IS NULL)
      )
    GROUP BY u.recruiter_id
  ),

  pipeline_data AS (
    SELECT
      u.recruiter_id,
      COUNT(*) AS pipeline_count
    FROM user_profiles u
    WHERE u.recruiter_id IS NOT NULL
      AND u.roles @> ARRAY['recruit']
      AND u.onboarding_status IS NOT NULL
      AND u.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY u.recruiter_id
  ),

  combined AS (
    SELECT
      sa.id AS agent_id,
      sa.name AS agent_name,
      sa.email AS agent_email,
      sa.profile_photo_url,
      sa.agency_id,
      COALESCE(dc.downline_count, 0) AS direct_downline_count,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM scoped_agents sa
    LEFT JOIN downline_counts dc ON dc.agent_id = sa.id
    LEFT JOIN ip_data ip ON ip.user_id = sa.id
    LEFT JOIN ap_data ap ON ap.user_id = sa.id
    LEFT JOIN prospect_data pr ON pr.recruiter_id = sa.id
    LEFT JOIN pipeline_data pl ON pl.recruiter_id = sa.id
  ),

  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.agent_name ASC) AS rank_overall
    FROM combined c
    LEFT JOIN agencies ag ON ag.id = c.agency_id
  )

  SELECT
    r.agent_id,
    r.agent_name,
    r.agent_email,
    r.profile_photo_url,
    r.agency_id,
    r.agency_name,
    r.direct_downline_count,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agent_name ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION get_leaderboard_data(date, date, text, uuid, integer) TO authenticated;

-- ============================================================================
-- 8. Update get_agency_leaderboard_data function
-- IP = lifecycle_status = 'active', AP = status = 'pending'
-- ============================================================================

DROP FUNCTION IF EXISTS get_agency_leaderboard_data(date, date);

CREATE OR REPLACE FUNCTION get_agency_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  owner_id uuid,
  owner_name text,
  agent_count bigint,
  ip_total numeric,
  ap_total numeric,
  policy_count bigint,
  pending_policy_count bigint,
  prospect_count bigint,
  pipeline_count bigint,
  rank_overall bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Get all active agencies with their owner's hierarchy path
  active_agencies AS (
    SELECT
      a.id,
      a.name,
      a.owner_id,
      COALESCE(o.hierarchy_path, o.id::text) AS owner_hierarchy_path
    FROM agencies a
    INNER JOIN user_profiles o ON o.id = a.owner_id
    WHERE a.is_active = true
  ),

  -- Use hierarchy traversal to find ALL agents in the downward hierarchy
  agency_hierarchy_agents AS (
    SELECT DISTINCT
      aa.id AS agency_id,
      u.id AS user_id,
      u.recruiter_id
    FROM active_agencies aa
    INNER JOIN user_profiles u ON (
      u.hierarchy_path = aa.owner_hierarchy_path
      OR u.hierarchy_path LIKE aa.owner_hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- Count agents per agency (full hierarchy)
  agent_counts AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT aha.user_id) AS agent_count
    FROM agency_hierarchy_agents aha
    GROUP BY aha.agency_id
  ),

  -- IP: Active lifecycle policies with effective_date in range
  ip_data AS (
    SELECT
      aha.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.lifecycle_status = 'active'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY aha.agency_id
  ),

  -- AP: ALL pending status policies (NO date filter)
  ap_data AS (
    SELECT
      aha.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.status = 'pending'
    GROUP BY aha.agency_id
  ),

  -- Count prospects per agency (full hierarchy)
  prospect_data AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT r.id) AS prospect_count
    FROM agency_hierarchy_agents aha
    INNER JOIN user_profiles r ON r.recruiter_id = aha.user_id
    WHERE r.roles @> ARRAY['recruit']
      AND (
        r.onboarding_status = 'prospect'
        OR (r.onboarding_started_at IS NULL AND r.onboarding_status IS NULL)
      )
    GROUP BY aha.agency_id
  ),

  -- Count pipeline recruits per agency (full hierarchy)
  pipeline_data AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT r.id) AS pipeline_count
    FROM agency_hierarchy_agents aha
    INNER JOIN user_profiles r ON r.recruiter_id = aha.user_id
    WHERE r.roles @> ARRAY['recruit']
      AND r.onboarding_status IS NOT NULL
      AND r.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY aha.agency_id
  ),

  -- Combine all data
  combined AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.owner_id,
      COALESCE(o.first_name || ' ' || o.last_name, o.email, 'Unknown') AS owner_name,
      COALESCE(ac.agent_count, 0) AS agent_count,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM active_agencies a
    LEFT JOIN user_profiles o ON o.id = a.owner_id
    LEFT JOIN agent_counts ac ON ac.agency_id = a.id
    LEFT JOIN ip_data ip ON ip.agency_id = a.id
    LEFT JOIN ap_data ap ON ap.agency_id = a.id
    LEFT JOIN prospect_data pr ON pr.agency_id = a.id
    LEFT JOIN pipeline_data pl ON pl.agency_id = a.id
    WHERE COALESCE(ac.agent_count, 0) > 0
  ),

  -- Add rankings
  ranked AS (
    SELECT
      c.*,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.agency_name ASC) AS rank_overall
    FROM combined c
  )

  SELECT
    r.agency_id,
    r.agency_name,
    r.owner_id,
    r.owner_name,
    r.agent_count,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agency_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_leaderboard_data(date, date) TO authenticated;

-- ============================================================================
-- 9. Update get_team_leaderboard_data function
-- IP = lifecycle_status = 'active', AP = status = 'pending'
-- ============================================================================

DROP FUNCTION IF EXISTS get_team_leaderboard_data(date, date, integer);

CREATE OR REPLACE FUNCTION get_team_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_min_downlines integer DEFAULT 5
)
RETURNS TABLE (
  leader_id uuid,
  leader_name text,
  leader_email text,
  leader_profile_photo_url text,
  agency_id uuid,
  agency_name text,
  team_size bigint,
  ip_total numeric,
  ap_total numeric,
  policy_count bigint,
  pending_policy_count bigint,
  prospect_count bigint,
  pipeline_count bigint,
  rank_overall bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Find team leaders: agents who qualify based on hierarchy
  potential_leaders AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      COALESCE(u.hierarchy_path, u.id::text) AS hierarchy_path
    FROM user_profiles u
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- Count FULL hierarchy size for each potential leader
  hierarchy_counts AS (
    SELECT
      pl.id AS leader_id,
      COUNT(DISTINCT u.id) AS hierarchy_size
    FROM potential_leaders pl
    INNER JOIN user_profiles u ON (
      u.id = pl.id
      OR u.hierarchy_path LIKE pl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
    GROUP BY pl.id
  ),

  -- Filter to only leaders with enough people in hierarchy
  team_leaders AS (
    SELECT
      pl.id,
      pl.name,
      pl.email,
      pl.profile_photo_url,
      pl.agency_id,
      pl.hierarchy_path,
      hc.hierarchy_size
    FROM potential_leaders pl
    INNER JOIN hierarchy_counts hc ON hc.leader_id = pl.id
    WHERE hc.hierarchy_size >= p_min_downlines
  ),

  -- Get all team members using FULL hierarchy
  team_members AS (
    SELECT DISTINCT
      tl.id AS leader_id,
      u.id AS member_id
    FROM team_leaders tl
    INNER JOIN user_profiles u ON (
      u.id = tl.id
      OR u.hierarchy_path LIKE tl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- Count team size
  team_sizes AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT tm.member_id) AS team_size
    FROM team_members tm
    GROUP BY tm.leader_id
  ),

  -- IP: Active lifecycle policies with effective_date in range
  ip_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.lifecycle_status = 'active'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- AP: ALL pending status policies (NO date filter)
  ap_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.status = 'pending'
    GROUP BY tm.leader_id
  ),

  -- Count prospects per team (full hierarchy)
  prospect_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT r.id) AS prospect_count
    FROM team_members tm
    INNER JOIN user_profiles r ON r.recruiter_id = tm.member_id
    WHERE r.roles @> ARRAY['recruit']
      AND (
        r.onboarding_status = 'prospect'
        OR (r.onboarding_started_at IS NULL AND r.onboarding_status IS NULL)
      )
    GROUP BY tm.leader_id
  ),

  -- Count pipeline recruits per team (full hierarchy)
  pipeline_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT r.id) AS pipeline_count
    FROM team_members tm
    INNER JOIN user_profiles r ON r.recruiter_id = tm.member_id
    WHERE r.roles @> ARRAY['recruit']
      AND r.onboarding_status IS NOT NULL
      AND r.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY tm.leader_id
  ),

  -- Combine all data
  combined AS (
    SELECT
      tl.id AS leader_id,
      tl.name AS leader_name,
      tl.email AS leader_email,
      tl.profile_photo_url AS leader_profile_photo_url,
      tl.agency_id,
      COALESCE(ts.team_size, 1) AS team_size,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM team_leaders tl
    LEFT JOIN team_sizes ts ON ts.leader_id = tl.id
    LEFT JOIN ip_data ip ON ip.leader_id = tl.id
    LEFT JOIN ap_data ap ON ap.leader_id = tl.id
    LEFT JOIN prospect_data pr ON pr.leader_id = tl.id
    LEFT JOIN pipeline_data pl ON pl.leader_id = tl.id
  ),

  -- Add agency names and rankings
  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.leader_name ASC) AS rank_overall
    FROM combined c
    LEFT JOIN agencies ag ON ag.id = c.agency_id
  )

  SELECT
    r.leader_id,
    r.leader_name,
    r.leader_email,
    r.leader_profile_photo_url,
    r.agency_id,
    r.agency_name,
    r.team_size,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.leader_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_leaderboard_data(date, date, integer) TO authenticated;

-- ============================================================================
-- 10. Add comments documenting the new schema
-- ============================================================================

COMMENT ON COLUMN policies.status IS
'Application/underwriting outcome: pending, approved, denied, withdrawn.
This tracks what the carrier decided about the application.';

COMMENT ON COLUMN policies.lifecycle_status IS
'Policy lifecycle after approval: active, lapsed, cancelled, expired.
NULL when status is not approved. This tracks the policy state in force.';

COMMENT ON FUNCTION get_leaderboard_data IS
'Agent leaderboard with IP (Issued Premium) and AP (Annual Premium pending).
IP = policies with lifecycle_status = ''active'' and effective_date in range.
AP = policies with status = ''pending'' (no date filter).';

COMMENT ON FUNCTION get_agency_leaderboard_data IS
'Agency leaderboard with FULL HIERARCHY aggregation.
IP = lifecycle_status = ''active'' policies by effective_date in range.
AP = status = ''pending'' policies (no date filter).';

COMMENT ON FUNCTION get_team_leaderboard_data IS
'Team leaderboard with FULL HIERARCHY aggregation.
IP = lifecycle_status = ''active'' policies by effective_date in range.
AP = status = ''pending'' policies (no date filter).';

-- ============================================================================
-- 11. Update get_team_analytics_data function to include lifecycle_status
-- ============================================================================

DROP FUNCTION IF EXISTS get_team_analytics_data(uuid[], timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_team_analytics_data(
  p_team_user_ids uuid[],
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_caller_id uuid;
BEGIN
  -- Get the calling user's ID for security check
  v_caller_id := auth.uid();

  -- Security check: Verify caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Build the result JSON with all required data
  SELECT json_build_object(
    'policies', COALESCE((
      SELECT json_agg(row_to_json(p))
      FROM (
        SELECT
          pol.id,
          pol.user_id,
          pol.status,
          pol.lifecycle_status,
          pol.annual_premium,
          pol.effective_date,
          pol.product,
          pol.carrier_id,
          pol.client_id,
          pol.policy_number,
          pol.created_at,
          pol.submit_date,
          pol.cancellation_date,
          pol.commission_percentage,
          pol.term_length,
          -- Handle both JSON and plain text formats for address
          CASE
            WHEN cl.address IS NULL THEN 'Unknown'
            WHEN cl.address LIKE '{%' THEN COALESCE((cl.address::jsonb)->>'state', 'Unknown')
            ELSE cl.address
          END AS client_state
        FROM policies pol
        LEFT JOIN clients cl ON cl.id = pol.client_id
        WHERE pol.user_id = ANY(p_team_user_ids)
          AND COALESCE(pol.submit_date, pol.created_at) >= p_start_date
          AND COALESCE(pol.submit_date, pol.created_at) <= p_end_date
      ) p
    ), '[]'::json),
    'commissions', COALESCE((
      SELECT json_agg(row_to_json(c))
      FROM (
        SELECT
          c.id,
          c.user_id,
          c.policy_id,
          c.amount AS commission_amount,
          c.type AS commission_type,
          c.status AS payment_status,
          COALESCE(c.payment_date, c.created_at::date) AS effective_date,
          p.carrier_id,
          p.product AS product_type,
          c.earned_amount,
          c.unearned_amount,
          c.months_paid,
          c.advance_months,
          c.chargeback_amount,
          c.chargeback_date,
          c.payment_date,
          c.created_at
        FROM commissions c
        LEFT JOIN policies p ON p.id = c.policy_id
        WHERE c.user_id = ANY(p_team_user_ids)
          AND c.created_at >= p_start_date
          AND c.created_at <= p_end_date
      ) c
    ), '[]'::json),
    'all_policies', COALESCE((
      SELECT json_agg(row_to_json(ap))
      FROM (
        SELECT
          pol.id,
          pol.user_id,
          pol.status,
          pol.lifecycle_status,
          pol.annual_premium,
          pol.effective_date,
          pol.product,
          pol.carrier_id,
          pol.client_id,
          pol.policy_number,
          pol.created_at,
          pol.submit_date,
          pol.cancellation_date,
          pol.updated_at,
          pol.commission_percentage,
          pol.term_length,
          -- Handle both JSON and plain text formats for address
          CASE
            WHEN cl.address IS NULL THEN 'Unknown'
            WHEN cl.address LIKE '{%' THEN COALESCE((cl.address::jsonb)->>'state', 'Unknown')
            ELSE cl.address
          END AS client_state
        FROM policies pol
        LEFT JOIN clients cl ON cl.id = pol.client_id
        WHERE pol.user_id = ANY(p_team_user_ids)
      ) ap
    ), '[]'::json),
    'all_commissions', COALESCE((
      SELECT json_agg(row_to_json(ac))
      FROM (
        SELECT
          c.id,
          c.user_id,
          c.policy_id,
          c.amount AS commission_amount,
          c.type AS commission_type,
          c.status AS payment_status,
          COALESCE(c.payment_date, c.created_at::date) AS effective_date,
          p.carrier_id,
          p.product AS product_type,
          c.earned_amount,
          c.unearned_amount,
          c.months_paid,
          c.advance_months,
          c.chargeback_amount,
          c.chargeback_date,
          c.payment_date,
          c.created_at,
          c.last_payment_date
        FROM commissions c
        LEFT JOIN policies p ON p.id = c.policy_id
        WHERE c.user_id = ANY(p_team_user_ids)
      ) ac
    ), '[]'::json),
    'agent_targets', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          user_id,
          annual_policies_target,
          avg_premium_target,
          annual_income_target,
          monthly_income_target,
          monthly_expense_target
        FROM user_targets
        WHERE user_id = ANY(p_team_user_ids)
      ) t
    ), '[]'::json),
    'carriers', COALESCE((
      SELECT json_agg(row_to_json(cr))
      FROM (
        SELECT DISTINCT ON (carriers.id)
          carriers.id,
          carriers.name
        FROM carriers
        INNER JOIN policies ON policies.carrier_id = carriers.id
        WHERE policies.user_id = ANY(p_team_user_ids)
      ) cr
    ), '[]'::json),
    'clients', COALESCE((
      SELECT json_agg(row_to_json(cl))
      FROM (
        SELECT DISTINCT ON (clients.id)
          clients.id,
          clients.name
        FROM clients
        INNER JOIN policies ON policies.client_id = clients.id
        WHERE policies.user_id = ANY(p_team_user_ids)
      ) cl
    ), '[]'::json),
    'agent_profiles', COALESCE((
      SELECT json_agg(row_to_json(u))
      FROM (
        SELECT
          id,
          first_name,
          last_name,
          email,
          contract_level,
          roles,
          approval_status,
          COALESCE(state, resident_state) AS state
        FROM user_profiles
        WHERE id = ANY(p_team_user_ids)
      ) u
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_analytics_data(uuid[], timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION get_team_analytics_data IS
'Fetches aggregated analytics data for a team of users.
Returns policies, commissions, targets, carriers, clients, and agent profiles.
Policy filtering uses submit_date (with fallback to created_at) for accurate time-period filtering.
Now includes lifecycle_status for proper active/lapsed/cancelled filtering.';
