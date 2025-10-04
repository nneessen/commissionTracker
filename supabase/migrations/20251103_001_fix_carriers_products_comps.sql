-- ============================================
-- Migration: Fix Carriers, Products, and Commission Rates
-- Date: 2025-10-04
-- Risk: HIGH - Modifies core commission structure
-- Generated from: src/data/compGuideData.json
-- ============================================

BEGIN;

-- Phase 1: Create Backup Tables
CREATE TABLE IF NOT EXISTS carriers_backup_20251103 AS SELECT * FROM carriers;
CREATE TABLE IF NOT EXISTS products_backup_20251103 AS SELECT * FROM products;
CREATE TABLE IF NOT EXISTS comp_guide_backup_20251103 AS SELECT * FROM comp_guide;

-- Phase 2: Schema Modification - Add contract_level and product_id columns
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS contract_level INTEGER;
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE comp_guide DROP CONSTRAINT IF EXISTS comp_guide_contract_level_check;
ALTER TABLE comp_guide ADD CONSTRAINT comp_guide_contract_level_check CHECK (contract_level >= 80 AND contract_level <= 145);

-- Phase 3: Clear Existing Data (preserve system/default entries)
DELETE FROM comp_guide WHERE carrier_id IN (
  SELECT id FROM carriers
  WHERE name NOT IN ('System', 'Default', 'Unknown Carrier')
);

DELETE FROM products WHERE carrier_id IN (
  SELECT id FROM carriers
  WHERE name NOT IN ('System', 'Default', 'Unknown Carrier')
);

DELETE FROM carriers
WHERE name NOT IN ('System', 'Default', 'Unknown Carrier');

-- Phase 4: Insert Carriers
-- Using uuid_generate_v5 for deterministic UUIDs based on carrier name

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'United Home Life', 'UHL', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), 'SBLI', 'S', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), 'American Home Life', 'AHL', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), 'John Hancock', 'JH', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'American-Amicable Group', 'AG', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), 'Corebridge Financial', 'CF', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Transamerica', 'T', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();

INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), 'ELCO Mutual', 'EM', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  updated_at = NOW();


-- Phase 5: Insert Products
-- Product types: term, whole_life, universal_life, indexed_universal_life, final_expense, accidental, annuity

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Express Issue Premier WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Express Issue Deluxe WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Express Issue Graded WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Guaranteed Issue Whole Life', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Provider Whole Life', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), 'Accidental', 'health', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), 'SBLI Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), 'Silver Guard FE', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), 'APriority Level Term (75K+)', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), 'APriority Whole Life', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), 'APriority Protector Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), 'FE', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), 'Simple Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), 'Path Setter', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), 'Everlast', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), 'Exccudex', 'universal_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Express UL', 'universal_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Home Protector', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'OBA', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'SecureLife Plus', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Security Protector', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Survivor Protector', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Term Made Simple', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Dignity Solutions & Family Legacy', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Express Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'BonusMaster', 'annuity', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), 'Guaranteed Guardian', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), 'GIWL Whole Life', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), 'SimpliNow Legacy Max SIWL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Trendsetter Super Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Trendsetter LB Term', 'term_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Lifetime WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Immediate Solution WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), '10 Pay Solution WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Easy Solution WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'Express Solution', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), 'FFIUL', 'universal_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), 'Guaranteed Issue FE', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), 'FE Immediate', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), 'Life Pay WL 0-75', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES
  (uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), 'Limited Pay WL', 'whole_life', true, NOW(), NOW())
