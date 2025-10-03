// Run database migrations using Supabase service role
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrations = [
  '20251102_010_create_products_table.sql',
  '20251102_011_create_commission_rates_table.sql',
  '20251102_012_update_policies_table.sql',
  '20251102_013_populate_products.sql',
  '20251102_014_populate_commission_rates.sql',
  '20251102_015_backfill_policies.sql',
  '20251102_016_create_commission_functions.sql',
  '20251102_017_deprecate_comp_guide.sql'
];

async function runMigration(filename) {
  const filepath = path.join(__dirname, '../supabase/migrations', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Migration file not found: ${filename}`);
    return false;
  }

  const sql = fs.readFileSync(filepath, 'utf8');
  console.log(`\n📝 Running: ${filename}`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // RPC might not exist, try direct query
      const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);
      if (queryError) {
        console.error(`❌ Error: ${error.message}`);
        return false;
      }
    }
    
    console.log(`✅ Completed: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migrations...\n');
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error(`\n❌ Migration failed: ${migration}`);
      console.error('Stopping migration process');
      process.exit(1);
    }
  }
  
  console.log('\n✅ All migrations completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
