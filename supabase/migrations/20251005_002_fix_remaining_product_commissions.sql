-- Fix Remaining Product Commission Data (11 products with NULL values)
-- Date: 2025-10-05
-- Purpose: Complete the commission data fix by updating remaining products
--
-- Background: Migration 20251004_fix_products_commission_data.sql fixed 31 products
-- but 11 products still have NULL commission_percentage due to carrier duplicates
-- and missing data for ELCO Mutual and some Transamerica products
--
-- This migration is IDEMPOTENT and can be run multiple times safely.

BEGIN;

-- ============================================
-- DIAGNOSTIC: Check current state
-- ============================================

DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO total_count FROM products;
    SELECT COUNT(*) INTO null_count FROM products WHERE commission_percentage IS NULL;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Fix Remaining Product Commission Data';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total products: %', total_count;
    RAISE NOTICE 'Products with NULL commission: %', null_count;
    RAISE NOTICE '';

    IF null_count > 0 THEN
        RAISE NOTICE 'Products needing updates:';
        FOR rec IN (
            SELECT c.name as carrier, p.name as product
            FROM products p
            JOIN carriers c ON p.carrier_id = c.id
            WHERE p.commission_percentage IS NULL
            ORDER BY c.name, p.name
        )
        LOOP
            RAISE NOTICE '  - % / %', rec.carrier, rec.product;
        END LOOP;
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================
-- FIX 1: John Hancock Products (4 products)
-- These are duplicates of American Home Life products
-- Using same commission rates as AHL
-- ============================================

DO $$ BEGIN
    RAISE NOTICE 'Updating John Hancock products...';
END $$;

-- John Hancock: Everlast (matches American Home Life rate)
UPDATE products SET commission_percentage = 0.90, updated_at = NOW()
WHERE name = 'Everlast'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'John Hancock');

-- John Hancock: Exccudex (matches American Home Life rate)
UPDATE products SET commission_percentage = 0.95, updated_at = NOW()
WHERE name = 'Exccudex'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'John Hancock');

-- John Hancock: Path Setter (matches American Home Life rate)
UPDATE products SET commission_percentage = 0.95, updated_at = NOW()
WHERE name = 'Path Setter'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'John Hancock');

-- John Hancock: Simple Term (matches American Home Life rate)
UPDATE products SET commission_percentage = 1.10, updated_at = NOW()
WHERE name = 'Simple Term'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'John Hancock');

-- ============================================
-- FIX 2: ELCO Mutual Products (2 products)
-- Using conservative industry-standard rates
-- ============================================

DO $$ BEGIN
    RAISE NOTICE 'Updating ELCO Mutual products...';
END $$;

-- ELCO Mutual: FE Immediate (standard Final Expense rate)
UPDATE products SET commission_percentage = 0.80, updated_at = NOW()
WHERE name = 'FE Immediate'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'ELCO Mutual');

-- ELCO Mutual: Guaranteed Issue FE (lower rate for guaranteed issue)
UPDATE products SET commission_percentage = 0.75, updated_at = NOW()
WHERE name = 'Guaranteed Issue FE'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'ELCO Mutual');

-- ============================================
-- FIX 3: Transamerica Products (5 products)
-- Using rates from previous migrations and industry standards
-- ============================================

DO $$ BEGIN
    RAISE NOTICE 'Updating Transamerica products...';
END $$;

-- Transamerica: Easy Solution WL (whole life standard rate)
UPDATE products SET commission_percentage = 0.98, updated_at = NOW()
WHERE name = 'Easy Solution WL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

-- Transamerica: Express Solution (whole life standard rate)
UPDATE products SET commission_percentage = 0.98, updated_at = NOW()
WHERE name = 'Express Solution'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

-- Transamerica: FFIUL (Fixed & Indexed Universal Life - standard IUL rate)
UPDATE products SET commission_percentage = 0.75, updated_at = NOW()
WHERE name = 'FFIUL'
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

-- Transamerica: Trendsetter LB Term (from migration 20251004 data)
UPDATE products SET commission_percentage = 0.83, updated_at = NOW()
WHERE name IN ('Trendsetter LB Term', 'TrendSetter LB Term')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

-- Transamerica: Trendsetter Super Term (from migration 20251004 data)
UPDATE products SET commission_percentage = 0.73, updated_at = NOW()
WHERE name IN ('Trendsetter Super Term', 'TrendSetter Super Term')
AND carrier_id IN (SELECT id FROM carriers WHERE name = 'Transamerica');

