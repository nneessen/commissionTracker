-- FFG Comp Guide Data Import
-- Generated from ffgCompGuideData.ts
-- Date: 2025-10-03

BEGIN;

-- Clear existing sample data
DELETE FROM comp_guide WHERE carrier_id IN (SELECT id FROM carriers WHERE name LIKE '%Sample%' OR name IN ('Mutual of Omaha', 'American General', 'Transamerica', 'North American', 'Family First Life'));
DELETE FROM products WHERE carrier_id IN (SELECT id FROM carriers WHERE name LIKE '%Sample%' OR name IN ('Mutual of Omaha', 'American General', 'Transamerica', 'North American', 'Family First Life'));
DELETE FROM carriers WHERE name LIKE '%Sample%' OR name IN ('Mutual of Omaha', 'American General', 'Transamerica', 'North American', 'Family First Life');

-- Insert FFG carriers
INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
('00001000-0000-0000-0000-000000000000', 'United Home Life', 'UHL', NOW(), NOW()),
('00001001-0000-0000-0000-000000000000', 'SBLI', 'SBLI', NOW(), NOW()),
('00001002-0000-0000-0000-000000000000', 'American Home Life', 'AHL', NOW(), NOW()),
('00001003-0000-0000-0000-000000000000', 'American-Amicable Group', 'AG', NOW(), NOW()),
('00001004-0000-0000-0000-000000000000', 'Corebridge Financial', 'CF', NOW(), NOW()),
('00001005-0000-0000-0000-000000000000', 'Transamerica', 'TRAN', NOW(), NOW()),
('00001006-0000-0000-0000-000000000000', 'ELCO Mutual', 'EM', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, updated_at = NOW();

-- Insert products for each carrier

-- Products for United Home Life
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001000-0000-0000-0000-000000000000', 'Term', 'UHL-1', 'term_life', 'United Home Life Term', 1.0250, true),
('00001000-0000-0000-0000-000000000000', 'Express Issue Premier WL', 'UHL-2', 'whole_life', 'United Home Life Express Issue Premier WL', 1.0250, true),
('00001000-0000-0000-0000-000000000000', 'Express Issue Deluxe WL', 'UHL-3', 'whole_life', 'United Home Life Express Issue Deluxe WL', 1.0250, true),
('00001000-0000-0000-0000-000000000000', 'Express Issue Graded WL', 'UHL-4', 'whole_life', 'United Home Life Express Issue Graded WL', 1.0250, true),
('00001000-0000-0000-0000-000000000000', 'Guaranteed Issue Whole Life', 'UHL-5', 'whole_life', 'United Home Life Guaranteed Issue Whole Life', 0.5286, true),
('00001000-0000-0000-0000-000000000000', 'Provider Whole Life', 'UHL-6', 'whole_life', 'United Home Life Provider Whole Life', 0.8750, true),
('00001000-0000-0000-0000-000000000000', 'Accidental', 'UHL-7', 'health', 'United Home Life Accidental', 0.7750, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Products for SBLI
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001001-0000-0000-0000-000000000000', 'SBLI Term', 'SBLI-1', 'term_life', 'SBLI SBLI Term', 1.1750, true),
('00001001-0000-0000-0000-000000000000', 'Silver Guard FE', 'SBLI-2', 'whole_life', 'SBLI Silver Guard FE', 0.8929, true),
('00001001-0000-0000-0000-000000000000', 'A Priority Level Term (75K+)', 'SBLI-3', 'term_life', 'SBLI A Priority Level Term (75K+)', 0.6179, true),
('00001001-0000-0000-0000-000000000000', 'A Priority Whole Life', 'SBLI-4', 'whole_life', 'SBLI A Priority Whole Life', 0.9536, true),
('00001001-0000-0000-0000-000000000000', 'A Priority Protector Term', 'SBLI-5', 'whole_life', 'SBLI A Priority Protector Term', 0.6179, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Products for American Home Life
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001002-0000-0000-0000-000000000000', 'FE', 'AHL-1', 'whole_life', 'American Home Life FE', 1.0250, true),
('00001002-0000-0000-0000-000000000000', 'Simple Term', 'AHL-2', 'term_life', 'American Home Life Simple Term', 1.1750, true),
('00001002-0000-0000-0000-000000000000', 'Path Setter', 'AHL-3', 'whole_life', 'American Home Life Path Setter', 1.0250, true),
('00001002-0000-0000-0000-000000000000', 'Everlast', 'AHL-4', 'whole_life', 'American Home Life Everlast', 0.9750, true),
('00001002-0000-0000-0000-000000000000', 'Exccudex', 'AHL-5', 'whole_life', 'American Home Life Exccudex', 1.0250, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Products for American-Amicable Group
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001003-0000-0000-0000-000000000000', 'Express UL', 'AG-1', 'universal_life', 'American-Amicable Group Express UL', 0.7750, true),
('00001003-0000-0000-0000-000000000000', 'Home Protector', 'AG-2', 'whole_life', 'American-Amicable Group Home Protector', 1.0250, true),
('00001003-0000-0000-0000-000000000000', 'OBA', 'AG-3', 'whole_life', 'American-Amicable Group OBA', 0.7250, true),
('00001003-0000-0000-0000-000000000000', 'SecureLife Plus', 'AG-4', 'whole_life', 'American-Amicable Group SecureLife Plus', 1.0250, true),
('00001003-0000-0000-0000-000000000000', 'Security Protector', 'AG-5', 'whole_life', 'American-Amicable Group Security Protector', 0.8250, true),
('00001003-0000-0000-0000-000000000000', 'Survivor Protector', 'AG-6', 'whole_life', 'American-Amicable Group Survivor Protector', 1.0250, true),
('00001003-0000-0000-0000-000000000000', 'Term Made Simple', 'AG-7', 'term_life', 'American-Amicable Group Term Made Simple', 0.6750, true),
('00001003-0000-0000-0000-000000000000', 'Dignity Solutions & Family Legacy', 'AG-8', 'whole_life', 'American-Amicable Group Dignity Solutions & Family Legacy', 0.9250, true),
('00001003-0000-0000-0000-000000000000', 'Express Term', 'AG-9', 'term_life', 'American-Amicable Group Express Term', 0.8250, true),
('00001003-0000-0000-0000-000000000000', 'BonusMaster', 'AG-10', 'whole_life', 'American-Amicable Group BonusMaster', 0.0425, true),
('00001003-0000-0000-0000-000000000000', 'Guaranteed Guardian', 'AG-11', 'whole_life', 'American-Amicable Group Guaranteed Guardian', 0.5500, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Products for Corebridge Financial
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001004-0000-0000-0000-000000000000', 'GIWL Whole Life', 'CF-1', 'whole_life', 'Corebridge Financial GIWL Whole Life', 0.8679, true),
('00001004-0000-0000-0000-000000000000', 'SimpliNow Legacy Max SIWL', 'CF-2', 'whole_life', 'Corebridge Financial SimpliNow Legacy Max SIWL', 1.0450, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Products for Transamerica
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001005-0000-0000-0000-000000000000', 'TrendSetter Super Term', 'TRAN-1', 'term_life', 'Transamerica TrendSetter Super Term', 0.7250, true),
('00001005-0000-0000-0000-000000000000', 'TrendSetter LB Term', 'TRAN-2', 'term_life', 'Transamerica TrendSetter LB Term', 0.8250, true),
('00001005-0000-0000-0000-000000000000', 'Lifetime WL', 'TRAN-3', 'whole_life', 'Transamerica Lifetime WL', 1.1250, true),
('00001005-0000-0000-0000-000000000000', 'Immediate Solution WL', 'TRAN-4', 'whole_life', 'Transamerica Immediate Solution WL', 0.9750, true),
('00001005-0000-0000-0000-000000000000', '10 Pay Solution WL', 'TRAN-5', 'whole_life', 'Transamerica 10 Pay Solution WL', 0.7450, true),
('00001005-0000-0000-0000-000000000000', 'Easy Solution WL', 'TRAN-6', 'whole_life', 'Transamerica Easy Solution WL', 0.4750, true),
('00001005-0000-0000-0000-000000000000', 'Express Solution', 'TRAN-7', 'whole_life', 'Transamerica Express Solution', 1.0250, true),
('00001005-0000-0000-0000-000000000000', 'FFIUL', 'TRAN-8', 'universal_life', 'Transamerica FFIUL', 0.8950, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Products for ELCO Mutual
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
('00001006-0000-0000-0000-000000000000', 'Guaranteed Issue FE', 'EM-1', 'whole_life', 'ELCO Mutual Guaranteed Issue FE', 0.3500, true),
('00001006-0000-0000-0000-000000000000', 'FE Immediate', 'EM-2', 'whole_life', 'ELCO Mutual FE Immediate', 0.9250, true),
('00001006-0000-0000-0000-000000000000', 'Life Pay WL 0-75', 'EM-3', 'whole_life', 'ELCO Mutual Life Pay WL 0-75', 0.7750, true),
('00001006-0000-0000-0000-000000000000', 'Limited Pay WL', 'EM-4', 'whole_life', 'ELCO Mutual Limited Pay WL', 0.5750, true)
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Insert commission rates into comp_guide

-- Commission rates for street level
INSERT INTO comp_guide (carrier_id, product_type, comp_level, commission_percentage, bonus_percentage, effective_date) VALUES
('00001000-0000-0000-0000-000000000000', 'term_life', 'street', 0.9500, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'whole_life', 'street', 0.8000, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'health', 'street', 0.5500, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'term_life', 'street', 0.9500, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'whole_life', 'street', 0.3000, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'whole_life', 'street', 0.8000, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'term_life', 'street', 0.9500, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'universal_life', 'street', 0.5500, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'whole_life', 'street', 0.8000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'term_life', 'street', 0.4500, 0, '2025-06-02'),
('00001004-0000-0000-0000-000000000000', 'whole_life', 'street', 0.8000, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'term_life', 'street', 0.5000, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'whole_life', 'street', 0.9000, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'universal_life', 'street', 0.6700, 0, '2025-06-02'),
('00001006-0000-0000-0000-000000000000', 'whole_life', 'street', 0.1000, 0, '2025-06-02')
ON CONFLICT (carrier_id, product_type, comp_level, effective_date) DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Commission rates for release level
INSERT INTO comp_guide (carrier_id, product_type, comp_level, commission_percentage, bonus_percentage, effective_date) VALUES
('00001000-0000-0000-0000-000000000000', 'term_life', 'release', 1.1000, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'whole_life', 'release', 0.9500, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'health', 'release', 0.7000, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'term_life', 'release', 1.1000, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'whole_life', 'release', 0.9500, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'whole_life', 'release', 0.9500, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'term_life', 'release', 1.1000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'universal_life', 'release', 0.7000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'whole_life', 'release', 0.9500, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'term_life', 'release', 0.6000, 0, '2025-06-02'),
('00001004-0000-0000-0000-000000000000', 'whole_life', 'release', 0.8000, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'term_life', 'release', 0.6500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'whole_life', 'release', 1.0500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'universal_life', 'release', 0.8200, 0, '2025-06-02'),
('00001006-0000-0000-0000-000000000000', 'whole_life', 'release', 0.2500, 0, '2025-06-02')
ON CONFLICT (carrier_id, product_type, comp_level, effective_date) DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Commission rates for enhanced level
INSERT INTO comp_guide (carrier_id, product_type, comp_level, commission_percentage, bonus_percentage, effective_date) VALUES
('00001000-0000-0000-0000-000000000000', 'term_life', 'enhanced', 1.3000, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 1.1500, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'health', 'enhanced', 0.9000, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'term_life', 'enhanced', 1.3000, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 1.0500, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 1.1500, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'term_life', 'enhanced', 1.3000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'universal_life', 'enhanced', 0.9000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 1.1500, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'term_life', 'enhanced', 0.8000, 0, '2025-06-02'),
('00001004-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 0.9500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'term_life', 'enhanced', 0.8500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 1.2500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'universal_life', 'enhanced', 1.0200, 0, '2025-06-02'),
('00001006-0000-0000-0000-000000000000', 'whole_life', 'enhanced', 0.4500, 0, '2025-06-02')
ON CONFLICT (carrier_id, product_type, comp_level, effective_date) DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

-- Commission rates for premium level
INSERT INTO comp_guide (carrier_id, product_type, comp_level, commission_percentage, bonus_percentage, effective_date) VALUES
('00001000-0000-0000-0000-000000000000', 'term_life', 'premium', 1.5000, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'whole_life', 'premium', 1.3500, 0, '2025-06-02'),
('00001000-0000-0000-0000-000000000000', 'health', 'premium', 1.1000, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'term_life', 'premium', 1.5000, 0, '2025-06-02'),
('00001001-0000-0000-0000-000000000000', 'whole_life', 'premium', 1.1500, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'whole_life', 'premium', 1.3500, 0, '2025-06-02'),
('00001002-0000-0000-0000-000000000000', 'term_life', 'premium', 1.5000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'universal_life', 'premium', 1.1000, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'whole_life', 'premium', 1.3500, 0, '2025-06-02'),
('00001003-0000-0000-0000-000000000000', 'term_life', 'premium', 1.0000, 0, '2025-06-02'),
('00001004-0000-0000-0000-000000000000', 'whole_life', 'premium', 0.9500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'term_life', 'premium', 1.0500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'whole_life', 'premium', 1.4500, 0, '2025-06-02'),
('00001005-0000-0000-0000-000000000000', 'universal_life', 'premium', 1.2200, 0, '2025-06-02'),
('00001006-0000-0000-0000-000000000000', 'whole_life', 'premium', 0.6500, 0, '2025-06-02')
ON CONFLICT (carrier_id, product_type, comp_level, effective_date) DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  updated_at = NOW();

COMMIT;

-- Verify import
DO $$
DECLARE
    carrier_count INTEGER;
    product_count INTEGER;
    comp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO carrier_count FROM carriers;
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO comp_count FROM comp_guide;
    
    RAISE NOTICE 'Import complete:';
    RAISE NOTICE '  Carriers: %', carrier_count;
    RAISE NOTICE '  Products: %', product_count;
    RAISE NOTICE '  Commission rates: %', comp_count;
END $$;
