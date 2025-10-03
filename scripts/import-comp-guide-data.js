// /home/nneessen/projects/commissionTracker/scripts/import-comp-guide-data.js
// Script to import FFG Comp Guide data from PDF into database
// This includes all carriers, products, and commission percentages by contract level

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Carrier and product data extracted from FFG Comp Guide PDF
const compGuideData = {
  // United Home Life (Legal & General America)
  "United Home Life": {
    products: {
      "TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "EXPRESS ISSUE PREMIER WL": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EXPRESS ISSUE DELUXE WL": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EXPRESS ISSUE GRADED WL": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "GUARANTEED ISSUE WHOLE LIFE": [85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 25],
      "PROVIDER WHOLE LIFE": [120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55],
      "TERM": [120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55],
      "ACCIDENTAL": [110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45]
    }
  },

  // American Home Life
  "American Home Life": {
    products: {
      "FE": [135, 130, 125, 120, 115, 110, 105, 100, 90, 85, 80, 75, 70, 65],
      "SIMPLE TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "PATH SETTER": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EVERLAST": [130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65],
      "EXCCUDEX": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70]
    }
  },

  // SBLI
  "SBLI": {
    products: {
      "SBLI TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "SILVER GUARD FE": [115, 115, 110, 105, 100, 95, 90, 90, 85, 85, 80, 75, 70, 65]
    }
  },

  // The Baltimore Life
  "The Baltimore Life": {
    products: {
      "APRIORITY LEVEL TERM (75K+)": [90, 90, 85, 85, 80, 80, 70, 70, 60, 55, 55, 50, 50, 45],
      "APRIORITY WHOLE LIFE": [115, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 60],
      "APRIORITY PROTECTOR TERM": [90, 90, 85, 85, 80, 80, 70, 70, 60, 55, 55, 50, 50, 45]
    }
  },

  // American-Amicable Group
  "American-Amicable": {
    products: {
      "EXPRESS UL": [110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45],
      "HOME PROTECTOR": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "OBA": [105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40],
      "SECURELIFE PLUS": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "SECURITY PROTECTOR": [115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50],
      "SURVIVOR PROTECTOR": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "TERM MADE SIMPLE": [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 40],
      "DIGNITY SOLUTIONS & FAMILY LEGACY": [125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60],
      "EXPRESS TERM": [115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50],
      "BONUSMASTER": [5.5, 5.25, 5, 4.75, 4.5, 4.25, 4, 4, 3.5, 3.5, 3, 2, 0, 0],
      "GUARANTEED GUARDIAN": [80, 75, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 0, 0]
    }
  },

  // Corebridge Financial
  "Corebridge Financial": {
    products: {
      "GIWL WHOLE LIFE": [95, 95, 95, 95, 90, 90, 80, 80, 80, 80, 80, 75, 70, 65],
      "SIMPLINOW LEGACY MAX SIWL": [137, 132, 127, 122, 117, 112, 107, 102, 97, 92, 87, 82, 77, 72]
    }
  },

  // Transamerica
  "Transamerica": {
    products: {
      "TRENDSETTER SUPER TERM": [105, 100, 95, 95, 90, 85, 85, 80, 75, 75, 70, 65, 60, 55],
      "TRENDSETTER LB TERM": [115, 110, 105, 105, 100, 95, 95, 90, 85, 85, 80, 75, 70, 65],
      "LIFETIME WL": [145, 140, 120, 120, 115, 105, 105, 100, 95, 95, 90, 85, 80, 75],
      "IMMEDIATE SOLUTION WL": [130, 125, 120, 120, 115, 105, 105, 100, 95, 95, 90, 85, 80, 75],
      "10 PAY SOLUTION WL": [107, 102, 98, 98, 94, 92, 92, 90, 85, 85, 80, 75, 70, 65],
      "EASY SOLUTION WL": [80, 75, 68, 68, 63, 58, 58, 53, 48, 48, 43, 38, 33, 28],
      "EXTRESS SOLUTION": [135, 130, 125, 125, 120, 110, 110, 105, 100, 100, 95, 90, 85, 80],
      "FFIUL": [122, 117, 110, 105, 105, 100, 95, 95, 90, 85, 85, 80, 75, 70]
    }
  },

  // ELCO Mutual
  "ELCO Mutual": {
    products: {
      "GUARENTED ISSUE FE": [65, 60, 60, 55, 55, 50, 50, 45, 45, 40, 40, 35, 35, 30],
      "FE IMMEDIATE": [125, 120, 120, 115, 115, 110, 110, 105, 105, 100, 100, 95, 95, 90],
      "LIFE PAY WL 0-75": [110, 105, 105, 100, 100, 95, 95, 90, 90, 85, 85, 80, 80, 75],
      "LIMITED PAY WL": [90, 85, 85, 80, 80, 75, 75, 70, 70, 65, 65, 60, 60, 55]
    }
  },

  // John Hancock (simplified version - you can expand this)
  "John Hancock": {
    products: {
      "FE": [135, 130, 125, 120, 115, 110, 105, 100, 90, 85, 80, 75, 70, 65],
      "SIMPLE TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85]
    }
  }
};

