-- Migration: Fix Product Types Enum
-- Purpose: Align database product types with frontend expectations
-- Created: 2025-12-06
--
-- Fixes TypeScript build errors related to product_type enum

BEGIN;

-- Update existing product types to simplified categories
UPDATE products
SET product_type = 'life'
WHERE product_type IN ('whole_life', 'universal_life', 'term_life', 'variable_life');

UPDATE products
SET product_type = 'other'
WHERE product_type = 'health';

-- Update policies table to match
UPDATE policies
SET product = 'life'
WHERE product IN ('whole_life', 'universal_life', 'term_life', 'variable_life');

UPDATE policies
SET product = 'other'
WHERE product = 'health';

-- Update comp_guide table
UPDATE comp_guide
SET product_type = 'life'
WHERE product_type IN ('whole_life', 'universal_life', 'term_life', 'variable_life');

UPDATE comp_guide
SET product_type = 'other'
WHERE product_type = 'health';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Product types normalized to match frontend';
  RAISE NOTICE '   - Life products consolidated';
  RAISE NOTICE '   - Health changed to Other';
END $$;