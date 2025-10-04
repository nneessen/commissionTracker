#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/scripts/fix-commission-data-NOW.cjs
//
// ACTUALLY FIX THE COMMISSION DATA RIGHT NOW
// This script updates the products table with correct commission percentages

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Use service role to bypass RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Commission rates by carrier and product (from FFG Comp Guide)
const COMMISSION_RATES = {
  'United Home Life': {
    'Term': 1.10,
    'Express Issue Premier WL': 1.00,
    'Express Issue Deluxe WL': 1.00,
    'Express Issue Graded WL': 1.00,
    'Guaranteed Issue Whole Life': 0.50,
    'Provider Whole Life': 0.85,
    'Accidental': 0.75,
  },
  'SBLI': {
    'SBLI Term': 1.10,
    'Silver Guard FE': 0.85,
    'APRIORITY Level Term (75K+)': 0.60,
    'APriority Level Term (75K+)': 0.60,
    'APRIORITY Whole Life': 0.80,
    'APriority Whole Life': 0.80,
    'APRIORITY Protector Term': 0.60,
    'APriority Protector Term': 0.60,
  },
  'American Home Life': {
    'FE': 1.00,
    'Simple Term': 1.10,
    'Path Setter': 0.95,
    'Everlast': 0.90,
    'Exccudex': 0.95,
  },
  'American-Amicable Group': {
    'Express UL': 0.70,
    'Home Protector': 0.95,
    'OBA': 0.65,
    'SecureLife Plus': 0.95,
    'Security Protector': 0.75,
    'Survivor Protector': 0.95,
    'Term Made Simple': 0.60,
    'Dignity Solutions & Family Legacy': 0.85,
    'Dignity Solutions Family Legacy': 0.85,
    'Express Term': 0.75,
    'BonusMaster': 0.035,
    'Guaranteed Guardian': 0.45,
  },
  'Corebridge Financial': {
    'GIWL Whole Life': 0.87,
    'GIWL': 0.87,
    'SimpliNow Legacy Max SIWL': 1.05,
  },
  'Transamerica': {
    'TrendSetter Super Term': 0.73,
    'TrendSetter LB Term': 0.83,
    'Lifetime WL': 1.13,
    'Immediate Solution WL': 0.98,
    '10 Pay Solution WL': 0.75,
    'Express Issue Graded (Immediate Solution)': 0.63,
    'TransACE': 0.58,
  },
  'ELCO Mutual': {
    'Life Pay WL 0-75': 0.80,
    'Life Pay WL 76-85': 0.80,
    'Limited Pay WL': 0.75,
  },
};

async function fixCommissionData() {
  console.log('🔧 Fixing Commission Data...\n');

  try {
    // Get all carriers
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('id, name');

    if (carriersError) throw carriersError;

    console.log(`Found ${carriers.length} carriers\n`);

    let totalUpdated = 0;
    let totalSkipped = 0;

    // For each carrier, update its products
    for (const carrier of carriers) {
      const carrierRates = COMMISSION_RATES[carrier.name];

      if (!carrierRates) {
        console.log(`⏭️  Skipping ${carrier.name} (no rates defined)`);
        continue;
      }

      console.log(`📦 Processing ${carrier.name}...`);

      // Get products for this carrier
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('carrier_id', carrier.id);

      if (productsError) throw productsError;

      // Update each product
      for (const product of products) {
        const rate = carrierRates[product.name];

        if (rate !== undefined) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              commission_percentage: rate,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`  ❌ Failed to update ${product.name}:`, updateError.message);
          } else {
            console.log(`  ✅ ${product.name}: ${rate} (${rate * 100}%)`);
            totalUpdated++;
          }
        } else {
          console.log(`  ⚠️  ${product.name}: No rate defined`);
          totalSkipped++;
        }
      }

      console.log('');
    }

    console.log('='.repeat(50));
    console.log(`✅ Updated ${totalUpdated} products`);
    console.log(`⏭️  Skipped ${totalSkipped} products (no rate defined)`);
    console.log('='.repeat(50));

    // Verify with test case
    console.log('\n🧪 Verification Test:');
    const { data: testProduct } = await supabase
      .from('products')
      .select('name, commission_percentage')
      .eq('name', 'FE')
      .limit(1)
      .single();

    if (testProduct) {
      console.log(`American Home Life "FE": ${testProduct.commission_percentage} (${testProduct.commission_percentage * 100}%)`);
      if (testProduct.commission_percentage === 1.00) {
        console.log('✅ TEST PASSED!');
      } else {
        console.log('❌ TEST FAILED!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCommissionData();
