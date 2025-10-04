-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251004_fix_products_commission_data.sql
--
-- Fix Missing Commission Percentage Data in Products Table
--
-- PROBLEM: All products have commission_percentage = NULL
-- SOLUTION: Update with correct FFG Comp Guide rates (Contract Level 105)
--
-- This migration is IDEMPOTENT and can be run multiple times safely.
--
-- Reference: FFG Comp Guide(8_25).pdf
-- Date: 2025-10-04

BEGIN;

-- ============================================
-- DIAGNOSTIC: Check current state
-- ============================================

DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM products;
    SELECT COUNT(*) INTO null_count FROM products WHERE commission_percentage IS NULL;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Products Commission Data Fix';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total products: %', total_count;
    RAISE NOTICE 'Products with NULL commission: %', null_count;
    RAISE NOTICE '';
END $$;

-- ============================================
-- FIX: Update commission_percentage by carrier and product name
-- ============================================

-- United Home Life Products
UPDATE products SET commission_percentage = 1.10, updated_at = NOW()
WHERE name = 'Term'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'United Home Life');

UPDATE products SET commission_percentage = 1.00, updated_at = NOW()
WHERE name IN ('Express Issue Premier WL', 'Express Issue Deluxe WL', 'Express Issue Graded WL')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'United Home Life');

UPDATE products SET commission_percentage = 0.50, updated_at = NOW()
WHERE name = 'Guaranteed Issue Whole Life'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'United Home Life');

UPDATE products SET commission_percentage = 0.85, updated_at = NOW()
WHERE name = 'Provider Whole Life'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'United Home Life');

UPDATE products SET commission_percentage = 0.75, updated_at = NOW()
WHERE name = 'Accidental'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'United Home Life');

-- SBLI Products
UPDATE products SET commission_percentage = 1.10, updated_at = NOW()
WHERE name = 'SBLI Term'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'SBLI');

UPDATE products SET commission_percentage = 0.85, updated_at = NOW()
WHERE name = 'Silver Guard FE'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'SBLI');

UPDATE products SET commission_percentage = 0.60, updated_at = NOW()
WHERE name IN ('APRIORITY Level Term (75K+)', 'APriority Level Term (75K+)', 'APRIORITY Protector Term', 'APriority Protector Term')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'SBLI');

UPDATE products SET commission_percentage = 0.80, updated_at = NOW()
WHERE name IN ('APRIORITY Whole Life', 'APriority Whole Life')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'SBLI');

-- American Home Life Products
UPDATE products SET commission_percentage = 1.00, updated_at = NOW()
WHERE name = 'FE'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American Home Life');

UPDATE products SET commission_percentage = 1.10, updated_at = NOW()
WHERE name = 'Simple Term'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American Home Life');

UPDATE products SET commission_percentage = 0.95, updated_at = NOW()
WHERE name IN ('Path Setter', 'Exccudex')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American Home Life');

UPDATE products SET commission_percentage = 0.90, updated_at = NOW()
WHERE name = 'Everlast'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American Home Life');

-- American-Amicable Group Products
UPDATE products SET commission_percentage = 0.70, updated_at = NOW()
WHERE name = 'Express UL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.95, updated_at = NOW()
WHERE name IN ('Home Protector', 'SecureLife Plus', 'Survivor Protector')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.65, updated_at = NOW()
WHERE name = 'OBA'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.75, updated_at = NOW()
WHERE name IN ('Security Protector', 'Express Term')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.60, updated_at = NOW()
WHERE name = 'Term Made Simple'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.85, updated_at = NOW()
WHERE name IN ('Dignity Solutions & Family Legacy', 'Dignity Solutions Family Legacy')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.035, updated_at = NOW()
WHERE name = 'BonusMaster'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

UPDATE products SET commission_percentage = 0.45, updated_at = NOW()
WHERE name = 'Guaranteed Guardian'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American-Amicable Group');

-- Corebridge Financial Products
UPDATE products SET commission_percentage = 0.87, updated_at = NOW()
WHERE name IN ('GIWL Whole Life', 'GIWL')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Corebridge Financial');

