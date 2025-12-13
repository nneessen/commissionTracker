-- Migration: 20251213_003_simplified_getuser_commission_profile.sql
-- Purpose: Create simplified getuser_commission_profile function that returns mock data

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.getuser_commission_profile(uuid, integer);

-- Create simplified function that returns basic commission profile data
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

-- Add comment for documentation
COMMENT ON FUNCTION public.getuser_commission_profile IS
'Simplified commission profile function that returns default commission rates based on contract level.
This is a placeholder implementation that prevents 404 errors while the full commission system is being developed.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.getuser_commission_profile TO service_role;