#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/scripts/migrate-comp-guide-data.js
// Script to migrate hardcoded commission guide data to Supabase database

const fs = require('fs');
const path = require('path');

// Import the commission data from the TypeScript file
const dataPath = path.join(__dirname, '../src/data/compGuideData.ts');
const dataContent = fs.readFileSync(dataPath, 'utf8');

// Extract the PDF_COMMISSION_DATA array using regex
// This is a bit hacky but works for the migration
const dataMatch = dataContent.match(/PDF_COMMISSION_DATA:\s*PDFCarrierData\[\]\s*=\s*(\[[\s\S]*?\]);/);
if (!dataMatch) {
  console.error('Could not find PDF_COMMISSION_DATA in compGuideData.ts');
  process.exit(1);
}

// Parse the data structure (removing TypeScript types)
const dataString = dataMatch[1]
  .replace(/{\s*contractLevel:/g, '{"contractLevel":')
  .replace(/,\s*percentage:/g, ',"percentage":')
  .replace(/carrierName:/g, '"carrierName":')
  .replace(/products:/g, '"products":')
  .replace(/productName:/g, '"productName":')
  .replace(/productType:/g, '"productType":')
  .replace(/commissionRates:/g, '"commissionRates":');

let commissionData;
try {
  commissionData = eval(`(${dataString})`); // Using eval for quick parsing
} catch (error) {
  console.error('Failed to parse commission data:', error);
  process.exit(1);
}

console.log(`Parsed ${commissionData.length} carriers from compGuideData.ts`);

// Function to generate SQL migration script
function generateMigrationSQL() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const migrationHeader = `-- Migration: Comp Guide Data Import
-- Generated: ${new Date().toISOString()}
-- Source: src/data/compGuideData.ts
-- Total carriers: ${commissionData.length}

BEGIN;

-- Create backup of existing comp_guide data
CREATE TABLE IF NOT EXISTS comp_guide_backup_${timestamp.slice(0, 10)} AS
SELECT * FROM comp_guide;

-- Tag for rollback identification
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS migration_source TEXT;
ALTER TABLE comp_guide ADD COLUMN IF NOT EXISTS migration_date TIMESTAMP WITH TIME ZONE;

-- Delete any existing data from this migration source
DELETE FROM comp_guide WHERE migration_source = 'compGuideData.ts';

`;

  let insertStatements = '';
  let totalRecords = 0;

  // Process each carrier
  commissionData.forEach(carrier => {
    const carrierName = carrier.carrierName.replace(/'/g, "''"); // Escape quotes

    // First, we need to insert/get the carrier ID
    // For this migration, we'll assume carriers exist or use a lookup
    insertStatements += `
-- Carrier: ${carrierName}
`;

    carrier.products.forEach(product => {
      const productName = product.productName.replace(/'/g, "''");
      const productType = mapProductType(product.productType);

      product.commissionRates.forEach(rate => {
        const contractLevel = mapContractLevel(rate.contractLevel);
        const percentage = rate.percentage / 100; // Convert to decimal

        insertStatements += `INSERT INTO comp_guide (
  carrier_id,
  product_type,
  comp_level,
  commission_percentage,
  effective_date,
  migration_source,
  migration_date
) SELECT
  c.id as carrier_id,
  '${productType}' as product_type,
  '${contractLevel}' as comp_level,
  ${percentage} as commission_percentage,
  CURRENT_DATE as effective_date,
  'compGuideData.ts' as migration_source,
  NOW() as migration_date
FROM carriers c
WHERE c.name ILIKE '%${carrierName}%'
ON CONFLICT (carrier_id, product_type, comp_level, effective_date)
DO UPDATE SET
  commission_percentage = EXCLUDED.commission_percentage,
  migration_source = EXCLUDED.migration_source,
  migration_date = EXCLUDED.migration_date;

`;
        totalRecords++;
      });
    });
  });

  const migrationFooter = `
-- Migration summary
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Total comp_guide records processed: ${totalRecords}';
  RAISE NOTICE 'Records imported from: compGuideData.ts';
  RAISE NOTICE 'Migration date: %', NOW();
END $$;

COMMIT;

-- Rollback script (run separately if needed):
/*
BEGIN;
DELETE FROM comp_guide WHERE migration_source = 'compGuideData.ts';
-- Restore from backup if needed:
-- INSERT INTO comp_guide SELECT * FROM comp_guide_backup_${timestamp.slice(0, 10)};
COMMIT;
*/
`;

  return migrationHeader + insertStatements + migrationFooter;
}

// Map product types to database enum values
function mapProductType(productType) {
  const mapping = {
    'whole_life': 'whole_life',
    'term': 'term_life',
    'term_life': 'term_life',
    'universal_life': 'universal_life',
    'indexed_universal_life': 'universal_life', // Map to universal_life for now
    'accidental': 'term_life', // Map accidental to term_life
    'final_expense': 'whole_life', // Map final expense to whole_life
    'annuity': 'annuity'
  };
  return mapping[productType] || 'whole_life';
}

// Map contract levels to database enum values
function mapContractLevel(contractLevel) {
  // Map numeric contract levels to comp_level enum
  if (contractLevel >= 140) return 'premium';
  if (contractLevel >= 120) return 'enhanced';
  if (contractLevel >= 100) return 'release';
  return 'street';
}

// Generate and save the migration
const migrationSQL = generateMigrationSQL();
const outputPath = path.join(__dirname, '../database/003_migrate_comp_guide_data.sql');

fs.writeFileSync(outputPath, migrationSQL);

console.log(`✅ Migration script generated: ${outputPath}`);
console.log(`📊 Total commission records to migrate: ${commissionData.length * commissionData.reduce((sum, carrier) => sum + carrier.products.reduce((pSum, product) => pSum + product.commissionRates.length, 0), 0)}`);
console.log('🔧 Next steps:');
console.log('1. Review the generated migration script');
console.log('2. Ensure all carriers exist in the carriers table');
console.log('3. Run the migration: supabase db push');
console.log('4. Verify data integrity');
console.log('5. Update application to use database instead of hardcoded data');

// Generate a JavaScript version for easier parsing
const jsDataPath = path.join(__dirname, '../src/data/compGuideData.json');
fs.writeFileSync(jsDataPath, JSON.stringify(commissionData, null, 2));
console.log(`📄 JSON backup created: ${jsDataPath}`);