ON CONFLICT (carrier_id, name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();


-- Phase 6: Drop Old Column and Update Constraints
ALTER TABLE comp_guide DROP COLUMN IF EXISTS comp_level CASCADE;
ALTER TABLE comp_guide ALTER COLUMN contract_level SET NOT NULL;

-- Phase 7: Insert Commission Rates
-- Converting percentages to decimals (e.g., 85% = 0.8500)

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Premier WL'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Deluxe WL'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Express Issue Graded WL'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 80, 0.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 85, 0.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 90, 0.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 95, 0.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 100, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 105, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 110, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 115, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 120, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 125, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 130, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 135, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 140, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Guaranteed Issue Whole Life'), 'whole_life', 145, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 80, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 85, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 90, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 95, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 100, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 105, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 110, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 115, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 120, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 125, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 130, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 135, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 140, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Provider Whole Life'), 'whole_life', 145, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 80, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 85, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 90, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 95, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 100, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 105, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 110, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 115, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 120, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 125, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 130, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 135, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 140, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Term'), 'term_life', 145, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 80, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 85, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 90, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 95, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 100, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 105, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 110, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 115, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 120, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 125, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 130, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 135, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 140, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:United Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:United Home Life:Accidental'), 'health', 145, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 80, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 85, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 90, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 95, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 100, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 105, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 110, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 115, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 120, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 125, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 130, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 135, 1.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 140, 1.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:SBLI Term'), 'term_life', 145, 1.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 80, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 85, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 90, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 95, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 105, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 110, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 115, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 120, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 125, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 130, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 135, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 140, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:Silver Guard FE'), 'whole_life', 145, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 80, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 85, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 90, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 95, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 100, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 105, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 110, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 115, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 120, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 125, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 130, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 135, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 140, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Level Term (75K+)'), 'term_life', 145, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 80, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 85, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 90, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 95, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 100, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 105, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 110, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 115, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 120, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 125, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 130, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 135, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 140, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Whole Life'), 'whole_life', 145, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 80, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 85, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 90, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 95, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 100, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 105, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 110, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 115, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 120, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 125, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 130, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 135, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 140, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:SBLI'), uuid_generate_v5(uuid_ns_url(), 'product:SBLI:APriority Protector Term'), 'term_life', 145, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 80, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 85, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 90, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 95, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 105, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American Home Life'), uuid_generate_v5(uuid_ns_url(), 'product:American Home Life:FE'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 80, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 85, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 90, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 95, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 100, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 105, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 110, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 115, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 120, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 125, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 130, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 135, 1.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 140, 1.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Simple Term'), 'term_life', 145, 1.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Path Setter'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 80, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 85, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 90, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 95, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 105, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 110, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 115, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 120, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 125, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 130, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 135, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 140, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Everlast'), 'whole_life', 145, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:John Hancock'), uuid_generate_v5(uuid_ns_url(), 'product:John Hancock:Exccudex'), 'universal_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 80, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 85, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 90, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 95, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 100, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 105, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 110, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 115, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 120, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 125, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 130, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 135, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 140, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express UL'), 'universal_life', 145, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Home Protector'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 80, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 85, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 90, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 95, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 100, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 105, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 110, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 115, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 120, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 125, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 130, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 135, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 140, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:OBA'), 'whole_life', 145, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:SecureLife Plus'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 80, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 85, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 90, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 95, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 100, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 105, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 110, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 115, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 120, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 125, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 130, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 135, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 140, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Security Protector'), 'whole_life', 145, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 100, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Survivor Protector'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 80, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 85, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 90, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 95, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 100, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 105, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 110, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 115, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 120, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 125, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 130, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 135, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 140, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Term Made Simple'), 'term_life', 145, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 80, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 85, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 90, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 95, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 100, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 105, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 110, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 115, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 120, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 125, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 130, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 135, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 140, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Dignity Solutions & Family Legacy'), 'whole_life', 145, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 80, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 85, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 90, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 95, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 100, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 105, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 110, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 115, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 120, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 125, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 130, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 135, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 140, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Express Term'), 'term_life', 145, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 80, 0.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 85, 0.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 90, 0.0200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 95, 0.0300, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 100, 0.0350, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 105, 0.0350, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 110, 0.0400, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 115, 0.0400, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 120, 0.0425, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 125, 0.0450, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 130, 0.0475, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 135, 0.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 140, 0.0525, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:BonusMaster'), 'annuity', 145, 0.0550, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 80, 0.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 85, 0.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 90, 0.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 95, 0.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 100, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 105, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 110, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 115, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 120, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 125, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 130, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 135, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 140, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:American-Amicable Group'), uuid_generate_v5(uuid_ns_url(), 'product:American-Amicable Group:Guaranteed Guardian'), 'whole_life', 145, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 80, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 85, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 90, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 95, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 100, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 105, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 110, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 115, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 120, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 125, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 130, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 135, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 140, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:GIWL Whole Life'), 'whole_life', 145, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 80, 0.7200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 85, 0.7700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 90, 0.8200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 95, 0.8700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 100, 0.9200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 105, 0.9700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 110, 1.0200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 115, 1.0700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 120, 1.1200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 125, 1.1700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 130, 1.2200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 135, 1.2700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 140, 1.3200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Corebridge Financial'), uuid_generate_v5(uuid_ns_url(), 'product:Corebridge Financial:SimpliNow Legacy Max SIWL'), 'whole_life', 145, 1.3700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 80, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 85, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 90, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 95, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 100, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 105, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 110, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 115, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 120, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 125, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 130, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 135, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 140, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter Super Term'), 'term_life', 145, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 80, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 85, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 90, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 95, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 105, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 110, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 115, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 120, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 125, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 130, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 135, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 140, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Trendsetter LB Term'), 'term_life', 145, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 80, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 85, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 90, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 95, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 100, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 120, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 135, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 140, 1.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Lifetime WL'), 'whole_life', 145, 1.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 80, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 85, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 90, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 95, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 100, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 105, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 110, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 115, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 120, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 130, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 135, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 140, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Immediate Solution WL'), 'whole_life', 145, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 80, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 85, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 90, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 95, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 105, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 110, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 115, 0.9200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 120, 0.9200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 125, 0.9400, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 130, 0.9800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 135, 0.9800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 140, 1.0200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:10 Pay Solution WL'), 'whole_life', 145, 1.0700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 80, 0.2800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 85, 0.3300, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 90, 0.3800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 95, 0.4300, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 100, 0.4800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 105, 0.4800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 110, 0.5300, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 115, 0.5800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 120, 0.5800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 125, 0.6300, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 130, 0.6800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 135, 0.6800, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 140, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Easy Solution WL'), 'whole_life', 145, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 80, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 85, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 90, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 95, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 100, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 105, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 110, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 115, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 125, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 130, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 135, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 140, 1.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:Express Solution'), 'whole_life', 145, 1.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 80, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 85, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 105, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 110, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 115, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 120, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 125, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 130, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 135, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 140, 1.1700, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:Transamerica'), uuid_generate_v5(uuid_ns_url(), 'product:Transamerica:FFIUL'), 'universal_life', 145, 1.2200, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 80, 0.3000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 85, 0.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 90, 0.3500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 95, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 100, 0.4000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 105, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 110, 0.4500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 115, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 120, 0.5000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 125, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 130, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 135, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 140, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Guaranteed Issue FE'), 'whole_life', 145, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 80, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 85, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 90, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 95, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 100, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 105, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 110, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 115, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 120, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 125, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 130, 1.1500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 135, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 140, 1.2000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:FE Immediate'), 'whole_life', 145, 1.2500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 80, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 85, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 90, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 95, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 100, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 105, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 110, 0.9000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 115, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 120, 0.9500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 125, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 130, 1.0000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 135, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 140, 1.0500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Life Pay WL 0-75'), 'whole_life', 145, 1.1000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 80, 0.5500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 85, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 90, 0.6000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 95, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 100, 0.6500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 105, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 110, 0.7000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 115, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 120, 0.7500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 125, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 130, 0.8000, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 135, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 140, 0.8500, '2025-01-01', NOW(), NOW());

INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES
  (uuid_generate_v4(), uuid_generate_v5(uuid_ns_url(), 'carrier:ELCO Mutual'), uuid_generate_v5(uuid_ns_url(), 'product:ELCO Mutual:Limited Pay WL'), 'whole_life', 145, 0.9000, '2025-01-01', NOW(), NOW());


-- Add unique constraint for contract_level with product_id
ALTER TABLE comp_guide ADD CONSTRAINT comp_guide_product_contract_unique
  UNIQUE(product_id, contract_level, effective_date);

-- Phase 8: Update Indexes
DROP INDEX IF EXISTS idx_comp_guide_carrier_product_level;
DROP INDEX IF EXISTS idx_comp_guide_comp_level;
DROP INDEX IF EXISTS idx_comp_guide_lookup;
CREATE INDEX IF NOT EXISTS idx_comp_guide_lookup ON comp_guide(carrier_id, product_type, contract_level);
CREATE INDEX IF NOT EXISTS idx_comp_guide_contract_level ON comp_guide(contract_level);

-- Phase 9: Validation
DO $$
DECLARE
  new_carrier_count INTEGER;
  new_product_count INTEGER;
  new_comp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_carrier_count FROM carriers WHERE name NOT IN ('System', 'Default', 'Unknown Carrier');
  SELECT COUNT(*) INTO new_product_count FROM products;
  SELECT COUNT(*) INTO new_comp_count FROM comp_guide WHERE contract_level IS NOT NULL;

  RAISE NOTICE 'Migration complete - Carriers: %, Products: %, Comp Rates: %',
    new_carrier_count, new_product_count, new_comp_count;

  IF new_carrier_count < 8 THEN
    RAISE EXCEPTION 'Expected 8 carriers, got %', new_carrier_count;
  END IF;

  IF new_comp_count < 588 THEN
    RAISE EXCEPTION 'Expected 588 commission rates, got %', new_comp_count;
  END IF;
END $$;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (Run if needed)
-- ============================================
/*
BEGIN;
  TRUNCATE carriers, products, comp_guide CASCADE;
  INSERT INTO carriers SELECT * FROM carriers_backup_20251103;
  INSERT INTO products SELECT * FROM products_backup_20251103;
  INSERT INTO comp_guide SELECT * FROM comp_guide_backup_20251103;

  -- Restore comp_level column if needed
  ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS comp_level comp_level;
  ALTER TABLE comp_guide DROP COLUMN IF EXISTS contract_level;

  DROP TABLE carriers_backup_20251103;
  DROP TABLE products_backup_20251103;
  DROP TABLE comp_guide_backup_20251103;
COMMIT;
*/