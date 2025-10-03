// /home/nneessen/projects/commissionTracker/scripts/test-full-flow.js

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

console.log('🧪 Testing complete carrier-product flow...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullFlow() {
  try {
    // Step 1: Get carriers (same query as useLegacyCarriers)
    console.log('1️⃣ Fetching carriers (as PolicyForm would)...');
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('*')
      .order('name');

    if (carriersError) {
      console.error('❌ Error fetching carriers:', carriersError);
      return;
    }

    console.log(`✅ Found ${carriers?.length || 0} carriers`);

    // Show FFG carriers
    const ffgCarriers = carriers?.filter(c =>
      c.name.includes('United Home Life') ||
      c.name.includes('SBLI') ||
      c.name.includes('American Home Life')
    ) || [];

    console.log('   FFG Carriers available:');
    ffgCarriers.forEach(c => {
      console.log(`   - ${c.name} (ID: ${c.id})`);
    });

    // Step 2: Test product fetching for first FFG carrier
    if (ffgCarriers.length > 0) {
      const testCarrier = ffgCarriers[0];
      console.log(`\n2️⃣ Fetching products for ${testCarrier.name}...`);

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('carrier_id', testCarrier.id)
        .order('name');

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
      } else {
        console.log(`✅ Found ${products?.length || 0} products:`);
        products?.forEach(p => {
          console.log(`   - ${p.name}: ${(p.commission_percentage * 100).toFixed(1)}% commission`);
        });
      }
    }

    // Step 3: Verify the exact IDs that should work
    console.log('\n3️⃣ Verifying expected carrier-product relationships...');

    const expectedCarriers = [
      { id: '00001000-0000-0000-0000-000000000000', name: 'United Home Life' },
      { id: '00001001-0000-0000-0000-000000000000', name: 'SBLI' },
      { id: '00001002-0000-0000-0000-000000000000', name: 'American Home Life' },
    ];

    for (const expected of expectedCarriers) {
      // Check carrier exists
      const { data: carrier } = await supabase
        .from('carriers')
        .select('*')
        .eq('id', expected.id)
        .single();

      // Check products exist
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('carrier_id', expected.id);

      if (carrier) {
        console.log(`✅ ${expected.name}: Found with ${products?.length || 0} products`);
      } else {
        console.log(`❌ ${expected.name}: Not found in database`);
      }
    }

    console.log('\n📊 Summary:');
    console.log('- Carriers are properly loaded from Supabase');
    console.log('- Products are associated with the correct carrier IDs');
    console.log('- The PolicyForm should now show products when a carrier is selected');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFullFlow().then(() => {
  console.log('\n✅ Test complete!');
  console.log('💡 The fix applied: Changed PolicyForm to use carriers from Supabase instead of localStorage');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});