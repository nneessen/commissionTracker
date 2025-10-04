#!/usr/bin/env node

/**
 * Generate SQL migration for carriers, products, and commission rates
 * Reads from src/data/compGuideData.json and generates SQL statements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JSON data
const dataPath = path.join(__dirname, '..', 'src', 'data', 'compGuideData.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Map JSON product types to database enum values
const productTypeMap = {
  'term': 'term_life',
  'whole_life': 'whole_life',
  'universal_life': 'universal_life',
  'indexed_universal_life': 'universal_life', // Map to universal_life
  'final_expense': 'whole_life', // Final expense is typically whole life
  'accidental': 'health', // Accidental death is a health product
  'annuity': 'annuity'
};

function mapProductType(jsonType) {
  const mapped = productTypeMap[jsonType];
  if (!mapped) {
    console.warn(`Warning: Unknown product type '${jsonType}', defaulting to 'whole_life'`);
    return 'whole_life';
  }
  return mapped;
}

// Statistics
let carrierCount = 0;
let productCount = 0;
let commissionRateCount = 0;

// SQL output
const sqlStatements = [];

// Header
sqlStatements.push(`-- ============================================`);
sqlStatements.push(`-- Migration: Fix Carriers, Products, and Commission Rates`);
sqlStatements.push(`-- Date: ${new Date().toISOString().split('T')[0]}`);
sqlStatements.push(`-- Risk: HIGH - Modifies core commission structure`);
sqlStatements.push(`-- Generated from: src/data/compGuideData.json`);
sqlStatements.push(`-- ============================================\n`);

sqlStatements.push(`BEGIN;\n`);

// Phase 1: Create Backup Tables
sqlStatements.push(`-- Phase 1: Create Backup Tables`);
sqlStatements.push(`CREATE TABLE IF NOT EXISTS carriers_backup_20251103 AS SELECT * FROM carriers;`);
sqlStatements.push(`CREATE TABLE IF NOT EXISTS products_backup_20251103 AS SELECT * FROM products;`);
sqlStatements.push(`CREATE TABLE IF NOT EXISTS comp_guide_backup_20251103 AS SELECT * FROM comp_guide;\n`);

// Phase 2: Schema Modification
sqlStatements.push(`-- Phase 2: Schema Modification - Add contract_level and product_id columns`);
sqlStatements.push(`ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS contract_level INTEGER;`);
sqlStatements.push(`ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;`);
sqlStatements.push(`ALTER TABLE comp_guide DROP CONSTRAINT IF EXISTS comp_guide_contract_level_check;`);
sqlStatements.push(`ALTER TABLE comp_guide ADD CONSTRAINT comp_guide_contract_level_check CHECK (contract_level >= 80 AND contract_level <= 145);\n`);

// Phase 3: Clear Existing Data
sqlStatements.push(`-- Phase 3: Clear Existing Data (preserve system/default entries)`);
sqlStatements.push(`DELETE FROM comp_guide WHERE carrier_id IN (`);
sqlStatements.push(`  SELECT id FROM carriers`);
sqlStatements.push(`  WHERE name NOT IN ('System', 'Default', 'Unknown Carrier')`);
sqlStatements.push(`);`);
sqlStatements.push(``);
sqlStatements.push(`DELETE FROM products WHERE carrier_id IN (`);
sqlStatements.push(`  SELECT id FROM carriers`);
sqlStatements.push(`  WHERE name NOT IN ('System', 'Default', 'Unknown Carrier')`);
sqlStatements.push(`);`);
sqlStatements.push(``);
sqlStatements.push(`DELETE FROM carriers`);
sqlStatements.push(`WHERE name NOT IN ('System', 'Default', 'Unknown Carrier');\n`);

// Phase 4: Insert Carriers with deterministic UUIDs based on name
sqlStatements.push(`-- Phase 4: Insert Carriers`);
sqlStatements.push(`-- Using uuid_generate_v5 for deterministic UUIDs based on carrier name\n`);

const carrierUUIDs = new Map();

data.forEach(carrier => {
  carrierCount++;
  const carrierName = carrier.carrierName;
  const carrierCode = carrierName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 10);

  sqlStatements.push(`INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES`);
  sqlStatements.push(`  (uuid_generate_v5(uuid_ns_url(), 'carrier:${carrierName}'), '${carrierName.replace(/'/g, "''")}', '${carrierCode}', NOW(), NOW())`);
  sqlStatements.push(`ON CONFLICT (name) DO UPDATE SET`);
  sqlStatements.push(`  code = EXCLUDED.code,`);
  sqlStatements.push(`  updated_at = NOW();`);
  sqlStatements.push(``);

  // Store UUID for later use
  carrierUUIDs.set(carrierName, `uuid_generate_v5(uuid_ns_url(), 'carrier:${carrierName}')`);
});

// Phase 5: Insert Products
sqlStatements.push(`\n-- Phase 5: Insert Products`);
sqlStatements.push(`-- Product types: term, whole_life, universal_life, indexed_universal_life, final_expense, accidental, annuity\n`);

const productUUIDs = new Map();

data.forEach(carrier => {
  const carrierName = carrier.carrierName;
  const carrierUUID = carrierUUIDs.get(carrierName);

  carrier.products.forEach(product => {
    productCount++;
    const productName = product.productName;
    const productType = mapProductType(product.productType); // Map to DB enum
    const productKey = `${carrierName}:${productName}`;

    sqlStatements.push(`INSERT INTO products (id, carrier_id, name, product_type, is_active, created_at, updated_at) VALUES`);
    sqlStatements.push(`  (uuid_generate_v5(uuid_ns_url(), 'product:${carrierName}:${productName}'), ${carrierUUID}, '${productName.replace(/'/g, "''")}', '${productType}', true, NOW(), NOW())`);
    sqlStatements.push(`ON CONFLICT (carrier_id, name) DO UPDATE SET`);
    sqlStatements.push(`  product_type = EXCLUDED.product_type,`);
    sqlStatements.push(`  is_active = EXCLUDED.is_active,`);
    sqlStatements.push(`  updated_at = NOW();`);
    sqlStatements.push(``);

    // Store UUID and product type for later use
    productUUIDs.set(productKey, { uuid: `uuid_generate_v5(uuid_ns_url(), 'product:${carrierName}:${productName}')`, productType });
  });
});

// Phase 6: Drop Old Column and Update Constraints FIRST
sqlStatements.push(`\n-- Phase 6: Drop Old Column and Update Constraints`);
sqlStatements.push(`ALTER TABLE comp_guide DROP COLUMN IF EXISTS comp_level CASCADE;`);
sqlStatements.push(`ALTER TABLE comp_guide ALTER COLUMN contract_level SET NOT NULL;\n`);

// Phase 7: Insert Commission Rates
sqlStatements.push(`-- Phase 7: Insert Commission Rates`);
sqlStatements.push(`-- Converting percentages to decimals (e.g., 85% = 0.8500)\n`);

data.forEach(carrier => {
  const carrierName = carrier.carrierName;
  const carrierUUID = carrierUUIDs.get(carrierName);

  carrier.products.forEach(product => {
    const productName = product.productName;
    const productKey = `${carrierName}:${productName}`;
    const productInfo = productUUIDs.get(productKey);
    const productType = productInfo.productType; // Use mapped product type

    product.commissionRates.forEach(rate => {
      commissionRateCount++;
      const contractLevel = rate.contractLevel;
      const percentage = (rate.percentage / 100).toFixed(4); // Convert to decimal

      sqlStatements.push(`INSERT INTO comp_guide (id, carrier_id, product_id, product_type, contract_level, commission_percentage, effective_date, created_at, updated_at) VALUES`);
      sqlStatements.push(`  (uuid_generate_v4(), ${carrierUUID}, ${productInfo.uuid}, '${productType}', ${contractLevel}, ${percentage}, '2025-01-01', NOW(), NOW());`);
      sqlStatements.push(``);
    });
  });
});

// Add unique constraint for contract_level with product_id (old one was dropped with CASCADE)
sqlStatements.push(`\n-- Add unique constraint for contract_level with product_id`);
sqlStatements.push(`ALTER TABLE comp_guide ADD CONSTRAINT comp_guide_product_contract_unique`);
sqlStatements.push(`  UNIQUE(product_id, contract_level, effective_date);\n`);

// Phase 8: Update Indexes
sqlStatements.push(`-- Phase 8: Update Indexes`);
sqlStatements.push(`DROP INDEX IF EXISTS idx_comp_guide_carrier_product_level;`);
sqlStatements.push(`DROP INDEX IF EXISTS idx_comp_guide_comp_level;`);
sqlStatements.push(`DROP INDEX IF EXISTS idx_comp_guide_lookup;`);
sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_comp_guide_lookup ON comp_guide(carrier_id, product_type, contract_level);`);
sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_comp_guide_contract_level ON comp_guide(contract_level);\n`);

// Phase 9: Validation
sqlStatements.push(`-- Phase 9: Validation`);
sqlStatements.push(`DO $$`);
sqlStatements.push(`DECLARE`);
sqlStatements.push(`  new_carrier_count INTEGER;`);
sqlStatements.push(`  new_product_count INTEGER;`);
sqlStatements.push(`  new_comp_count INTEGER;`);
sqlStatements.push(`BEGIN`);
sqlStatements.push(`  SELECT COUNT(*) INTO new_carrier_count FROM carriers WHERE name NOT IN ('System', 'Default', 'Unknown Carrier');`);
sqlStatements.push(`  SELECT COUNT(*) INTO new_product_count FROM products;`);
sqlStatements.push(`  SELECT COUNT(*) INTO new_comp_count FROM comp_guide WHERE contract_level IS NOT NULL;`);
sqlStatements.push(``);
sqlStatements.push(`  RAISE NOTICE 'Migration complete - Carriers: %, Products: %, Comp Rates: %',`);
sqlStatements.push(`    new_carrier_count, new_product_count, new_comp_count;`);
sqlStatements.push(``);
sqlStatements.push(`  IF new_carrier_count < ${carrierCount} THEN`);
sqlStatements.push(`    RAISE EXCEPTION 'Expected ${carrierCount} carriers, got %', new_carrier_count;`);
sqlStatements.push(`  END IF;`);
sqlStatements.push(``);
sqlStatements.push(`  IF new_comp_count < ${commissionRateCount} THEN`);
sqlStatements.push(`    RAISE EXCEPTION 'Expected ${commissionRateCount} commission rates, got %', new_comp_count;`);
sqlStatements.push(`  END IF;`);
sqlStatements.push(`END $$;\n`);

sqlStatements.push(`COMMIT;\n`);

// Rollback script
sqlStatements.push(`-- ============================================`);
sqlStatements.push(`-- ROLLBACK SCRIPT (Run if needed)`);
sqlStatements.push(`-- ============================================`);
sqlStatements.push(`/*`);
sqlStatements.push(`BEGIN;`);
sqlStatements.push(`  TRUNCATE carriers, products, comp_guide CASCADE;`);
sqlStatements.push(`  INSERT INTO carriers SELECT * FROM carriers_backup_20251103;`);
sqlStatements.push(`  INSERT INTO products SELECT * FROM products_backup_20251103;`);
sqlStatements.push(`  INSERT INTO comp_guide SELECT * FROM comp_guide_backup_20251103;`);
sqlStatements.push(``);
sqlStatements.push(`  -- Restore comp_level column if needed`);
sqlStatements.push(`  ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS comp_level comp_level;`);
sqlStatements.push(`  ALTER TABLE comp_guide DROP COLUMN IF EXISTS contract_level;`);
sqlStatements.push(``);
sqlStatements.push(`  DROP TABLE carriers_backup_20251103;`);
sqlStatements.push(`  DROP TABLE products_backup_20251103;`);
sqlStatements.push(`  DROP TABLE comp_guide_backup_20251103;`);
sqlStatements.push(`COMMIT;`);
sqlStatements.push(`*/`);

// Write to file
const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251103_001_fix_carriers_products_comps.sql');
const sql = sqlStatements.join('\n');

fs.writeFileSync(outputPath, sql);

console.log('✅ Migration SQL generated successfully!');
console.log(`📁 File: ${outputPath}`);
console.log(`📊 Statistics:`);
console.log(`   - Carriers: ${carrierCount}`);
console.log(`   - Products: ${productCount}`);
console.log(`   - Commission Rates: ${commissionRateCount}`);
console.log(`   - Total SQL statements: ${sqlStatements.length}`);
