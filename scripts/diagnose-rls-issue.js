// /home/nneessen/projects/commissionTracker/scripts/diagnose-rls-issue.js
// Comprehensive diagnostic to understand WHY products dropdown isn't populating

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 COMPREHENSIVE RLS DIAGNOSTIC\n');
console.log('=' .repeat(80));

// Verify environment variables
console.log('\n📋 STEP 1: Environment Variables Check\n');
console.log(`VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('\n❌ Missing required environment variables!');
  console.log('\nCheck your .env file has:');
  console.log('  VITE_SUPABASE_URL=https://xxx.supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJh...');
  console.log('  VITE_SUPABASE_ANON_KEY=eyJh...');
  process.exit(1);
}

// Verify .env file structure
console.log('\n📋 STEP 2: Frontend Configuration Check\n');
const envPath = join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasAnonKey = envContent.includes('VITE_SUPABASE_ANON_KEY');
  const hasUrl = envContent.includes('VITE_SUPABASE_URL');
  console.log(`✅ Contains VITE_SUPABASE_URL: ${hasUrl}`);
  console.log(`✅ Contains VITE_SUPABASE_ANON_KEY: ${hasAnonKey}`);
} else {
  console.log('⚠️  .env file not found in project root');
}

// Create clients
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLSStatus() {
  console.log('\n📋 STEP 3: RLS Status Check\n');

  const { data, error } = await serviceClient
    .from('pg_tables')
    .select('schemaname, tablename, rowsecurity')
    .in('tablename', ['carriers', 'products']);

  if (error) {
    console.log('⚠️  Cannot query pg_tables (might need different approach)');
    console.log('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    data.forEach(table => {
      const rlsStatus = table.rowsecurity ? '🔒 ENABLED' : '🔓 DISABLED';
      console.log(`  ${table.tablename}: ${rlsStatus}`);
    });
  } else {
    console.log('⚠️  Could not determine RLS status via pg_tables');
  }
}

async function checkRLSPolicies() {
  console.log('\n📋 STEP 4: Existing RLS Policies\n');

  const { data, error } = await serviceClient
    .from('pg_policies')
    .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
    .in('tablename', ['carriers', 'products']);

  if (error) {
    console.log('⚠️  Cannot query pg_policies');
    console.log('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  ❌ NO RLS POLICIES FOUND!');
    console.log('  This is likely the root cause - tables have RLS enabled but no policies');
    return;
  }

  console.log(`  Found ${data.length} policies:\n`);
  data.forEach(policy => {
    console.log(`  📜 ${policy.tablename}.${policy.policyname}`);
    console.log(`     Command: ${policy.cmd}`);
    console.log(`     Roles: ${policy.roles}`);
    console.log(`     Permissive: ${policy.permissive}`);
    console.log('');
  });
}

async function testServiceRoleAccess() {
  console.log('\n📋 STEP 5: Service Role Key Access Test\n');

  // Test carriers
  const { data: carriers, error: carriersError } = await serviceClient
    .from('carriers')
    .select('id, name, code');

  if (carriersError) {
    console.log('  ❌ Carriers query failed:', carriersError.message);
  } else {
    console.log(`  ✅ Carriers: ${carriers?.length || 0} found`);
    if (carriers && carriers.length > 0) {
      console.log(`     Sample: ${carriers[0].name} (${carriers[0].code})`);
    }
  }

  // Test products
  const { data: products, error: productsError } = await serviceClient
    .from('products')
    .select('id, name, carrier_id, commission_percentage');

  if (productsError) {
    console.log('  ❌ Products query failed:', productsError.message);
  } else {
    console.log(`  ✅ Products: ${products?.length || 0} found`);
    if (products && products.length > 0) {
      console.log(`     Sample: ${products[0].name} (${(products[0].commission_percentage * 100).toFixed(1)}%)`);
    }
  }
}

async function testAnonKeyAccess() {
  console.log('\n📋 STEP 6: Anonymous Key Access Test (CRITICAL!)\n');
  console.log('This simulates what the frontend experiences:\n');

  // Test carriers with anon key
  const { data: carriers, error: carriersError } = await anonClient
    .from('carriers')
    .select('id, name, code');

  console.log('  Carriers Query:');
  if (carriersError) {
    console.log('    ❌ FAILED');
    console.log(`    Error Code: ${carriersError.code}`);
    console.log(`    Error Message: ${carriersError.message}`);
    console.log(`    Error Details: ${carriersError.details}`);
    console.log(`    Error Hint: ${carriersError.hint}`);
  } else {
    console.log(`    ✅ SUCCESS: ${carriers?.length || 0} carriers found`);
    if (carriers && carriers.length > 0) {
      carriers.forEach(c => console.log(`       - ${c.name} (${c.code})`));
    }
  }

  // Test products with anon key
  const { data: products, error: productsError } = await anonClient
    .from('products')
    .select('id, name, carrier_id, commission_percentage, is_active');

  console.log('\n  Products Query:');
  if (productsError) {
    console.log('    ❌ FAILED');
    console.log(`    Error Code: ${productsError.code}`);
    console.log(`    Error Message: ${productsError.message}`);
    console.log(`    Error Details: ${productsError.details}`);
    console.log(`    Error Hint: ${productsError.hint}`);
  } else {
    console.log(`    ✅ SUCCESS: ${products?.length || 0} products found`);
    if (products && products.length > 0) {
      const sampleProduct = products[0];
      console.log(`       Sample: ${sampleProduct.name}`);
      console.log(`       Carrier ID: ${sampleProduct.carrier_id}`);
      console.log(`       Commission: ${(sampleProduct.commission_percentage * 100).toFixed(1)}%`);
    }
  }
}

async function testFrontendQuery() {
  console.log('\n📋 STEP 7: Simulate Frontend useProducts Query\n');
  console.log('This is the EXACT query that useProducts hook makes:\n');

  // Get a carrier ID first
  const { data: carriers } = await serviceClient
    .from('carriers')
    .select('id, name')
    .limit(1);

  if (!carriers || carriers.length === 0) {
    console.log('  ⚠️  No carriers found to test with');
    return;
  }

  const testCarrierId = carriers[0].id;
  console.log(`  Test Carrier: ${carriers[0].name} (${testCarrierId})\n`);

  // Simulate useProducts query with anon key
  console.log('  Query: SELECT * FROM products');
  console.log('         WHERE carrier_id = ? AND is_active = true');
  console.log('         ORDER BY name\n');

  const { data, error } = await anonClient
    .from('products')
    .select('*')
    .eq('carrier_id', testCarrierId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.log('  ❌ QUERY FAILED (This is why dropdown is empty!)');
    console.log(`     Error: ${error.message}`);
    console.log(`     Code: ${error.code}`);
  } else {
    console.log(`  ✅ QUERY SUCCESS: ${data?.length || 0} products returned`);
    if (data && data.length > 0) {
      console.log('\n  Products that SHOULD appear in dropdown:');
      data.forEach((p, i) => {
        console.log(`     ${i + 1}. ${p.name} - ${(p.commission_percentage * 100).toFixed(1)}%`);
      });
    }
  }
}

async function provideSolution() {
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 DIAGNOSIS SUMMARY & SOLUTION\n');

  // Re-test anon access to determine solution
  const { data: testData, error: testError } = await anonClient
    .from('products')
    .select('id')
    .limit(1);

  if (testError) {
    console.log('🔴 ROOT CAUSE IDENTIFIED:');
    console.log('   Anonymous key CANNOT access products/carriers tables\n');

    console.log('📝 SOLUTION (Choose ONE):\n');

    console.log('Option A - Disable RLS (Fastest, Recommended for MVP):');
    console.log('  1. Go to Supabase Dashboard → SQL Editor');
    console.log('  2. Run this SQL:\n');
    console.log('     ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;');
    console.log('     ALTER TABLE products DISABLE ROW LEVEL SECURITY;\n');
    console.log('  3. Run this diagnostic script again to verify\n');

    console.log('Option B - Create RLS Policies (More Secure):');
    console.log('  1. Go to Supabase Dashboard → SQL Editor');
    console.log('  2. Run this SQL:\n');
    console.log('     CREATE POLICY "allow_anon_select_carriers"');
    console.log('     ON carriers FOR SELECT TO anon USING (true);\n');
    console.log('     CREATE POLICY "allow_anon_select_products"');
    console.log('     ON products FOR SELECT TO anon USING (is_active = true);\n');
    console.log('  3. Run this diagnostic script again to verify\n');
  } else {
    console.log('✅ ANON KEY CAN ACCESS DATA!');
    console.log('   RLS is correctly configured\n');

    console.log('🤔 If dropdown still not populating, check:');
    console.log('   1. Browser DevTools → Network tab');
    console.log('   2. Look for requests to Supabase');
    console.log('   3. Check request headers have correct anon key');
    console.log('   4. Check response data');
    console.log('   5. Verify useProducts hook is being called\n');
  }

  console.log('After applying fix:');
  console.log('  1. Run: node scripts/diagnose-rls-issue.js');
  console.log('  2. Verify Step 6 shows SUCCESS for both tables');
  console.log('  3. Test in browser at http://localhost:3002');
  console.log('  4. Open Policy Form → Select Carrier → See Products populate\n');
}

async function runDiagnostics() {
  try {
    await checkRLSStatus();
    await checkRLSPolicies();
    await testServiceRoleAccess();
    await testAnonKeyAccess();
    await testFrontendQuery();
    await provideSolution();

    console.log('='.repeat(80));
    console.log('\n✅ Diagnostic Complete!\n');
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

runDiagnostics();
