// /home/nneessen/projects/commissionTracker/scripts/test-products-query.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env (not .env.local)
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing products query...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? 'Set' : 'Not set'}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProductsQuery() {
  try {
    // Test 1: Check if we can connect and query carriers
    console.log('1️⃣ Testing carriers query...');
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('*')
      .limit(5);

    if (carriersError) {
      console.error('❌ Error querying carriers:', carriersError);
    } else {
      console.log(`✅ Found ${carriers?.length || 0} carriers`);
      if (carriers?.length > 0) {
        console.log('   First carrier:', carriers[0].name);
      }
    }

    // Test 2: Check products table
    console.log('\n2️⃣ Testing products query...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(10);

    if (productsError) {
      console.error('❌ Error querying products:', productsError);
    } else {
      console.log(`✅ Found ${products?.length || 0} products`);
      if (products?.length > 0) {
        console.log('   Sample products:');
        products.slice(0, 3).forEach(p => {
          console.log(`   - ${p.name} (carrier_id: ${p.carrier_id})`);
        });
      }
    }

    // Test 3: Test the exact query from useProducts hook
    console.log('\n3️⃣ Testing useProducts query for a specific carrier...');
    const testCarrierId = '00001000-0000-0000-0000-000000000000'; // United Home Life

    const { data: specificProducts, error: specificError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('carrier_id', testCarrierId)
      .order('name');

    if (specificError) {
      console.error('❌ Error with specific carrier query:', specificError);
    } else {
      console.log(`✅ Found ${specificProducts?.length || 0} products for United Home Life`);
      if (specificProducts?.length > 0) {
        specificProducts.forEach(p => {
          console.log(`   - ${p.name}: ${(p.commission_percentage * 100).toFixed(1)}% commission`);
        });
      }
    }

    // Test 4: Check if FFG carriers exist
    console.log('\n4️⃣ Checking FFG carriers...');
    const ffgCarriers = [
      '00001000-0000-0000-0000-000000000000', // United Home Life
      '00001001-0000-0000-0000-000000000000', // SBLI
      '00001002-0000-0000-0000-000000000000', // American Home Life
    ];

    for (const carrierId of ffgCarriers) {
      const { data: carrier } = await supabase
        .from('carriers')
        .select('name')
        .eq('id', carrierId)
        .single();

      const { data: prods } = await supabase
        .from('products')
        .select('id')
        .eq('carrier_id', carrierId);

      console.log(`   ${carrier?.name || 'Not found'}: ${prods?.length || 0} products`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testProductsQuery().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});