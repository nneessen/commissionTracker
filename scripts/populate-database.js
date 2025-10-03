// /home/nneessen/projects/commissionTracker/scripts/populate-database.js
// Run the FFG import migration to populate carriers and products

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFFGImport() {
  console.log('📦 Running FFG Import Migration...\n');

  // Read the FFG import SQL file
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251003_003_ffg_import.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ FFG import file not found:', sqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon and filter out empty statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments and transaction commands
    if (statement.trim().startsWith('--') ||
        statement.trim().toUpperCase() === 'BEGIN;' ||
        statement.trim().toUpperCase() === 'COMMIT;') {
      continue;
    }

    // Get a brief description of the statement
    let description = statement.substring(0, 50).replace(/\n/g, ' ');
    if (statement.includes('INSERT INTO carriers')) {
      description = 'Inserting carriers...';
    } else if (statement.includes('INSERT INTO products')) {
      description = `Inserting products for ${statement.match(/carrier_id.*?'([^']+)'/)?.[1] || 'carrier'}...`;
    } else if (statement.includes('DELETE FROM')) {
      description = 'Cleaning existing data...';
    }

    console.log(`[${i + 1}/${statements.length}] ${description}`);

    try {
      // Execute via RPC call or raw SQL
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: statement
      }).single();

      if (error && error.code === 'PGRST202') {
        // Try alternative approach - this error means the RPC doesn't exist
        // We'll need to manually insert the data
        console.log('  ⚠️  RPC not available, skipping complex SQL');
        continue;
      }

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
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

  // Verify what was loaded
  console.log('\n🔍 Verifying data...');

  const { count: carrierCount } = await supabase
    .from('carriers')
    .select('*', { count: 'exact', head: true });

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`  Carriers in database: ${carrierCount || 0}`);
  console.log(`  Products in database: ${productCount || 0}`);

  if (carrierCount === 0 || productCount === 0) {
    console.log('\n⚠️  Warning: Data may not have been imported correctly.');
    console.log('   You may need to run the SQL directly in Supabase dashboard.');
  }
}

// Alternative: Just insert the data directly
async function insertDataDirectly() {
  console.log('\n📦 Attempting direct data insertion...\n');

  // FFG Carriers
  const carriers = [
    { id: '00001000-0000-0000-0000-000000000000', name: 'United Home Life', code: 'UHL' },
    { id: '00001001-0000-0000-0000-000000000000', name: 'SBLI', code: 'SBLI' },
    { id: '00001002-0000-0000-0000-000000000000', name: 'American Home Life', code: 'AHL' },
    { id: '00001003-0000-0000-0000-000000000000', name: 'American-Amicable Group', code: 'AG' },
    { id: '00001004-0000-0000-0000-000000000000', name: 'Corebridge Financial', code: 'CF' },
    { id: '00001005-0000-0000-0000-000000000000', name: 'Transamerica', code: 'TRAN' },
    { id: '00001006-0000-0000-0000-000000000000', name: 'ELCO Mutual', code: 'EM' }
  ];

  console.log('Inserting carriers...');
  const { error: carrierError } = await supabase
    .from('carriers')
    .upsert(carriers, { onConflict: 'name' });

  if (carrierError) {
    console.error('❌ Error inserting carriers:', carrierError);
  } else {
    console.log('✅ Carriers inserted');
  }

  // Sample products for United Home Life
  const products = [
    {
      carrier_id: '00001000-0000-0000-0000-000000000000',
      name: 'Term',
      code: 'UHL-1',
      product_type: 'term_life',
      commission_percentage: 1.0250,
      is_active: true
    },
    {
      carrier_id: '00001000-0000-0000-0000-000000000000',
      name: 'Express Issue Premier WL',
      code: 'UHL-2',
      product_type: 'whole_life',
      commission_percentage: 1.0250,
      is_active: true
    },
    {
      carrier_id: '00001001-0000-0000-0000-000000000000',
      name: 'SBLI Term',
      code: 'SBLI-1',
      product_type: 'term_life',
      commission_percentage: 1.1750,
      is_active: true
    },
    {
      carrier_id: '00001002-0000-0000-0000-000000000000',
      name: 'FE',
      code: 'AHL-1',
      product_type: 'whole_life',
      commission_percentage: 1.0250,
      is_active: true
    }
  ];

  console.log('Inserting products...');
  const { error: productError } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'carrier_id,name' });

  if (productError) {
    console.error('❌ Error inserting products:', productError);
  } else {
    console.log('✅ Products inserted');
  }
}

// Run both approaches
async function main() {
  try {
    await runFFGImport();
  } catch (err) {
    console.error('❌ FFG import failed:', err);
    console.log('\nTrying direct insertion...');
    await insertDataDirectly();
  }

  // Final check
  console.log('\n📊 Final database state:');
  const { count: finalCarriers } = await supabase
    .from('carriers')
    .select('*', { count: 'exact', head: true });

  const { count: finalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`  Carriers: ${finalCarriers || 0}`);
  console.log(`  Products: ${finalProducts || 0}`);

  if (finalCarriers > 0 && finalProducts > 0) {
    console.log('\n✅ Success! Database populated.');
  } else {
    console.log('\n❌ Database population failed.');
    console.log('   Please run the FFG import SQL directly in Supabase dashboard.');
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});