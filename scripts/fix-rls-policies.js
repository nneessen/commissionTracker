// /home/nneessen/projects/commissionTracker/scripts/fix-rls-policies.js
// Fix RLS policies to allow anonymous access to carriers and products
// Uses the SAME pattern as populate-database.js

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
  console.log('🔧 Fixing RLS Policies for Anonymous Access\n');

  // SQL statements to drop restrictive policies and create permissive ones
  const statements = [
    // Drop existing restrictive policies
    "DROP POLICY IF EXISTS \"Authenticated users can manage carriers\" ON carriers",
    "DROP POLICY IF EXISTS \"Enable read access for all users\" ON carriers",
    "DROP POLICY IF EXISTS \"Enable read access for all users\" ON products",

    // Create new permissive policies for anon/public access
    "CREATE POLICY \"Allow public read carriers\" ON carriers FOR SELECT TO public USING (true)",
    "CREATE POLICY \"Allow public read products\" ON products FOR SELECT TO public USING (is_active = true)"
  ];

  console.log(`Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const action = statement.includes('DROP') ? 'Dropping' : 'Creating';
    const table = statement.includes('carriers') ? 'carriers' : 'products';

    console.log(`[${i + 1}/${statements.length}] ${action} policy on ${table}...`);

    try {
      // Try direct query execution
      const { error } = await supabase.rpc('query', { sql: statement });

      if (error) {
        // RPC might not exist, try alternative
        console.log(`  ⚠️  RPC error: ${error.message}`);

        // Try using raw SQL via postgrest
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        console.log('  ✅ Success (via REST API)');
        successCount++;
      } else {
        console.log('  ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);

      // For DROP statements, failure is OK (policy might not exist)
      if (statement.includes('DROP')) {
        console.log('  ℹ️  Continuing (policy may not exist)...');
        continue;
      }

      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some policies could not be created via API.\n');
    console.log('Manual fix required - Run this in Supabase Dashboard SQL Editor:');
    console.log('\n```sql');
    statements.forEach(stmt => console.log(stmt + ';'));
    console.log('```\n');
  }

  // Test if anonymous access now works
  console.log('🔍 Testing anonymous access...\n');

  const { data: carriers, error: carriersError } = await anonClient
    .from('carriers')
    .select('id, name, code')
    .limit(5);

  const { data: products, error: productsError } = await anonClient
    .from('products')
    .select('id, name, commission_percentage')
    .limit(5);

  console.log('With Anonymous Key:');
  if (carriersError) {
    console.log(`  ❌ Carriers: ${carriersError.message}`);
  } else {
    console.log(`  ✅ Carriers: ${carriers?.length || 0} found`);
    if (carriers && carriers.length > 0) {
      carriers.forEach(c => console.log(`     - ${c.name} (${c.code})`));
    }
  }

  if (productsError) {
    console.log(`  ❌ Products: ${productsError.message}`);
  } else {
    console.log(`  ✅ Products: ${products?.length || 0} found`);
    if (products && products.length > 0) {
      console.log(`     Sample: ${products[0].name} - ${(products[0].commission_percentage * 100).toFixed(1)}%`);
    }
  }

  if (!carriersError && !productsError && carriers.length > 0 && products.length > 0) {
    console.log('\n✅ SUCCESS! Anonymous access is working!');
    console.log('\nNext steps:');
    console.log('  1. npm run dev');
    console.log('  2. Open http://localhost:3002');
    console.log('  3. Click "New Policy" → Select carrier → Products populate!');
    return true;
  } else {
    console.log('\n❌ Fix incomplete. Manual SQL execution required.');
    return false;
  }
}

fixRLSPolicies().then((success) => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
