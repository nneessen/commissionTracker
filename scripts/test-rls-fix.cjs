#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/scripts/test-rls-fix.cjs
//
// Test that anonymous users can now read carriers and products after RLS fix

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   VITE_SUPABASE_ANON_KEY:', ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

async function testRLSFix() {
  console.log('🧪 Testing RLS Fix for Carriers and Products\n');

  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  // Test carriers
  console.log('📋 Testing carriers table (anonymous access)...');
  const { data: carriers, error: carriersError } = await supabase
    .from('carriers')
    .select('*');

  if (carriersError) {
    console.error('  ❌ ERROR:', carriersError.message);
    console.error('  Code:', carriersError.code);
  } else {
    console.log(`  ✅ SUCCESS: ${carriers.length} carriers found`);
    if (carriers.length > 0) {
      console.log(`  Sample: ${carriers[0].name}`);
    }
  }

  console.log('');

  // Test products
  console.log('📦 Testing products table (anonymous access)...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*');

  if (productsError) {
    console.error('  ❌ ERROR:', productsError.message);
    console.error('  Code:', productsError.code);
  } else {
    console.log(`  ✅ SUCCESS: ${products.length} products found`);
    if (products.length > 0) {
      console.log(`  Sample: ${products[0].name} (${products[0].carrier_id})`);
    }
  }

  console.log('');

  // Test filtered products by carrier
  if (carriers && carriers.length > 0) {
    const testCarrierId = carriers[0].id;
    console.log(`🔍 Testing filtered products for carrier: ${carriers[0].name}...`);

    const { data: filteredProducts, error: filteredError } = await supabase
      .from('products')
      .select('*')
      .eq('carrier_id', testCarrierId)
      .eq('is_active', true);

    if (filteredError) {
      console.error('  ❌ ERROR:', filteredError.message);
    } else {
      console.log(`  ✅ SUCCESS: ${filteredProducts.length} products found for this carrier`);
      if (filteredProducts.length > 0) {
        console.log('  Products:');
        filteredProducts.forEach(p => {
          console.log(`    - ${p.name} (${p.commission_rate}%)`);
        });
      }
    }
  }

  console.log('\n' + '='.repeat(60));

  if (!carriersError && !productsError) {
    console.log('✅ RLS FIX SUCCESSFUL!');
    console.log('   Anonymous users can now read carriers and products.');
    console.log('   Products dropdown should now work in the UI.');
  } else {
    console.log('❌ RLS FIX INCOMPLETE');
    console.log('   Please run the SQL in scripts/fix-rls-policies.sql');
    console.log('   In Supabase Dashboard -> SQL Editor');
  }

  console.log('='.repeat(60));
}

testRLSFix().catch(console.error);
