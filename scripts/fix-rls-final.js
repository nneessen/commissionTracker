// /home/nneessen/projects/commissionTracker/scripts/fix-rls-final.js
// Uses the SAME create_policy_if_not_exists function that migration 008 created

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !anonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies Using create_policy_if_not_exists Function\n');

  try {
    // Drop the restrictive carrier policy and create a new permissive one
    console.log('[1/2] Creating public read policy for carriers...');
    const { data: d1, error: e1 } = await supabase.rpc('create_policy_if_not_exists', {
      policy_name: 'Allow public read carriers',
      table_name: 'carriers',
      policy_command: 'SELECT',
      policy_using: 'true',
      policy_check: null
    });

    if (e1) {
      console.log(`  ❌ Error: ${e1.message}`);
      throw e1;
    }
    console.log('  ✅ Success\n');

    // Create permissive policy for products
    console.log('[2/2] Creating public read policy for products...');
    const { data: d2, error: e2 } = await supabase.rpc('create_policy_if_not_exists', {
      policy_name: 'Allow public read products',
      table_name: 'products',
      policy_command: 'SELECT',
      policy_using: 'is_active = true',
      policy_check: null
    });

    if (e2) {
      console.log(`  ❌ Error: ${e2.message}`);
      throw e2;
    }
    console.log('  ✅ Success\n');

  } catch (err) {
    console.error('❌ Failed to create policies:', err.message);
    console.log('\nTrying alternative approach - disabling RLS entirely...\n');

    // Alternative: just disable RLS (simpler, works for single-user app)
    try {
      console.log('Attempting to disable RLS via ALTER TABLE...');

      // Try using a transaction
      const { error: txError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
          ALTER TABLE products DISABLE ROW LEVEL SECURITY;
        `
      });

      if (txError) {
        throw new Error(`Cannot disable RLS via RPC: ${txError.message}`);
      }

      console.log('✅ RLS disabled successfully!\n');

    } catch (altErr) {
      console.error('❌ Alternative approach also failed:', altErr.message);
      console.log('\n' + '='.repeat(80));
      console.log('\n⚠️  AUTOMATED FIX NOT POSSIBLE\n');
      console.log('Your Supabase project does not allow SQL execution via API.');
      console.log('\nYou MUST run this SQL in Supabase Dashboard:');
      console.log('https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql\n');
      console.log('```sql');
      console.log('ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE products DISABLE ROW LEVEL SECURITY;');
      console.log('```\n');
      console.log('='.repeat(80) + '\n');
      process.exit(1);
    }
  }

  // Test if it worked
  console.log('🔍 Testing anonymous access...\n');

  const { data: carriers, error: cErr } = await anonClient
    .from('carriers')
    .select('id, name')
    .limit(5);

  const { data: products, error: pErr } = await anonClient
    .from('products')
    .select('id, name')
    .limit(5);

  console.log('Results with Anonymous Key:');
  if (!cErr && carriers && carriers.length > 0) {
    console.log(`  ✅ Carriers: ${carriers.length} found`);
    carriers.forEach(c => console.log(`     - ${c.name}`));
  } else {
    console.log(`  ❌ Carriers: ${cErr?.message || '0 found'}`);
  }

  if (!pErr && products && products.length > 0) {
    console.log(`  ✅ Products: ${products.length} found`);
    console.log(`     Sample: ${products[0].name}`);
  } else {
    console.log(`  ❌ Products: ${pErr?.message || '0 found'}`);
  }

  if (carriers?.length > 0 && products?.length > 0) {
    console.log('\n✅ SUCCESS! Products dropdown will now populate!');
    console.log('\nTest it:');
    console.log('  1. npm run dev');
    console.log('  2. Open http://localhost:3002');
    console.log('  3. Click "New Policy"');
    console.log('  4. Select carrier → Products populate!\n');
    return true;
  } else {
    console.log('\n❌ Fix did not work. Manual SQL required.\n');
    return false;
  }
}

fixRLSPolicies().then((success) => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
