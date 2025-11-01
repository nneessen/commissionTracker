-- ============================================================================
-- FIX COMP_GUIDE DATA - Populate commission rates for all products
-- ============================================================================
-- The issue: Only American Home Life FE has comp_guide data
-- The fix: Create comp_guide entries for all products based on their commission rates
-- ============================================================================

-- First, check what we have
SELECT
  'Products without comp_guide entries:' as check_type,
  COUNT(DISTINCT p.id) as count
FROM products p
LEFT JOIN comp_guide cg ON cg.product_id = p.id
WHERE cg.id IS NULL;

-- Check current user's contract level
SELECT
  'User contract level:' as info,
  contract_comp_level
FROM auth.users
WHERE id = auth.uid();

-- Create comp_guide entries for all products that don't have them
-- Use the product's commission_percentage and the user's contract level
DO $$
DECLARE
  user_contract_level INT;
  prod RECORD;
BEGIN
  -- Get the current user's contract level
  SELECT contract_comp_level INTO user_contract_level
  FROM auth.users
  WHERE id = auth.uid();

  -- Default to 100 if no user contract level
  IF user_contract_level IS NULL THEN
    user_contract_level := 100;
  END IF;

  -- For each product without comp_guide entry
  FOR prod IN
    SELECT DISTINCT
      p.id as product_id,
      p.commission_percentage,
      p.name as product_name,
      c.name as carrier_name
    FROM products p
    JOIN carriers c ON c.id = p.carrier_id
    LEFT JOIN comp_guide cg ON cg.product_id = p.id
      AND cg.contract_level = user_contract_level
    WHERE cg.id IS NULL
      AND p.commission_percentage IS NOT NULL
  LOOP
    -- Insert comp_guide entry for this product and contract level
    INSERT INTO comp_guide (
      product_id,
      contract_level,
      commission_percentage,
      bonus_percentage,
      effective_date,
      expiration_date,
      created_at,
      updated_at
    ) VALUES (
      prod.product_id,
      user_contract_level,
      prod.commission_percentage,
      0, -- No bonus by default
      '2024-01-01'::DATE, -- Effective from start of year
      NULL, -- No expiration
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Added comp_guide entry for % - % at contract level %',
      prod.carrier_name, prod.product_name, user_contract_level;
  END LOOP;
END $$;

-- Also create entries for common contract levels (if needed)
-- This ensures data exists for different contract levels
DO $$
DECLARE
  prod RECORD;
  contract_level INT;
BEGIN
  -- Common contract levels
  FOR contract_level IN SELECT unnest(ARRAY[80, 85, 90, 95, 100, 105, 110, 115, 120])
  LOOP
    FOR prod IN
      SELECT DISTINCT
        p.id as product_id,
        p.commission_percentage,
        p.name as product_name,
        c.name as carrier_name
      FROM products p
      JOIN carriers c ON c.id = p.carrier_id
      LEFT JOIN comp_guide cg ON cg.product_id = p.id
        AND cg.contract_level = contract_level
      WHERE cg.id IS NULL
        AND p.commission_percentage IS NOT NULL
    LOOP
      -- Calculate scaled commission based on contract level
      -- Higher contract levels get higher commission rates
      DECLARE
        scaled_commission DECIMAL(5,2);
      BEGIN
        -- Scale commission: base * (contract_level / 100)
        -- E.g., 85% base commission at 110 contract = 93.5%
        scaled_commission := prod.commission_percentage * (contract_level::DECIMAL / 100);

        -- Cap at 100% commission
        IF scaled_commission > 1.0 THEN
          scaled_commission := 1.0;
        END IF;

        INSERT INTO comp_guide (
          product_id,
          contract_level,
          commission_percentage,
          bonus_percentage,
          effective_date,
          expiration_date,
          created_at,
          updated_at
        ) VALUES (
          prod.product_id,
          contract_level,
          scaled_commission,
          0, -- No bonus by default
          '2024-01-01'::DATE,
          NULL,
          NOW(),
          NOW()
        );

        RAISE NOTICE 'Added comp_guide for % - % at level % (% commission)',
          prod.carrier_name, prod.product_name, contract_level,
          round(scaled_commission * 100, 2);
      END;
    END LOOP;
  END LOOP;
END $$;

-- Verify the fix
SELECT
  c.name as carrier_name,
  p.name as product_name,
  cg.contract_level,
  cg.commission_percentage,
  cg.bonus_percentage
FROM comp_guide cg
JOIN products p ON p.id = cg.product_id
JOIN carriers c ON c.id = p.carrier_id
ORDER BY c.name, p.name, cg.contract_level;

-- Check that all products now have comp_guide entries
SELECT
  'Products with comp_guide entries after fix:' as status,
  COUNT(DISTINCT p.id) as with_entries,
  (SELECT COUNT(*) FROM products) as total_products
FROM products p
JOIN comp_guide cg ON cg.product_id = p.id;