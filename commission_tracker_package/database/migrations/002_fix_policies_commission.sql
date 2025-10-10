-- Fix Policies Commission Percentage
-- Updates NULL or 0 commission_percentage values in policies table
-- Created: 2025-10-08

BEGIN;

DO $$
DECLARE
    updated_count INTEGER := 0;
    default_contract_level INTEGER := 100;
BEGIN
    -- Update policies that have NULL or 0 commission_percentage
    UPDATE policies p
    SET
        commission_percentage = COALESCE(
            -- Try comp_guide first
            (
                SELECT cg.commission_percentage
                FROM comp_guide cg
                WHERE cg.product_id = p.product_id
                AND cg.contract_level = COALESCE(
                    (
                        SELECT (raw_user_meta_data->>'contract_comp_level')::INTEGER
                        FROM auth.users
                        WHERE id = p.user_id
                    ),
                    default_contract_level
                )
                AND cg.effective_date <= p.effective_date
                AND (cg.expiration_date IS NULL OR cg.expiration_date >= p.effective_date)
                ORDER BY cg.effective_date DESC
                LIMIT 1
            ),
            -- Fallback to products table
            (
                SELECT pr.commission_percentage
                FROM products pr
                WHERE pr.id = p.product_id
            ),
            -- Final fallback: 85%
            0.85
        ),
        updated_at = NOW()
    WHERE p.commission_percentage IS NULL OR p.commission_percentage = 0;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RAISE NOTICE 'Updated % policies with commission_percentage', updated_count;
END $$;

COMMIT;
