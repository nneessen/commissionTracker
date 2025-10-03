// /home/nneessen/projects/commissionTracker/scripts/setup-rls-policies.js
// Setup RLS policies for carriers and products tables

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Must use service role key to manage RLS policies
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRLSPolicies() {
  console.log('🔒 Setting up RLS policies...\n');

  // SQL statements to enable RLS and create policies
  const statements = [
    // Enable RLS on carriers table
    `ALTER TABLE carriers ENABLE ROW LEVEL SECURITY`,

    // Drop existing policies if any (to avoid conflicts)
    `DROP POLICY IF EXISTS "Allow public read access to carriers" ON carriers`,
    `DROP POLICY IF EXISTS "Allow authenticated users to manage carriers" ON carriers`,

    // Create read policy for carriers (everyone can read)
    `CREATE POLICY "Allow public read access to carriers"
     ON carriers FOR SELECT
     USING (true)`,

    // Enable RLS on products table
    `ALTER TABLE products ENABLE ROW LEVEL SECURITY`,

    // Drop existing policies if any
    `DROP POLICY IF EXISTS "Allow public read access to products" ON products`,
    `DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON products`,

    // Create read policy for products (everyone can read)
    `CREATE POLICY "Allow public read access to products"
     ON products FOR SELECT
     USING (true)`,
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const sql of statements) {
    const description = sql.includes('DROP') ? 'Dropping existing policy' :
                       sql.includes('ALTER') ? 'Enabling RLS' :
                       sql.includes('CREATE') ? 'Creating policy' : 'Running SQL';

    console.log(`${description}...`);

    try {
      // Try using the execute_sql RPC if available
      const { error: rpcError } = await supabase.rpc('execute_sql', { sql });

      if (rpcError && rpcError.code === 'PGRST202') {
        // RPC doesn't exist, try a different approach
        // For RLS policies, we need to use the Supabase REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql })
        });

        if (!response.ok) {
          // If RPC doesn't work, we'll need to apply these manually
          console.log('  ⚠️  Cannot execute via API - apply manually in Supabase Dashboard');
          console.log(`     SQL: ${sql.substring(0, 60)}...`);
        } else {
          console.log('  ✅ Success');
          successCount++;
        }
      } else if (rpcError) {
        console.error(`  ❌ Error: ${rpcError.message}`);
        errorCount++;
      } else {
        console.log('  ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);

  if (errorCount > 0 || successCount === 0) {
    console.log('\n⚠️  Some policies could not be applied automatically.');
    console.log('   Please run the following SQL in your Supabase SQL Editor:\n');

    console.log('```sql');
    console.log('-- Enable RLS on carriers table');
    console.log('ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Allow everyone to read carriers');
    console.log('CREATE POLICY "Allow public read access to carriers"');
    console.log('ON carriers FOR SELECT');
    console.log('USING (true);');
    console.log('');
    console.log('-- Enable RLS on products table');
    console.log('ALTER TABLE products ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Allow everyone to read products');
    console.log('CREATE POLICY "Allow public read access to products"');
    console.log('ON products FOR SELECT');
    console.log('USING (true);');
    console.log('```');
  }

  // Test if policies are working with anon key
  console.log('\n🔍 Testing with anon key...');
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    const anonSupabase = createClient(supabaseUrl, anonKey);

    const { count: carrierCount, error: carrierError } = await anonSupabase
      .from('carriers')
      .select('*', { count: 'exact', head: true });

    const { count: productCount, error: productError } = await anonSupabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log('With anon key:');
    if (carrierError) {
      console.log(`  ❌ Cannot read carriers: ${carrierError.message}`);
    } else {
      console.log(`  ✅ Can read carriers: ${carrierCount} found`);
    }

    if (productError) {
      console.log(`  ❌ Cannot read products: ${productError.message}`);
    } else {
      console.log(`  ✅ Can read products: ${productCount} found`);
    }
  }
}

setupRLSPolicies().then(() => {
  console.log('\n✅ RLS policy setup complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});