-- ============================================
-- VERIFICATION: Check results
-- ============================================

DO $$
DECLARE
    null_count INTEGER;
    has_value_count INTEGER;
    total_count INTEGER;
    jh_everlast_rate DECIMAL(5,4);
    elco_fe_rate DECIMAL(5,4);
    trans_iul_rate DECIMAL(5,4);
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO total_count FROM products;
    SELECT COUNT(*) INTO null_count FROM products WHERE commission_percentage IS NULL;
    SELECT COUNT(*) INTO has_value_count FROM products WHERE commission_percentage IS NOT NULL;

    -- Get specific test cases
    SELECT commission_percentage INTO jh_everlast_rate
    FROM products p
    JOIN carriers c ON p.carrier_id = c.id
    WHERE c.name = 'John Hancock' AND p.name = 'Everlast'
    LIMIT 1;

    SELECT commission_percentage INTO elco_fe_rate
    FROM products p
    JOIN carriers c ON p.carrier_id = c.id
    WHERE c.name = 'ELCO Mutual' AND p.name = 'FE Immediate'
    LIMIT 1;

    SELECT commission_percentage INTO trans_iul_rate
    FROM products p
    JOIN carriers c ON p.carrier_id = c.id
    WHERE c.name = 'Transamerica' AND p.name = 'FFIUL'
    LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total products: %', total_count;
    RAISE NOTICE 'Products with NULL commission: %', null_count;
    RAISE NOTICE 'Products with commission value: %', has_value_count;
    RAISE NOTICE '';

    RAISE NOTICE 'TEST CASES:';
    RAISE NOTICE '1. John Hancock "Everlast"';
    RAISE NOTICE '   Expected: 0.90 (90%%)';
    RAISE NOTICE '   Actual: %', jh_everlast_rate;
    IF jh_everlast_rate = 0.90 THEN
        RAISE NOTICE '   ✓ TEST PASSED';
    ELSE
        RAISE WARNING '   ✗ TEST FAILED';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '2. ELCO Mutual "FE Immediate"';
    RAISE NOTICE '   Expected: 0.80 (80%%)';
    RAISE NOTICE '   Actual: %', elco_fe_rate;
    IF elco_fe_rate = 0.80 THEN
        RAISE NOTICE '   ✓ TEST PASSED';
    ELSE
        RAISE WARNING '   ✗ TEST FAILED';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '3. Transamerica "FFIUL"';
    RAISE NOTICE '   Expected: 0.75 (75%%)';
    RAISE NOTICE '   Actual: %', trans_iul_rate;
    IF trans_iul_rate = 0.75 THEN
        RAISE NOTICE '   ✓ TEST PASSED';
    ELSE
        RAISE WARNING '   ✗ TEST FAILED';
    END IF;

    RAISE NOTICE '';
    IF null_count > 0 THEN
        RAISE WARNING '⚠ WARNING: % products still have NULL commission_percentage', null_count;
        RAISE WARNING 'You may need to add UPDATE statements for these products:';
        FOR rec IN (
            SELECT c.name as carrier, p.name as product
            FROM products p
            JOIN carriers c ON p.carrier_id = c.id
            WHERE p.commission_percentage IS NULL
            ORDER BY c.name, p.name
        )
        LOOP
            RAISE WARNING '  - % / %', rec.carrier, rec.product;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ SUCCESS: ALL PRODUCTS HAVE COMMISSION VALUES!';
    END IF;

    RAISE NOTICE '===========================================';
END $$;

-- Show sample of newly updated data
SELECT
    c.name as carrier_name,
    p.name as product_name,
    p.commission_percentage,
    (p.commission_percentage * 100) as commission_percent_display
FROM products p
JOIN carriers c ON p.carrier_id = c.id
WHERE c.name IN ('John Hancock', 'ELCO Mutual', 'Transamerica')
  AND p.commission_percentage IS NOT NULL
ORDER BY c.name, p.name;

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
    RAISE NOTICE '1. Test in UI: Select John Hancock → Everlast product';
    RAISE NOTICE '2. Enter $100 premium';
    RAISE NOTICE '3. Verify Commission Rate shows: 90.00%%';
    RAISE NOTICE '4. Verify Expected Commission shows: $90.00';
    RAISE NOTICE '5. Repeat for ELCO Mutual and Transamerica products';
    RAISE NOTICE '===========================================';
END $$;
