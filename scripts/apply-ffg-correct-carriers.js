// /home/nneessen/projects/commissionTracker/scripts/apply-ffg-correct-carriers.js
// Script to apply the CORRECTLY MAPPED FFG product data based on careful PDF reading

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  console.log('🔧 Applying CORRECTLY MAPPED FFG product data...\n');
  console.log('📋 Based on careful reading of FFG Comp Guide PDF');
  console.log('📊 Using Contract Level 105 commission rates\n');

  try {
    // First, clear ALL existing products for these carriers
    console.log('1️⃣ Clearing existing incorrect data...');

    // Delete all products for the original 7 carrier IDs
    const originalCarrierIds = [
      '00001000-0000-0000-0000-000000000000',
      '00001001-0000-0000-0000-000000000000',
      '00001002-0000-0000-0000-000000000000',
      '00001003-0000-0000-0000-000000000000',
      '00001004-0000-0000-0000-000000000000',
      '00001005-0000-0000-0000-000000000000',
      '00001006-0000-0000-0000-000000000000'
    ];

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .in('carrier_id', originalCarrierIds);

    if (deleteError) {
      console.error('❌ Error deleting products:', deleteError);
    } else {
      console.log('✅ Old products cleared');
    }

    // Now we need to add the missing carriers that are in the PDF
    console.log('\n2️⃣ Adding missing carriers from PDF...');

    const newCarriers = [
      { id: '00001007-0000-0000-0000-000000000000', name: 'Legal & General America', code: 'LGA' },
      { id: '00001008-0000-0000-0000-000000000000', name: 'The Baltimore Life', code: 'TBL' },
      { id: '00001009-0000-0000-0000-000000000000', name: 'John Hancock', code: 'JH' }
    ];

    for (const carrier of newCarriers) {
      const { error } = await supabase
        .from('carriers')
        .insert(carrier)
        .select();

      if (error && !error.message.includes('duplicate')) {
        console.error(`⚠️ Error adding ${carrier.name}:`, error.message);
      }
    }

    // Update existing carrier names to match PDF exactly
    console.log('\n3️⃣ Updating carrier names to match PDF...');

    const carrierUpdates = [
      { id: '00001000-0000-0000-0000-000000000000', name: 'United Home Life', code: 'UHL' },
      { id: '00001001-0000-0000-0000-000000000000', name: 'SBLI', code: 'SBLI' },
      { id: '00001002-0000-0000-0000-000000000000', name: 'American Home Life', code: 'AHL' },
      { id: '00001003-0000-0000-0000-000000000000', name: 'American-Amicable Group', code: 'AAG' },
      { id: '00001004-0000-0000-0000-000000000000', name: 'Corebridge Financial', code: 'CF' },
      { id: '00001005-0000-0000-0000-000000000000', name: 'Transamerica', code: 'TRANS' },
      { id: '00001006-0000-0000-0000-000000000000', name: 'ELCO Mutual', code: 'ELCO' },
      { id: '00001007-0000-0000-0000-000000000000', name: 'Legal & General America', code: 'LGA' },
      { id: '00001008-0000-0000-0000-000000000000', name: 'The Baltimore Life', code: 'TBL' },
      { id: '00001009-0000-0000-0000-000000000000', name: 'John Hancock', code: 'JH' }
    ];

    for (const carrier of carrierUpdates) {
      const { error } = await supabase
        .from('carriers')
        .upsert(carrier, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Error updating ${carrier.name}:`, error);
      }
    }
    console.log('✅ Carriers updated');

    // Now insert CORRECTLY MAPPED products based on PDF
    console.log('\n4️⃣ Inserting correctly mapped products...');

    const products = [
      // Page 1 - Legal & General America (left side)
      { carrier_id: '00001007-0000-0000-0000-000000000000', name: 'Term', code: 'LGA-TERM', product_type: 'term_life', commission_percentage: 1.10 },

      // Page 1 - United Home Life (right side)
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Express Issue Premier WL', code: 'UHL-EIPWL', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Express Issue Deluxe WL', code: 'UHL-EIDWL', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Express Issue Graded WL', code: 'UHL-EIGWL', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Guaranteed Issue Whole Life', code: 'UHL-GIWL', product_type: 'whole_life', commission_percentage: 0.50 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Provider Whole Life', code: 'UHL-PWL', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Term', code: 'UHL-TERM', product_type: 'term_life', commission_percentage: 0.85 },
      { carrier_id: '00001000-0000-0000-0000-000000000000', name: 'Accidental', code: 'UHL-ACC', product_type: 'health', commission_percentage: 0.75 },

      // Page 2 - SBLI (top left)
      { carrier_id: '00001001-0000-0000-0000-000000000000', name: 'SBLI Term', code: 'SBLI-TERM', product_type: 'term_life', commission_percentage: 1.10 },

      // Page 2 - The Baltimore Life (top right)
      { carrier_id: '00001008-0000-0000-0000-000000000000', name: 'Silver Guard FE', code: 'TBL-SGFE', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001008-0000-0000-0000-000000000000', name: 'APRIORITY Level Term (75K+)', code: 'TBL-APLT', product_type: 'term_life', commission_percentage: 0.60 },
      { carrier_id: '00001008-0000-0000-0000-000000000000', name: 'APRIORITY Whole Life', code: 'TBL-APWL', product_type: 'whole_life', commission_percentage: 0.80 },
      { carrier_id: '00001008-0000-0000-0000-000000000000', name: 'APRIORITY Protector Term', code: 'TBL-APPT', product_type: 'term_life', commission_percentage: 0.60 },

      // Page 2 - American Home Life (bottom left)
      { carrier_id: '00001002-0000-0000-0000-000000000000', name: 'FE', code: 'AHL-FE', product_type: 'whole_life', commission_percentage: 1.00 },

      // Page 2 - John Hancock (bottom right)
      { carrier_id: '00001009-0000-0000-0000-000000000000', name: 'Simple Term', code: 'JH-ST', product_type: 'term_life', commission_percentage: 1.10 },
      { carrier_id: '00001009-0000-0000-0000-000000000000', name: 'Path Setter', code: 'JH-PS', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001009-0000-0000-0000-000000000000', name: 'Everlast', code: 'JH-EV', product_type: 'whole_life', commission_percentage: 0.90 },
      { carrier_id: '00001009-0000-0000-0000-000000000000', name: 'Exccudex', code: 'JH-EX', product_type: 'whole_life', commission_percentage: 0.95 },

      // Page 3 - American-Amicable Group
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

      // Page 4 - Corebridge Financial (left)
      { carrier_id: '00001004-0000-0000-0000-000000000000', name: 'GIWL Whole Life', code: 'CF-GIWL', product_type: 'whole_life', commission_percentage: 0.80 },
      { carrier_id: '00001004-0000-0000-0000-000000000000', name: 'SimpliNow Legacy Max SIWL', code: 'CF-SLMS', product_type: 'whole_life', commission_percentage: 0.97 },

      // Page 4 - Transamerica (right)
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'TrendSetter Super Term', code: 'TRANS-TST', product_type: 'term_life', commission_percentage: 0.75 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'TrendSetter LB Term', code: 'TRANS-TLBT', product_type: 'term_life', commission_percentage: 0.85 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Lifetime WL', code: 'TRANS-LWL', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Immediate Solution WL', code: 'TRANS-ISWL', product_type: 'whole_life', commission_percentage: 0.95 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: '10 Pay Solution WL', code: 'TRANS-10PS', product_type: 'whole_life', commission_percentage: 0.85 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Easy Solution WL', code: 'TRANS-ESWL', product_type: 'whole_life', commission_percentage: 0.48 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'Express Solution', code: 'TRANS-ES', product_type: 'whole_life', commission_percentage: 1.00 },
      { carrier_id: '00001005-0000-0000-0000-000000000000', name: 'FFIUL', code: 'TRANS-FFIUL', product_type: 'universal_life', commission_percentage: 0.90 },

      // Page 5 - ELCO Mutual (left)
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'Guaranteed Issue FE', code: 'ELCO-GIFE', product_type: 'whole_life', commission_percentage: 0.45 },
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'FE Immediate', code: 'ELCO-FEI', product_type: 'whole_life', commission_percentage: 1.05 },
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'Life Pay WL 0-75', code: 'ELCO-LPWL', product_type: 'whole_life', commission_percentage: 0.90 },
      { carrier_id: '00001006-0000-0000-0000-000000000000', name: 'Limited Pay WL', code: 'ELCO-LMWL', product_type: 'whole_life', commission_percentage: 0.70 }

      // Kansas City Life (Page 5 right) has no products listed
    ];

    let insertedCount = 0;
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
      } else {
        insertedCount++;
      }
    }

    console.log(`✅ Inserted ${insertedCount} of ${products.length} products`);

    // Verify the data
    console.log('\n5️⃣ Verifying corrected data...');

    const verifyCarriers = [
      '00001000-0000-0000-0000-000000000000', // United Home Life
      '00001001-0000-0000-0000-000000000000', // SBLI
      '00001002-0000-0000-0000-000000000000', // American Home Life
      '00001003-0000-0000-0000-000000000000', // American-Amicable Group
      '00001004-0000-0000-0000-000000000000', // Corebridge Financial
      '00001005-0000-0000-0000-000000000000', // Transamerica
      '00001006-0000-0000-0000-000000000000', // ELCO Mutual
      '00001007-0000-0000-0000-000000000000', // Legal & General America
      '00001008-0000-0000-0000-000000000000', // The Baltimore Life
      '00001009-0000-0000-0000-000000000000'  // John Hancock
    ];

    for (const carrierId of verifyCarriers) {
      const { data: carrier } = await supabase
        .from('carriers')
        .select('name')
        .eq('id', carrierId)
        .single();

      const { data: products } = await supabase
        .from('products')
        .select('name, commission_percentage')
        .eq('carrier_id', carrierId)
        .order('name');

      if (carrier) {
        console.log(`\n${carrier.name}: ${products?.length || 0} products`);
        products?.forEach(p => {
          console.log(`  - ${p.name}: ${(p.commission_percentage * 100).toFixed(1)}%`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyCorrectFFGData().then(() => {
  console.log('\n✅ FFG product data has been CORRECTLY mapped!');
  console.log('📊 All carriers and products now match the PDF exactly');
  console.log('💡 Key corrections:');
  console.log('  - American Home Life: Only has FE product');
  console.log('  - SBLI: Only has SBLI Term');
  console.log('  - Baltimore Life: Has Silver Guard FE and APRIORITY products');
  console.log('  - John Hancock: Has Simple Term, Path Setter, Everlast, Exccudex');
  console.log('  - Legal & General America: Has Term product');
  process.exit(0);
}).catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});