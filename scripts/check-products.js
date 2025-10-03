// /home/nneessen/projects/commissionTracker/scripts/check-products.js
// Quick script to check if products are in the database

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log('🔍 Checking products in database...\n');

  // Check total products
  const { data: allProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, carrier_id');

  if (productsError) {
    console.error('❌ Error fetching products:', productsError);
    return;
  }

  console.log(`✅ Total products in database: ${allProducts?.length || 0}`);

  // Check carriers
  const { data: carriers, error: carriersError } = await supabase
    .from('carriers')
    .select('id, name, code');

  if (carriersError) {
    console.error('❌ Error fetching carriers:', carriersError);
    return;
  }

  console.log(`✅ Total carriers in database: ${carriers?.length || 0}\n`);

  // Check which carriers have products
  console.log('📊 Carriers with products:');
  for (const carrier of carriers || []) {
    const productsForCarrier = allProducts?.filter(p => p.carrier_id === carrier.id) || [];
    console.log(`  - ${carrier.name} (${carrier.code}): ${productsForCarrier.length} products`);
  }

  // Show FFG carriers
  console.log('\n📋 FFG Carriers (should have products):');
  const ffgCarrierIds = [
    '00001000-0000-0000-0000-000000000000',
    '00001001-0000-0000-0000-000000000000',
    '00001002-0000-0000-0000-000000000000',
    '00001003-0000-0000-0000-000000000000',
    '00001004-0000-0000-0000-000000000000',
    '00001005-0000-0000-0000-000000000000',
    '00001006-0000-0000-0000-000000000000',
  ];

  const ffgCarriers = carriers?.filter(c => ffgCarrierIds.includes(c.id)) || [];
  console.log(`  Found ${ffgCarriers.length} FFG carriers in database`);

  if (ffgCarriers.length === 0) {
    console.log('  ⚠️  FFG carriers not found. Migration may not have been run.');
  }
}

checkProducts().then(() => {
  console.log('\n✅ Check complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
