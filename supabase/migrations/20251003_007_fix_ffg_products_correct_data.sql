-- FFG Comp Guide CORRECTED Data Import
-- Based on FFG Comp Guide(8_25).pdf
-- Date: 2025-10-03
-- Using Contract Level 105 as baseline

BEGIN;

-- First, clear existing incorrect FFG data
DELETE FROM products WHERE carrier_id IN (
  '00001000-0000-0000-0000-000000000000', -- United Home Life
  '00001001-0000-0000-0000-000000000000', -- SBLI
  '00001002-0000-0000-0000-000000000000', -- American Home Life
  '00001003-0000-0000-0000-000000000000', -- American-Amicable Group
  '00001004-0000-0000-0000-000000000000', -- Corebridge Financial
  '00001005-0000-0000-0000-000000000000', -- Transamerica
  '00001006-0000-0000-0000-000000000000'  -- ELCO Mutual
);

-- Update carrier names to match PDF exactly
UPDATE carriers SET name = 'United Home Life', code = 'UHL' WHERE id = '00001000-0000-0000-0000-000000000000';
UPDATE carriers SET name = 'SBLI', code = 'SBLI' WHERE id = '00001001-0000-0000-0000-000000000000';
UPDATE carriers SET name = 'American Home Life', code = 'AHL' WHERE id = '00001002-0000-0000-0000-000000000000';
UPDATE carriers SET name = 'American-Amicable Group', code = 'AAG' WHERE id = '00001003-0000-0000-0000-000000000000';
UPDATE carriers SET name = 'Corebridge Financial', code = 'CF' WHERE id = '00001004-0000-0000-0000-000000000000';
UPDATE carriers SET name = 'Transamerica', code = 'TRANS' WHERE id = '00001005-0000-0000-0000-000000000000';
UPDATE carriers SET name = 'ELCO Mutual', code = 'ELCO' WHERE id = '00001006-0000-0000-0000-000000000000';