// Product type mapping
function mapProductType(productName) {
  const name = productName.toUpperCase();
  if (name.includes('TERM')) return 'term_life';
  if (name.includes('WHOLE LIFE') || name.includes('WL')) return 'whole_life';
  if (name.includes('UNIVERSAL') || name.includes('UL')) return 'universal_life';
  if (name.includes('INDEXED')) return 'indexed_universal_life';
  if (name.includes('ACCIDENTAL')) return 'accidental_life';
  if (name.includes('ANNUITY')) return 'annuity';
  if (name.includes('FE') || name.includes('FINAL')) return 'whole_life';
  return 'term_life'; // default
}

// Contract levels (80-145 in increments of 5)
const contractLevels = [145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80];

async function importData() {
  console.log('Starting FFG Comp Guide data import...');

  try {
    // Step 1: Import carriers
    console.log('\n1. Importing carriers...');
    const carrierMap = {};

    for (const carrierName of Object.keys(compGuideData)) {
      // Check if carrier exists
      const { data: existingCarrier } = await supabase
        .from('carriers')
        .select('id, name')
        .ilike('name', `%${carrierName}%`)
        .single();

      if (existingCarrier) {
        carrierMap[carrierName] = existingCarrier.id;
        console.log(`  ✓ Carrier exists: ${carrierName}`);
      } else {
        // Insert new carrier
        const { data: newCarrier, error } = await supabase
          .from('carriers')
          .insert({
            name: carrierName,
            short_name: carrierName.substring(0, 50),
            is_active: true
          })
          .select('id')
          .single();

        if (error) {
          console.error(`  ✗ Error inserting carrier ${carrierName}:`, error);
        } else {
          carrierMap[carrierName] = newCarrier.id;
          console.log(`  ✓ Inserted carrier: ${carrierName}`);
        }
      }
    }

    // Step 2: Import comp guide data
    console.log('\n2. Importing comp guide data...');
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const [carrierName, carrierData] of Object.entries(compGuideData)) {
      const carrierId = carrierMap[carrierName];
      if (!carrierId) {
        console.error(`  ✗ No carrier ID for ${carrierName}, skipping...`);
        continue;
      }

      console.log(`\n  Processing ${carrierName}...`);

      for (const [productName, commissionRates] of Object.entries(carrierData.products)) {
        const productType = mapProductType(productName);

        // Insert commission rates for each contract level
        for (let i = 0; i < contractLevels.length && i < commissionRates.length; i++) {
          const contractLevel = contractLevels[i];
          const commissionPercentage = commissionRates[i];

          // Check if entry already exists
          const { data: existing } = await supabase
            .from('comp_guide')
            .select('id')
            .eq('carrier_id', carrierId)
            .eq('product_type', productType)
            .eq('comp_level', contractLevel)
            .single();

          if (!existing) {
            const { error } = await supabase
              .from('comp_guide')
              .insert({
                carrier_id: carrierId,
                product_type: productType,
                product_name: productName,
                comp_level: contractLevel,
                commission_percentage: commissionPercentage,
                effective_date: new Date().toISOString().split('T')[0]
              });

            if (error) {
              console.error(`    ✗ Error inserting ${productName} @ ${contractLevel}:`, error);
              totalSkipped++;
            } else {
              totalInserted++;
            }
          } else {
            totalSkipped++;
          }
        }
        console.log(`    ✓ Processed ${productName}`);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total carriers: ${Object.keys(carrierMap).length}`);
    console.log(`Total comp guide entries inserted: ${totalInserted}`);
    console.log(`Total comp guide entries skipped (existing): ${totalSkipped}`);
    console.log('\nImport completed successfully!');

  } catch (error) {
    console.error('Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
importData().then(() => {
  console.log('\nData import script finished.');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});