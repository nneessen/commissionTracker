// /home/nneessen/projects/commissionTracker/scripts/apply-corrected-ffg-data.js
// Script to apply the corrected FFG product data

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCorrectFFGData() {
  console.log('🔧 Applying corrected FFG product data...\n');

  try {
    // First, delete incorrect products
    console.log('1️⃣ Removing incorrect products...');
    const carrierIds = [
      '00001000-0000-0000-0000-000000000000', // United Home Life
      '00001001-0000-0000-0000-000000000000', // SBLI
      '00001002-0000-0000-0000-000000000000', // American Home Life
      '00001003-0000-0000-0000-000000000000', // American-Amicable Group
      '00001004-0000-0000-0000-000000000000', // Corebridge Financial
      '00001005-0000-0000-0000-000000000000', // Transamerica
      '00001006-0000-0000-0000-000000000000'  // ELCO Mutual
    ];

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .in('carrier_id', carrierIds);

    if (deleteError) {
      console.error('❌ Error deleting products:', deleteError);
    } else {
      console.log('✅ Old products removed');
    }

    // Update carrier names to match PDF
    console.log('\n2️⃣ Updating carrier names...');
    const carrierUpdates = [
      { id: '00001000-0000-0000-0000-000000000000', name: 'United Home Life', code: 'UHL' },
      { id: '00001001-0000-0000-0000-000000000000', name: 'SBLI', code: 'SBLI' },
      { id: '00001002-0000-0000-0000-000000000000', name: 'American Home Life', code: 'AHL' },
      { id: '00001003-0000-0000-0000-000000000000', name: 'American-Amicable Group', code: 'AAG' },
      { id: '00001004-0000-0000-0000-000000000000', name: 'Corebridge Financial', code: 'CF' },
      { id: '00001005-0000-0000-0000-000000000000', name: 'Transamerica', code: 'TRANS' },
      { id: '00001006-0000-0000-0000-000000000000', name: 'ELCO Mutual', code: 'ELCO' }
    ];

    for (const carrier of carrierUpdates) {
      const { error } = await supabase
        .from('carriers')
        .update({ name: carrier.name, code: carrier.code })
        .eq('id', carrier.id);

      if (error) {
        console.error(`❌ Error updating ${carrier.name}:`, error);
      }
    }
    console.log('✅ Carrier names updated');

    // Now insert correct products based on FFG Comp Guide PDF
    console.log('\n3️⃣ Inserting correct products...');

    const products = [
      // United Home Life products (Contract Level 105)
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Term', code: 'UHL-TERM', product_type: 'term_life', commission_percentage: 1.10 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Express Issue Premier WL', code: 'UHL-EIPWL', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Express Issue Deluxe WL', code: 'UHL-EIDWL', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Express Issue Graded WL', code: 'UHL-EIGWL', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Guaranteed Issue Whole Life', code: 'UHL-GIWL', product_type: 'whole_life', commission_percentage: 0.50 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Provider Whole Life', code: 'UHL-PWL', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Accidental', code: 'UHL-ACC', product_type: 'health', commission_percentage: 0.75 },

      // SBLI products
      { carrier_id: '00001001-0000-0000-0000-000000000000', name: 'SBLI Term', code: 'SBLI-TERM', product_type: 'term_life', commission_percentage: 1.10 },
      { carrier_id: '00001001-0000-0000-0000-000000000000', name: 'Silver Guard FE', code: 'SBLI-SGFE', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001001-0000-0000-0000-000000000000', name: 'APRIORITY Level Term (75K+)', code: 'SBLI-APLT', product_type: 'term_life', commission_percentage: 0.60 },
      { carrier_id: '00001001-0000-0000-0000-000000000000', name: 'APRIORITY Whole Life', code: 'SBLI-APWL', product_type: 'whole_life', commission_percentage: 0.80 },
      { carrier_id: '00001001-0000-0000-0000-000000000000', name: 'APRIORITY Protector Term', code: 'SBLI-APPT', product_type: 'term_life', commission_percentage: 0.60 },

      // American Home Life products
      { carrier_id: '00001002-0000-0000-0000-000000000000', name: 'FE', code: 'AHL-FE', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001002-0000-0000-0000-000000000000', name: 'Simple Term', code: 'AHL-ST', product_type: 'term_life', commission_percentage: 1.10 },
      { carrier_id: '00001002-0000-0000-0000-000000000000', name: 'Path Setter', code: 'AHL-PS', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001002-0000-0000-0000-000000000000', name: 'Everlast', code: 'AHL-EV', product_type: 'whole_life', commission_percentage: 0.90 },
      { carrier_id: '00001002-0000-0000-0000-000000000000', name: 'Exccudex', code: 'AHL-EX', product_type: 'whole_life', commission_percentage: 0.95 },

      // American-Amicable Group products
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Express UL', code: 'AAG-EUL', product_type: 'universal_life', commission_percentage: 0.70 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Home Protector', code: 'AAG-HP', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'OBA', code: 'AAG-OBA', product_type: 'whole_life', commission_percentage: 0.65 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'SecureLife Plus', code: 'AAG-SLP', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Security Protector', code: 'AAG-SP', product_type: 'whole_life', commission_percentage: 0.75 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Survivor Protector', code: 'AAG-SVP', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Term Made Simple', code: 'AAG-TMS', product_type: 'term_life', commission_percentage: 0.60 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Dignity Solutions & Family Legacy', code: 'AAG-DSFL', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Express Term', code: 'AAG-ET', product_type: 'term_life', commission_percentage: 0.75 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'BonusMaster', code: 'AAG-BM', product_type: 'whole_life', commission_percentage: 0.035 },
      { carrier_id: '00001003-0000-0000-0000-000000000000', name: 'Guaranteed Guardian', code: 'AAG-GG', product_type: 'whole_life', commission_percentage: 0.45 },

      // Corebridge Financial products
      { carrier_id: '00001004-0000-0000-0000-000000000000', name: 'GIWL Whole Life', code: 'CF-GIWL', product_type: 'whole_life', commission_percentage: 0.80 },
      { carrier_id: '00001004-0000-0000-0000-000000000000', name: 'SimpliNow Legacy Max SIWL', code: 'CF-SLMS', product_type: 'whole_life', commission_percentage: 0.97 },

      // Transamerica products
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'TrendSetter Super Term', code: 'TRANS-TST', product_type: 'term_life', commission_percentage: 0.75 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'TrendSetter LB Term', code: 'TRANS-TLBT', product_type: 'term_life', commission_percentage: 0.85 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Lifetime WL', code: 'TRANS-LWL', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Immediate Solution WL', code: 'TRANS-ISWL', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: '10 Pay Solution WL', code: 'TRANS-10PS', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Easy Solution WL', code: 'TRANS-ESWL', product_type: 'whole_life', commission_percentage: 0.48 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Express Solution', code: 'TRANS-ES', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'FFIUL', code: 'TRANS-FFIUL', product_type: 'universal_life', commission_percentage: 0.90 },

      // ELCO Mutual products
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'Guaranteed Issue FE', code: 'ELCO-GIFE', product_type: 'whole_life', commission_percentage: 0.45 },
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'FE Immediate', code: 'ELCO-FEI', product_type: 'whole_life', commission_percentage: 1.05 },
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'Life Pay WL 0-75', code: 'ELCO-LPWL', product_type: 'whole_life', commission_percentage: 0.90 },
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'Limited Pay WL', code: 'ELCO-LMWL', product_type: 'whole_life', commission_percentage: 0.70 }
    ];

    for (const product of products) {
      const { error } = await supabase
        .from('products')
        .insert({
          ...product,
          description: `${product.name} product`,
          is_active: true
        });

      if (error) {
        console.error(`❌ Error inserting ${product.name}:`, error.message);
      }
    }

    console.log(`✅ Inserted ${products.length} products`);

    // Verify the data
    console.log('\n4️⃣ Verifying corrected data...');
    for (const carrier of carrierUpdates) {
      const { data: products, error } = await supabase
        .from('products')
        .select('name, commission_percentage')
        .eq('carrier_id', carrier.id)
        .order('name');

      if (error) {
        console.error(`❌ Error fetching products for ${carrier.name}:`, error);
      } else {
        console.log(`\n${carrier.name}: ${products.length} products`);
        products.forEach(p => {
          console.log(`  - ${p.name}: ${(p.commission_percentage * 100).toFixed(1)}%`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyCorrectFFGData().then(() => {
  console.log('\n✅ FFG product data has been corrected!');
  console.log('📊 Commission percentages are now based on Contract Level 105 from the FFG Comp Guide PDF');
  process.exit(0);
}).catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});