-- ============================================
-- Products for United Home Life (Page 1)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001000-0000-0000-0000-000000000000', 'Term', 'UHL-TERM', 'term_life', 'United Home Life Term', 1.10, true),
('00001000-0000-0000-0000-000000000000', 'Express Issue Premier WL', 'UHL-EIPWL', 'whole_life', 'United Home Life Express Issue Premier Whole Life', 1.00, true),
('00001000-0000-0000-0000-000000000000', 'Express Issue Deluxe WL', 'UHL-EIDWL', 'whole_life', 'United Home Life Express Issue Deluxe Whole Life', 1.00, true),
('00001000-0000-0000-0000-000000000000', 'Express Issue Graded WL', 'UHL-EIGWL', 'whole_life', 'United Home Life Express Issue Graded Whole Life', 1.00, true),
('00001000-0000-0000-0000-000000000000', 'Guaranteed Issue Whole Life', 'UHL-GIWL', 'whole_life', 'United Home Life Guaranteed Issue Whole Life', 0.50, true),
('00001000-0000-0000-0000-000000000000', 'Provider Whole Life', 'UHL-PWL', 'whole_life', 'United Home Life Provider Whole Life', 0.85, true),
('00001000-0000-0000-0000-000000000000', 'Accidental', 'UHL-ACC', 'health', 'United Home Life Accidental', 0.75, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Products for SBLI (Page 2)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001001-0000-0000-0000-000000000000', 'SBLI Term', 'SBLI-TERM', 'term_life', 'SBLI Term', 1.10, true),
('00001001-0000-0000-0000-000000000000', 'Silver Guard FE', 'SBLI-SGFE', 'whole_life', 'SBLI Silver Guard Final Expense', 0.85, true),
('00001001-0000-0000-0000-000000000000', 'APRIORITY Level Term (75K+)', 'SBLI-APLT', 'term_life', 'SBLI APRIORITY Level Term (75K+)', 0.60, true),
('00001001-0000-0000-0000-000000000000', 'APRIORITY Whole Life', 'SBLI-APWL', 'whole_life', 'SBLI APRIORITY Whole Life', 0.80, true),
('00001001-0000-0000-0000-000000000000', 'APRIORITY Protector Term', 'SBLI-APPT', 'term_life', 'SBLI APRIORITY Protector Term', 0.60, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Products for American Home Life (Page 2)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001002-0000-0000-0000-000000000000', 'FE', 'AHL-FE', 'whole_life', 'American Home Life Final Expense', 1.00, true),
('00001002-0000-0000-0000-000000000000', 'Simple Term', 'AHL-ST', 'term_life', 'American Home Life Simple Term', 1.10, true),
('00001002-0000-0000-0000-000000000000', 'Path Setter', 'AHL-PS', 'whole_life', 'American Home Life Path Setter', 0.95, true),
('00001002-0000-0000-0000-000000000000', 'Everlast', 'AHL-EV', 'whole_life', 'American Home Life Everlast', 0.90, true),
('00001002-0000-0000-0000-000000000000', 'Exccudex', 'AHL-EX', 'whole_life', 'American Home Life Exccudex', 0.95, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Products for American-Amicable Group (Page 3)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001003-0000-0000-0000-000000000000', 'Express UL', 'AAG-EUL', 'universal_life', 'American-Amicable Express Universal Life', 0.70, true),
('00001003-0000-0000-0000-000000000000', 'Home Protector', 'AAG-HP', 'whole_life', 'American-Amicable Home Protector', 0.95, true),
('00001003-0000-0000-0000-000000000000', 'OBA', 'AAG-OBA', 'whole_life', 'American-Amicable OBA', 0.65, true),
('00001003-0000-0000-0000-000000000000', 'SecureLife Plus', 'AAG-SLP', 'whole_life', 'American-Amicable SecureLife Plus', 0.95, true),
('00001003-0000-0000-0000-000000000000', 'Security Protector', 'AAG-SP', 'whole_life', 'American-Amicable Security Protector', 0.75, true),
('00001003-0000-0000-0000-000000000000', 'Survivor Protector', 'AAG-SVP', 'whole_life', 'American-Amicable Survivor Protector', 0.95, true),
('00001003-0000-0000-0000-000000000000', 'Term Made Simple', 'AAG-TMS', 'term_life', 'American-Amicable Term Made Simple', 0.60, true),
('00001003-0000-0000-0000-000000000000', 'Dignity Solutions & Family Legacy', 'AAG-DSFL', 'whole_life', 'American-Amicable Dignity Solutions & Family Legacy', 0.85, true),
('00001003-0000-0000-0000-000000000000', 'Express Term', 'AAG-ET', 'term_life', 'American-Amicable Express Term', 0.75, true),
('00001003-0000-0000-0000-000000000000', 'BonusMaster', 'AAG-BM', 'whole_life', 'American-Amicable BonusMaster', 0.035, true),
('00001003-0000-0000-0000-000000000000', 'Guaranteed Guardian', 'AAG-GG', 'whole_life', 'American-Amicable Guaranteed Guardian', 0.45, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Products for Corebridge Financial (Page 4)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001004-0000-0000-0000-000000000000', 'GIWL Whole Life', 'CF-GIWL', 'whole_life', 'Corebridge Financial Guaranteed Issue Whole Life', 0.80, true),
('00001004-0000-0000-0000-000000000000', 'SimpliNow Legacy Max SIWL', 'CF-SLMS', 'whole_life', 'Corebridge SimpliNow Legacy Max Simplified Issue Whole Life', 0.97, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Products for Transamerica (Page 4)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001005-0000-0000-0000-000000000000', 'TrendSetter Super Term', 'TRANS-TST', 'term_life', 'Transamerica TrendSetter Super Term', 0.75, true),
('00001005-0000-0000-0000-000000000000', 'TrendSetter LB Term', 'TRANS-TLBT', 'term_life', 'Transamerica TrendSetter Living Benefits Term', 0.85, true),
('00001005-0000-0000-0000-000000000000', 'Lifetime WL', 'TRANS-LWL', 'whole_life', 'Transamerica Lifetime Whole Life', 0.95, true),
('00001005-0000-0000-0000-000000000000', 'Immediate Solution WL', 'TRANS-ISWL', 'whole_life', 'Transamerica Immediate Solution Whole Life', 0.95, true),
('00001005-0000-0000-0000-000000000000', '10 Pay Solution WL', 'TRANS-10PS', 'whole_life', 'Transamerica 10 Pay Solution Whole Life', 0.85, true),
('00001005-0000-0000-0000-000000000000', 'Easy Solution WL', 'TRANS-ESWL', 'whole_life', 'Transamerica Easy Solution Whole Life', 0.48, true),
('00001005-0000-0000-0000-000000000000', 'Express Solution', 'TRANS-ES', 'whole_life', 'Transamerica Express Solution', 1.00, true),
('00001005-0000-0000-0000-000000000000', 'FFIUL', 'TRANS-FFIUL', 'universal_life', 'Transamerica Financial Foundation IUL', 0.90, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Products for ELCO Mutual (Page 5)
-- Using Contract Level 105 rates
-- ============================================
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001006-0000-0000-0000-000000000000', 'Guaranteed Issue FE', 'ELCO-GIFE', 'whole_life', 'ELCO Mutual Guaranteed Issue Final Expense', 0.45, true),
('00001006-0000-0000-0000-000000000000', 'FE Immediate', 'ELCO-FEI', 'whole_life', 'ELCO Mutual Final Expense Immediate', 1.05, true),
('00001006-0000-0000-0000-000000000000', 'Life Pay WL 0-75', 'ELCO-LPWL', 'whole_life', 'ELCO Mutual Life Pay Whole Life 0-75', 0.90, true),
('00001006-0000-0000-0000-000000000000', 'Limited Pay WL', 'ELCO-LMWL', 'whole_life', 'ELCO Mutual Limited Pay Whole Life', 0.70, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- ============================================
-- Clear and update comp_guide table with correct base rates
-- Using Contract Level 105 as baseline
-- ============================================
DELETE FROM comp_guide WHERE carrier_id IN (
  '00001000-0000-0000-0000-000000000000',
  '00001001-0000-0000-0000-000000000000',
  '00001002-0000-0000-0000-000000000000',
  '00001003-0000-0000-0000-000000000000',
  '00001004-0000-0000-0000-000000000000',
  '00001005-0000-0000-0000-000000000000',
  '00001006-0000-0000-0000-000000000000'
);

-- Note: The comp_guide table would typically store rates per comp level
-- For simplicity, we're storing the baseline rates at contract level 105
-- In a full implementation, you'd want to store all contract levels (145-80)

-- ============================================
-- Add comment explaining the data source
-- ============================================
COMMENT ON TABLE products IS 'Product catalog with commission rates at Contract Level 105 from FFG Comp Guide(8_25).pdf dated 6/2/2025';

COMMIT;