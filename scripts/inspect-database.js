// /home/nneessen/projects/commissionTracker/scripts/inspect-database.js
// Thoroughly inspect the actual database schema and data

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Try service role key first, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables. Please check .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');

async function inspectDatabase() {
  console.log('🔍 Database Inspection Starting...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');

  // 1. Check if products table exists and get schema
  console.log('📊 Checking products table...');
  try {
    const { data: testQuery, error: testError } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error accessing products table:', testError);
      return;
    }

    console.log('✅ Products table exists');
    if (testQuery && testQuery.length > 0) {
      console.log('📋 Sample product structure:');
      console.log(JSON.stringify(testQuery[0], null, 2));
      console.log('\n🔑 Product columns:', Object.keys(testQuery[0]));
    }
  } catch (err) {
    console.error('❌ Failed to query products:', err);
  }

  // 2. Count total products
  console.log('\n📊 Product Statistics:');
  const { count: totalProducts, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting products:', countError);
  } else {
    console.log(`  Total products: ${totalProducts}`);
  }

  // 3. Get all carriers and their product counts
  console.log('\n🏢 Carriers and Products:');
  const { data: carriers, error: carriersError } = await supabase
    .from('carriers')
    .select('id, name, code')
    .order('name');

  if (carriersError) {
    console.error('❌ Error fetching carriers:', carriersError);
    return;
  }

  console.log(`Found ${carriers?.length || 0} carriers:\n`);

  // 4. Check products for each carrier
  for (const carrier of carriers || []) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, commission_percentage, product_type')
      .eq('carrier_id', carrier.id);

    if (error) {
      console.error(`  ❌ Error for ${carrier.name}:`, error.message);
    } else {
      console.log(`  ${carrier.name} (${carrier.id}):`);
      console.log(`    - Code: ${carrier.code}`);
      console.log(`    - Products: ${products?.length || 0}`);
      if (products && products.length > 0) {
        products.forEach(p => {
          console.log(`      • ${p.name} (${p.product_type}) - ${p.commission_percentage ? (p.commission_percentage * 100).toFixed(2) + '%' : 'No commission'}`);
        });
      }
    }
  }

  // 5. Test the exact query that useProducts hook uses
  console.log('\n🔬 Testing useProducts query:');
  const testCarrierId = carriers?.[0]?.id;
  if (testCarrierId) {
    console.log(`Testing with carrier ID: ${testCarrierId}`);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('carrier_id', testCarrierId)
      .order('name');

    if (error) {
      console.error('❌ Query failed:', error);
    } else {
      console.log(`✅ Query returned ${data?.length || 0} products`);
      if (data && data.length > 0) {
        console.log('First product:', JSON.stringify(data[0], null, 2));
      }
    }
  }

  // 6. Check for is_active column
  console.log('\n🔍 Checking is_active column:');
  const { data: activeCheck, error: activeError } = await supabase
    .from('products')
    .select('id, name, is_active')
    .limit(5);

  if (activeError) {
    console.error('❌ Error checking is_active:', activeError);
  } else {
    console.log('Sample is_active values:');
    activeCheck?.forEach(p => {
      console.log(`  - ${p.name}: is_active = ${p.is_active}`);
    });
  }

  // 7. Try without is_active filter
  console.log('\n🔍 Testing without is_active filter:');
  const { data: allProducts, error: allError } = await supabase
    .from('products')
    .select('id, name, carrier_id')
    .limit(10);

  if (allError) {
    console.error('❌ Error:', allError);
  } else {
    console.log(`Found ${allProducts?.length || 0} products (first 10)`);
  }
}

inspectDatabase().then(() => {
  console.log('\n✅ Inspection complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});