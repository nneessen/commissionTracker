// /home/nneessen/projects/commissionTracker/scripts/disable-rls.js
// Disable RLS on carriers and products tables using Supabase Management API

import { createClient } from '@supabase/supabase-js';
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

console.log('🔧 Disabling RLS on carriers and products tables...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRLS() {
  // The SQL to execute
  const sql = `
    ALTER TABLE public.carriers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
  `;

  console.log('📝 Executing SQL:');
  console.log(sql);
  console.log('');

  // Try using Supabase REST API
  try {
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (!projectRef) {
      throw new Error('Could not extract project reference from URL');
    }

    // Use Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️  Management API not accessible');
      console.log('Response:', errorText);
      console.log('');
      throw new Error('Management API call failed');
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully!');
    console.log('Result:', result);

  } catch (error) {
    console.log('⚠️  Could not execute via Management API');
    console.log('Error:', error.message);
    console.log('');
    console.log('Please execute this SQL manually in Supabase Dashboard:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] + '/sql');
    console.log('2. Run this SQL:');
    console.log('');
    console.log('   ALTER TABLE public.carriers DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;');
    console.log('');
    process.exit(1);
  }

  // Verify it worked by testing anon key access
  console.log('\n🔍 Verifying fix...');

  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

  const { data: carriers, error: carriersError } = await anonClient
    .from('carriers')
    .select('id, name');

  const { data: products, error: productsError } = await anonClient
    .from('products')
    .select('id, name');

  console.log('\nWith Anonymous Key:');
  if (carriersError) {
    console.log(`  ❌ Carriers: ${carriersError.message}`);
  } else {
    console.log(`  ✅ Carriers: ${carriers?.length || 0} found`);
  }

  if (productsError) {
    console.log(`  ❌ Products: ${productsError.message}`);
  } else {
    console.log(`  ✅ Products: ${products?.length || 0} found`);
  }

  if (carriers?.length > 0 && products?.length > 0) {
    console.log('\n✅ SUCCESS! RLS disabled and data is now accessible.');
    console.log('\nNext steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Open: http://localhost:3002');
    console.log('  3. Click "New Policy"');
    console.log('  4. Select a carrier - products should populate!');
  } else {
    console.log('\n❌ Fix did not work. Please apply SQL manually in Supabase Dashboard.');
  }
}

disableRLS().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