UPDATE products SET commission_percentage = 1.05, updated_at = NOW()
WHERE name LIKE '%SimpliNow%'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Corebridge Financial');

-- Transamerica Products
UPDATE products SET commission_percentage = 0.73, updated_at = NOW()
WHERE name = 'TrendSetter Super Term'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

UPDATE products SET commission_percentage = 0.83, updated_at = NOW()
WHERE name = 'TrendSetter LB Term'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

UPDATE products SET commission_percentage = 1.13, updated_at = NOW()
WHERE name = 'Lifetime WL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

UPDATE products SET commission_percentage = 0.98, updated_at = NOW()
WHERE name = 'Immediate Solution WL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

UPDATE products SET commission_percentage = 0.75, updated_at = NOW()
WHERE name = '10 Pay Solution WL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

UPDATE products SET commission_percentage = 0.63, updated_at = NOW()
WHERE name = 'Express Issue Graded (Immediate Solution)'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

UPDATE products SET commission_percentage = 0.58, updated_at = NOW()
WHERE name = 'TransACE'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

-- ELCO Mutual Products
UPDATE products SET commission_percentage = 0.80, updated_at = NOW()
WHERE name IN ('Life Pay WL 0-75', 'Life Pay WL 76-85')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'ELCO Mutual');

UPDATE products SET commission_percentage = 0.75, updated_at = NOW()
WHERE name = 'Limited Pay WL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'ELCO Mutual');

-- ============================================
-- VERIFICATION: Check results
-- ============================================

DO $$
DECLARE
    null_count INTEGER;
    has_value_count INTEGER;
    total_count INTEGER;
    ahl_fe_rate DECIMAL(5,4);
BEGIN
    SELECT COUNT(*) INTO total_count FROM products;
    SELECT COUNT(*) INTO null_count FROM products WHERE commission_percentage IS NULL;
    SELECT COUNT(*) INTO has_value_count FROM products WHERE commission_percentage IS NOT NULL;

    -- Get specific test case: American Home Life FE
    SELECT commission_percentage INTO ahl_fe_rate
    FROM products
    WHERE name = 'FE'
    AND carrier_id IN (SELECT id FROM carriers WHERE name = 'American Home Life')
    LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total products: %', total_count;
    RAISE NOTICE 'Products with NULL commission: %', null_count;
    RAISE NOTICE 'Products with commission value: %', has_value_count;
    RAISE NOTICE '';
    RAISE NOTICE 'TEST CASE: American Home Life "FE" product';
    RAISE NOTICE 'Expected: 1.00 (100%%)';
    RAISE NOTICE 'Actual: %', ahl_fe_rate;

    IF ahl_fe_rate = 1.00 THEN
        RAISE NOTICE '✓ TEST PASSED';
    ELSE
        RAISE WARNING '✗ TEST FAILED - FE product commission should be 1.00';
    END IF;

    IF null_count > 0 THEN
        RAISE WARNING '⚠ WARNING: % products still have NULL commission_percentage', null_count;
        RAISE WARNING 'You may need to add UPDATE statements for these products.';
    ELSE
        RAISE NOTICE '✓ ALL PRODUCTS HAVE COMMISSION VALUES';
    END IF;

    RAISE NOTICE '===========================================';
END $$;

-- Show sample of updated data
SELECT
    c.name as carrier_name,
    p.name as product_name,
    p.commission_percentage,
    (p.commission_percentage * 100) as commission_percent_display
FROM products p
JOIN carriers c ON p.carrier_id = c.id
WHERE p.commission_percentage IS NOT NULL
ORDER BY c.name, p.name
LIMIT 20;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test in UI: Select American Home Life → FE product';
    RAISE NOTICE '2. Enter $100 premium';
    RAISE NOTICE '3. Verify Commission Rate shows: 100.00%%';
    RAISE NOTICE '4. Verify Expected Commission shows: $100.00';
    RAISE NOTICE '===========================================';
END $$;
