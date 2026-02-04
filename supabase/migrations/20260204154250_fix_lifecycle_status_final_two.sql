-- supabase/migrations/20260204154250_fix_lifecycle_status_final_two.sql
-- Migration: Fix final 2 functions to use lifecycle_status instead of status='active'
-- These functions have multiple overloads. Only the old signatures still use the wrong pattern.

-- ============================================================================
-- 1. Drop and recreate get_top_performers_report(p_limit, p_start_date, p_end_date)
-- ============================================================================

DROP FUNCTION IF EXISTS get_top_performers_report(integer, date, date);

CREATE OR REPLACE FUNCTION get_top_performers_report(
  p_limit integer DEFAULT 20,
  p_start_date date DEFAULT (date_trunc('year', CURRENT_DATE))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  agent_email text,
  agency_name text,
  agency_id uuid,
  contract_level integer,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  avg_premium_per_policy numeric,
  rank_in_imo integer,
  rank_in_agency integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_imo_id uuid;
  v_safe_limit integer;
BEGIN
  -- Validate date range (max 24 months)
  PERFORM validate_report_date_range(p_start_date, p_end_date, 24);

  -- Clamp limit to prevent abuse (1-100)
  v_safe_limit := GREATEST(1, LEAST(p_limit, 100));

  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH agent_performance AS (
    SELECT
      up.id AS agent_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) AS agent_name,
      up.email AS agent_email,
      a.name AS agency_name,
      a.id AS agency_id,
      up.contract_level,
      COALESCE(policy_stats.new_policies, 0)::bigint AS new_policies,
      COALESCE(policy_stats.new_premium, 0)::numeric AS new_premium,
      COALESCE(commission_stats.commissions_earned, 0)::numeric AS commissions_earned,
      CASE
        WHEN COALESCE(policy_stats.new_policies, 0) > 0
        THEN ROUND(COALESCE(policy_stats.new_premium, 0) / policy_stats.new_policies, 2)
        ELSE 0
      END::numeric AS avg_premium_per_policy
    FROM user_profiles up
    INNER JOIN agencies a ON up.agency_id = a.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS new_policies,
        SUM(p.annual_premium) AS new_premium
      FROM policies p
      WHERE p.user_id = up.id
        AND p.lifecycle_status = 'active'
        AND p.effective_date >= p_start_date
        AND p.effective_date <= p_end_date
    ) policy_stats ON true
    LEFT JOIN LATERAL (
      SELECT SUM(c.earned_amount) AS commissions_earned
      FROM commissions c
      WHERE c.user_id = up.id
        AND c.payment_date >= p_start_date
        AND c.payment_date <= p_end_date
    ) commission_stats ON true
    WHERE up.imo_id = v_imo_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  )
  SELECT
    ap.agent_id,
    ap.agent_name,
    ap.agent_email,
    ap.agency_name,
    ap.agency_id,
    ap.contract_level,
    ap.new_policies,
    ap.new_premium,
    ap.commissions_earned,
    ap.avg_premium_per_policy,
    RANK() OVER (ORDER BY ap.new_premium DESC)::integer AS rank_in_imo,
    RANK() OVER (PARTITION BY ap.agency_id ORDER BY ap.new_premium DESC)::integer AS rank_in_agency
  FROM agent_performance ap
  WHERE ap.new_premium > 0
  ORDER BY ap.new_premium DESC
  LIMIT v_safe_limit;
END;
$function$;

-- ============================================================================
-- 2. Drop and recreate getuser_commission_profile(puser_id, p_lookback_months)
-- ============================================================================

DROP FUNCTION IF EXISTS getuser_commission_profile(uuid, integer);

