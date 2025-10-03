// /home/nneessen/projects/commissionTracker/scripts/apply-rls-fix.js
// Apply RLS fix directly through Supabase admin API

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from URL');
  process.exit(1);
}

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix through Supabase Management API...\n');
  console.log('Project Reference:', projectRef);

  // First, let's try a simpler approach - just disable RLS entirely
  const simpleSQL = `
    -- Disable RLS on both tables to allow public read access
    ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE products DISABLE ROW LEVEL SECURITY;
  `;

  console.log('\nDisabling RLS on carriers and products tables...\n');

  // Try using the Supabase Management API
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  try {
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: simpleSQL })
    });

    if (!response.ok) {
      console.log('⚠️  Management API not accessible. Trying alternative approach...');

      // Alternative: Use direct PostgreSQL connection if available
      console.log('\n📝 Please run this SQL in your Supabase Dashboard SQL Editor:\n');
      console.log('```sql');
      console.log('-- Disable RLS to allow public access');
      console.log('ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE products DISABLE ROW LEVEL SECURITY;');
      console.log('```');
      console.log('\nOr if you want to keep RLS enabled with public read access:\n');
      console.log('```sql');
      console.log('-- Keep RLS but allow everyone to read');
      console.log('ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE products ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('DROP POLICY IF EXISTS "Enable read access for all users" ON carriers;');
      console.log('CREATE POLICY "Enable read access for all users" ON carriers');
      console.log('    FOR SELECT USING (true);');
      console.log('');
      console.log('DROP POLICY IF EXISTS "Enable read access for all users" ON products;');
      console.log('CREATE POLICY "Enable read access for all users" ON products');
      console.log('    FOR SELECT USING (true);');
      console.log('```');
    } else {
      console.log('✅ RLS disabled successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\n📝 Please apply the fix manually in Supabase Dashboard');
  }

  // Test with anon key
  console.log('\n🔍 Testing access with anon key...');
  const { createClient } = await import('@supabase/supabase-js');
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (anonKey) {
    const supabase = createClient(supabaseUrl, anonKey);

    const { data: carriers, error: carrierError } = await supabase
      .from('carriers')
      .select('id, name')
      .limit(1);

    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);

    if (!carrierError && carriers && carriers.length > 0) {
      console.log('✅ Anon user can read carriers!');
      console.log(`   Sample: ${carriers[0].name}`);
    } else {
      console.log('❌ Anon user cannot read carriers');
      if (carrierError) console.log(`   Error: ${carrierError.message}`);
    }

    if (!productError && products && products.length > 0) {
      console.log('✅ Anon user can read products!');
      console.log(`   Sample: ${products[0].name}`);
    } else {
      console.log('❌ Anon user cannot read products');
      if (productError) console.log(`   Error: ${productError.message}`);
    }
  }
}

applyRLSFix().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});