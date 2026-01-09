-- supabase/migrations/20260109_003_drop_legacy_users_table.sql
-- Migration: Drop legacy users table
-- Purpose: Remove orphaned 'users' table and update getuser_commission_profile() to use user_profiles
--
-- The 'users' table was a legacy caching table that:
-- - Had no foreign key dependencies
-- - Had no RLS policies
-- - Was only used by getuser_commission_profile() for contract_comp_level lookup
-- - Had most fields blocked from insert/update (never constraints)
--
-- This migration:
-- 1. Updates getuser_commission_profile() to query user_profiles.contract_level instead
-- 2. Drops the legacy users table

-- Step 1: Drop and recreate the function to use user_profiles
DROP FUNCTION IF EXISTS public.getuser_commission_profile(uuid, integer);

CREATE OR REPLACE FUNCTION public.getuser_commission_profile(
    puser_id uuid,
    p_lookback_months integer DEFAULT 12
)
RETURNS TABLE (
    contract_level integer,
    simple_avg_rate numeric,
    weighted_avg_rate numeric,
    product_breakdown jsonb,
    data_quality text,
    calculated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Get user's current contract level from user_profiles (CHANGED from legacy users table)
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
    WITH policy_data AS (
        -- Get all policies for the user in the lookback period
        -- Use comp_guide rate if available, otherwise fall back to product.commission_percentage
        SELECT
            p.id as policy_id,
            p.product_id,
            pr.name as product_name,
            c.name as carrier_name,
            p.monthly_premium,
            p.effective_date,
            COALESCE(cg.commission_percentage, pr.commission_percentage) as commission_percentage
        FROM policies p
        INNER JOIN products pr ON p.product_id = pr.id
        INNER JOIN carriers c ON pr.carrier_id = c.id
        LEFT JOIN comp_guide cg ON
            cg.product_id = p.product_id AND
            cg.carrier_id = pr.carrier_id AND
            cg.contract_level = v_contract_level
        WHERE p.user_id = puser_id
            AND p.status = 'active'
            AND p.effective_date >= v_start_date
            AND p.monthly_premium > 0
            -- CRITICAL: Only include policies that have a commission rate
            AND (cg.commission_percentage IS NOT NULL OR pr.commission_percentage IS NOT NULL)
    ),
    product_aggregates AS (
        -- Aggregate by product
        SELECT
            product_id,
            MAX(product_name) as product_name,
            MAX(carrier_name) as carrier_name,
            AVG(commission_percentage) as avg_commission_rate,
            SUM(monthly_premium) as total_premium,
            COUNT(*) as policy_count,
            MIN(effective_date) as earliest_date
        FROM policy_data
        GROUP BY product_id
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
    -- CRITICAL: Use comp_guide table with product.commission_percentage fallback
    WITH rate_data AS (
        SELECT
            COALESCE(cg.commission_percentage, pr.commission_percentage) as commission_percentage,
            COUNT(DISTINCT p.id) as policy_count,
            SUM(p.monthly_premium) as total_premium
        FROM policies p
        INNER JOIN products pr ON p.product_id = pr.id
        LEFT JOIN comp_guide cg ON
            cg.product_id = pr.id
            AND cg.carrier_id = pr.carrier_id
            AND cg.contract_level = v_contract_level
        WHERE p.user_id = puser_id
            AND p.status = 'active'
            AND p.effective_date >= v_start_date
            AND p.monthly_premium > 0
            -- Only include policies with a commission rate
            AND (cg.commission_percentage IS NOT NULL OR pr.commission_percentage IS NOT NULL)
        GROUP BY COALESCE(cg.commission_percentage, pr.commission_percentage)
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
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.getuser_commission_profile IS
'Calculates comprehensive commission rate profile for a user based on their contract level and historical sales data.
Returns weighted average commission rate (premium-weighted), simple average, product breakdown, and data quality assessment.
Uses user_profiles.contract_level and comp_guide table for commission rates. Data quality levels:
- HIGH: ≥20 policies AND ≥3 different rates
- MEDIUM: ≥10 policies OR ≥2 different rates
- LOW: >0 policies
- DEFAULT: No policies, using comp_guide defaults for contract level
- NONE: No data available';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO service_role;

-- Step 2: Drop the legacy users view (it was a view, not a table)
-- This was handled by migration 20260109_004_drop_users_view.sql