CREATE OR REPLACE FUNCTION getuser_commission_profile(
  puser_id uuid,
  p_lookback_months integer DEFAULT 12
)
RETURNS TABLE(
  contract_level integer,
  simple_avg_rate numeric,
  weighted_avg_rate numeric,
  product_breakdown jsonb,
  data_quality text,
  calculated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_contract_level integer;
    v_start_date date;
    v_total_premium numeric := 0;
    v_weighted_sum numeric := 0;
    v_simple_sum numeric := 0;
    v_rate_count integer := 0;
    v_product_data jsonb := '[]'::jsonb;
    v_data_quality text;
    v_policy_count integer := 0;
    v_default_avg numeric;
    -- Constants for data quality thresholds
    v_high_quality_policy_threshold CONSTANT integer := 20;
    v_high_quality_rate_threshold CONSTANT integer := 3;
    v_medium_quality_policy_threshold CONSTANT integer := 10;
    v_medium_quality_rate_threshold CONSTANT integer := 2;
BEGIN
    -- SECURITY: Verify user can only access their own data or is admin/super_admin
    IF puser_id != auth.uid() AND NOT is_super_admin() AND NOT is_imo_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Cannot access other users commission profiles';
    END IF;

    -- VALIDATION: Ensure lookback period is within acceptable range
    IF p_lookback_months < 1 OR p_lookback_months > 60 THEN
        RAISE EXCEPTION 'Invalid lookback period: must be between 1 and 60 months, got %', p_lookback_months;
    END IF;

    -- Get user's current contract level from user_profiles (NOT legacy users table)
    SELECT up.contract_level INTO v_contract_level
    FROM user_profiles up
    WHERE up.id = puser_id;

    -- If user not found or no contract level, return graceful degradation instead of exception
    IF v_contract_level IS NULL THEN
        RETURN QUERY SELECT
            NULL::integer as contract_level,
            0::numeric as simple_avg_rate,
            0::numeric as weighted_avg_rate,
            '[]'::jsonb as product_breakdown,
            'NONE'::text as data_quality,
            NOW() as calculated_at;
        RETURN;
    END IF;

    -- Calculate lookback date
    v_start_date := CURRENT_DATE - INTERVAL '1 month' * p_lookback_months;

    -- Build product breakdown with commission rates and premium weights
    -- FIX: Now uses policies.commission_percentage as PRIMARY source
    WITH policy_data AS (
        -- Get all policies for the user in the lookback period
        -- CASCADE ORDER: policy rate > comp_guide rate > product rate
        SELECT
            p.id as policy_id,
            p.product_id,
            COALESCE(pr.name, p.product::text) as product_name,
            c.name as carrier_name,
            p.monthly_premium,
            p.effective_date,
            -- FIX: Use policies.commission_percentage FIRST, then fall back to comp_guide/products
            COALESCE(
                p.commission_percentage,     -- PRIMARY: Policy's stored rate
                cg.commission_percentage,    -- FALLBACK 1: comp_guide lookup
                pr.commission_percentage     -- FALLBACK 2: product default
            ) as commission_percentage
        FROM policies p
        LEFT JOIN products pr ON p.product_id = pr.id
        INNER JOIN carriers c ON p.carrier_id = c.id
        LEFT JOIN comp_guide cg ON
            cg.product_id = p.product_id AND
            cg.carrier_id = COALESCE(pr.carrier_id, p.carrier_id) AND
            cg.contract_level = v_contract_level
        WHERE p.user_id = puser_id
            AND p.lifecycle_status = 'active'
            AND p.effective_date >= v_start_date
            AND p.monthly_premium > 0
            -- FIX: Include policies that have commission_percentage directly set
            AND (
                p.commission_percentage IS NOT NULL
                OR cg.commission_percentage IS NOT NULL
                OR pr.commission_percentage IS NOT NULL
            )
    ),
    product_aggregates AS (
        -- Aggregate by product (or carrier if no product)
        SELECT
            COALESCE(product_id::text, 'unknown') as product_id,
            MAX(product_name) as product_name,
            MAX(carrier_name) as carrier_name,
            AVG(commission_percentage) as avg_commission_rate,
            SUM(monthly_premium) as total_premium,
            COUNT(*) as policy_count,
            MIN(effective_date) as earliest_date
        FROM policy_data
        GROUP BY COALESCE(product_id::text, 'unknown')
    ),
    total_premium_calc AS (
        -- Calculate total premium across all products
        SELECT SUM(total_premium) as grand_total
        FROM product_aggregates
    )
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'productId', pa.product_id,
                'productName', pa.product_name,
                'carrierName', pa.carrier_name,
                'commissionRate', ROUND(pa.avg_commission_rate, 4),
                'premiumWeight', CASE
                    WHEN tpc.grand_total > 0
                    THEN ROUND(pa.total_premium / tpc.grand_total, 4)
                    ELSE 0
                END,
                'totalPremium', ROUND(pa.total_premium, 2),
                'policyCount', pa.policy_count,
                'effectiveDate', pa.earliest_date
            )
            ORDER BY pa.total_premium DESC
        ) INTO v_product_data
    FROM product_aggregates pa
    CROSS JOIN total_premium_calc tpc;

    -- Calculate simple and weighted averages
    -- FIX: Use policies.commission_percentage as primary source
    WITH rate_data AS (
        SELECT
            -- FIX: Policy's commission_percentage is PRIMARY source
            COALESCE(
                p.commission_percentage,     -- PRIMARY: Policy's stored rate
                cg.commission_percentage,    -- FALLBACK 1: comp_guide lookup
                pr.commission_percentage     -- FALLBACK 2: product default
            ) as commission_percentage,
            COUNT(DISTINCT p.id) as policy_count,
            SUM(p.monthly_premium) as total_premium
        FROM policies p
        LEFT JOIN products pr ON p.product_id = pr.id
        LEFT JOIN comp_guide cg ON
            cg.product_id = pr.id
            AND cg.carrier_id = COALESCE(pr.carrier_id, p.carrier_id)
            AND cg.contract_level = v_contract_level
        WHERE p.user_id = puser_id
            AND p.lifecycle_status = 'active'
            AND p.effective_date >= v_start_date
            AND p.monthly_premium > 0
            -- FIX: Include policies with commission_percentage set
            AND (
                p.commission_percentage IS NOT NULL
                OR cg.commission_percentage IS NOT NULL
                OR pr.commission_percentage IS NOT NULL
            )
        GROUP BY COALESCE(
            p.commission_percentage,
            cg.commission_percentage,
            pr.commission_percentage
        )
    )
    SELECT
        COALESCE(SUM(total_premium), 0),
        COALESCE(SUM(commission_percentage * total_premium), 0),
        COALESCE(SUM(commission_percentage), 0),
        COALESCE(COUNT(DISTINCT commission_percentage), 0),
        COALESCE(SUM(policy_count), 0)
    INTO v_total_premium, v_weighted_sum, v_simple_sum, v_rate_count, v_policy_count
    FROM rate_data;

    -- Determine data quality based on policy count and rate diversity using constants
    IF v_policy_count >= v_high_quality_policy_threshold AND v_rate_count >= v_high_quality_rate_threshold THEN
        v_data_quality := 'HIGH';
    ELSIF v_policy_count >= v_medium_quality_policy_threshold OR v_rate_count >= v_medium_quality_rate_threshold THEN
        v_data_quality := 'MEDIUM';
    ELSIF v_policy_count > 0 THEN
        v_data_quality := 'LOW';
    ELSE
        -- No policies found, try to get default rates from comp_guide
        -- Get average rate for user's contract level
        SELECT AVG(cg.commission_percentage)
        INTO v_default_avg
        FROM comp_guide cg
        WHERE cg.contract_level = v_contract_level;

        IF v_default_avg IS NOT NULL THEN
            -- Store the average directly (don't divide by count later)
            v_simple_sum := v_default_avg;
            v_weighted_sum := v_default_avg; -- Same for weighted since no policy weights
            v_rate_count := 1; -- Set to 1 to indicate we have a default value
            v_data_quality := 'DEFAULT';
        ELSE
            v_data_quality := 'NONE';
        END IF;
    END IF;

    -- Return the results
    RETURN QUERY
    SELECT
        v_contract_level,
        CASE
            WHEN v_rate_count > 0 AND v_data_quality != 'DEFAULT' THEN ROUND(v_simple_sum / v_rate_count, 4)
            WHEN v_data_quality = 'DEFAULT' THEN ROUND(v_simple_sum, 4) -- Already averaged
            ELSE 0
        END as simple_avg_rate,
        CASE
            WHEN v_total_premium > 0 THEN ROUND(v_weighted_sum / v_total_premium, 4)
            WHEN v_rate_count > 0 AND v_data_quality != 'DEFAULT' THEN ROUND(v_simple_sum / v_rate_count, 4)
            WHEN v_data_quality = 'DEFAULT' THEN ROUND(v_weighted_sum, 4) -- Already averaged
            ELSE 0
        END as weighted_avg_rate,
        COALESCE(v_product_data, '[]'::jsonb) as product_breakdown,
        v_data_quality as data_quality,
        NOW() as calculated_at;
END;
$function$;
