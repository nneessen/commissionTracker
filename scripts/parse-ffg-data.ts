#!/usr/bin/env node
// Script to parse FFG Comp Guide data and generate SQL import

import { FFG_COMP_GUIDE_DATA, getUniqueCarriers, getProductsByCarrier } from '../src/features/settings/data/ffgCompGuideData';

// Map product names to product types
function getProductType(productName: string): string {
  const name = productName.toLowerCase();

  if (name.includes('term') && !name.includes('protector')) {
    return 'term_life';
  } else if (name.includes('whole life') || name.includes('wl')) {
    return 'whole_life';
  } else if (name.includes('ul') || name.includes('universal')) {
    return 'universal_life';
  } else if (name.includes('iul') || name.includes('indexed')) {
    return 'universal_life';
  } else if (name.includes('fe') || name.includes('final expense')) {
    return 'whole_life';
  } else if (name.includes('guaranteed issue')) {
    return 'whole_life';
  } else if (name.includes('accidental')) {
    return 'health';
  } else {
    return 'whole_life'; // Default
  }
}

// Map contract levels to comp_level enum
function mapContractToCompLevel(contractLevel: number): string {
  if (contractLevel >= 130) return 'premium';
  if (contractLevel >= 110) return 'enhanced';
  if (contractLevel >= 95) return 'release';
  return 'street';
}

// Generate carrier code from name
function generateCarrierCode(name: string): string {
  const words = name.split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase();
}

// Main function to generate SQL
function generateSQL(): string {
  const carriers = getUniqueCarriers();
  const sql: string[] = [];

  sql.push('-- FFG Comp Guide Data Import');
  sql.push('-- Generated from ffgCompGuideData.ts');
  sql.push('-- Date: ' + new Date().toISOString().split('T')[0]);
  sql.push('');
  sql.push('BEGIN;');
  sql.push('');

  // Clear existing sample data
  sql.push('-- Clear existing sample data');
  sql.push('DELETE FROM comp_guide WHERE carrier_id IN (SELECT id FROM carriers WHERE name LIKE \'%Sample%\' OR name IN (\'Mutual of Omaha\', \'American General\', \'Transamerica\', \'North American\', \'Family First Life\'));');
  sql.push('DELETE FROM products WHERE carrier_id IN (SELECT id FROM carriers WHERE name LIKE \'%Sample%\' OR name IN (\'Mutual of Omaha\', \'American General\', \'Transamerica\', \'North American\', \'Family First Life\'));');
  sql.push('DELETE FROM carriers WHERE name LIKE \'%Sample%\' OR name IN (\'Mutual of Omaha\', \'American General\', \'Transamerica\', \'North American\', \'Family First Life\');');
  sql.push('');

  // Insert carriers
  sql.push('-- Insert FFG carriers');
  sql.push('INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES');

  const carrierIds = new Map<string, string>();
  const carrierValues: string[] = [];

  carriers.forEach((carrier, index) => {
    const id = `'${(1000 + index).toString().padStart(8, '0')}-0000-0000-0000-000000000000'`;
    carrierIds.set(carrier, id.replace(/'/g, ''));
    const code = generateCarrierCode(carrier);
    carrierValues.push(`(${id}, '${carrier}', '${code}', NOW(), NOW())`);
  });

  sql.push(carrierValues.join(',\n'));
  sql.push('ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, updated_at = NOW();');
  sql.push('');

  // Insert products
  sql.push('-- Insert products for each carrier');

  carriers.forEach(carrier => {
    const products = getProductsByCarrier(carrier);
    const carrierId = carrierIds.get(carrier);

    if (products.length > 0) {
      sql.push(`\n-- Products for ${carrier}`);
      sql.push('INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES');

      const productValues: string[] = [];
      products.forEach((product, index) => {
        const productType = getProductType(product);
        const code = `${generateCarrierCode(carrier)}-${index + 1}`;
        const description = `${carrier} ${product}`;

        // Get average commission for this product across all levels
        const commissions = FFG_COMP_GUIDE_DATA
          .filter(d => d.carrier === carrier && d.product === product)
          .map(d => d.commissionRate);
        const avgCommission = commissions.reduce((a, b) => a + b, 0) / commissions.length;

        productValues.push(`('${carrierId}', '${product.replace(/'/g, "''")}', '${code}', '${productType}', '${description.replace(/'/g, "''")}', ${(avgCommission / 100).toFixed(4)}, true)`);
      });

      sql.push(productValues.join(',\n'));
      sql.push('ON CONFLICT (carrier_id, name) DO UPDATE SET');
      sql.push('  product_type = EXCLUDED.product_type,');
      sql.push('  commission_percentage = EXCLUDED.commission_percentage,');
      sql.push('  updated_at = NOW();');
    }
  });

  sql.push('');
  sql.push('-- Insert commission rates into comp_guide');

  // Group by comp level for more efficient inserts
  const compLevels = ['street', 'release', 'enhanced', 'premium'];

  compLevels.forEach(compLevel => {
    sql.push(`\n-- Commission rates for ${compLevel} level`);
    sql.push('INSERT INTO comp_guide (carrier_id, product_type, comp_level, commission_percentage, bonus_percentage, effective_date) VALUES');

    const values: string[] = [];
    const addedCombos = new Set<string>();

    FFG_COMP_GUIDE_DATA.forEach(item => {
      const mappedLevel = mapContractToCompLevel(item.contractLevel);
      if (mappedLevel === compLevel) {
        const carrierId = carrierIds.get(item.carrier);
        const productType = getProductType(item.product);
        const comboKey = `${carrierId}-${productType}-${compLevel}`;

        // Only add if we haven't added this combination yet
        if (!addedCombos.has(comboKey)) {
          addedCombos.add(comboKey);
          const commissionDecimal = (item.commissionRate / 100).toFixed(4);
          values.push(`('${carrierId}', '${productType}', '${compLevel}', ${commissionDecimal}, 0, '${item.effectiveDate}')`);
        }
      }
    });

    if (values.length > 0) {
      sql.push(values.join(',\n'));
      sql.push('ON CONFLICT (carrier_id, product_type, comp_level, effective_date) DO UPDATE SET');
      sql.push('  commission_percentage = EXCLUDED.commission_percentage,');
      sql.push('  updated_at = NOW();');
    }
  });

  sql.push('');
  sql.push('COMMIT;');
  sql.push('');
  sql.push('-- Verify import');
  sql.push('DO $$');
  sql.push('DECLARE');
  sql.push('    carrier_count INTEGER;');
  sql.push('    product_count INTEGER;');
  sql.push('    comp_count INTEGER;');
  sql.push('BEGIN');
  sql.push('    SELECT COUNT(*) INTO carrier_count FROM carriers;');
  sql.push('    SELECT COUNT(*) INTO product_count FROM products;');
  sql.push('    SELECT COUNT(*) INTO comp_count FROM comp_guide;');
  sql.push('    ');
  sql.push('    RAISE NOTICE \'Import complete:\';');
  sql.push('    RAISE NOTICE \'  Carriers: %\', carrier_count;');
  sql.push('    RAISE NOTICE \'  Products: %\', product_count;');
  sql.push('    RAISE NOTICE \'  Commission rates: %\', comp_count;');
  sql.push('END $$;');

  return sql.join('\n');
}

// Generate and output SQL
const sqlContent = generateSQL();
console.log(sqlContent);

// Also save to file
import * as fs from 'fs';
import * as path from 'path';

const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251003_003_ffg_import.sql');
fs.writeFileSync(outputPath, sqlContent);
console.error(`\nSQL saved to: ${outputPath}`);