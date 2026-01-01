-- REVERT MIGRATION: 20251231_001_fix_getuser_commission_profile_calc.sql
-- Purpose: Rollback to simplified version if issues occur
--
-- WARNING: This will restore the simplified function that returns hardcoded defaults
-- This is ONLY for emergency rollback. The hardcoded version has known issues.

-- Drop the fixed function
DROP FUNCTION IF EXISTS public.getuser_commission_profile(uuid, integer);

-- Restore the simplified version from 20251213_003
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
    v_default_rate numeric;
BEGIN
    -- Get user's current contract level
    SELECT contract_comp_level INTO v_contract_level
    FROM users
    WHERE id = puser_id;

    -- If user not found or no contract level, use default
    IF v_contract_level IS NULL THEN
        v_contract_level := 100; -- Default to "release" level
    END IF;

    -- Set a default commission rate based on contract level
    -- These are reasonable defaults based on typical insurance commission structures
    v_default_rate := CASE
        WHEN v_contract_level >= 140 THEN 0.95  -- premium: 95%
        WHEN v_contract_level >= 120 THEN 0.85  -- enhanced: 85%
        WHEN v_contract_level >= 100 THEN 0.75  -- release: 75%
        ELSE 0.65  -- street: 65%
    END;

    -- Return simplified results with reasonable defaults
    RETURN QUERY
    SELECT
        v_contract_level as contract_level,
        v_default_rate as simple_avg_rate,
        v_default_rate as weighted_avg_rate,
        '[]'::jsonb as product_breakdown, -- Empty array for now
        'DEFAULT' as data_quality, -- Indicate we're using defaults
        NOW() as calculated_at;
END;
$$;

COMMENT ON FUNCTION public.getuser_commission_profile IS
'REVERTED: Simplified commission profile function that returns default commission rates based on contract level.
This is the emergency rollback version. It returns hardcoded rates instead of calculating from actual policies.
DO NOT USE LONG-TERM - reapply the fixed version when issues are resolved.';

GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO service_role;
