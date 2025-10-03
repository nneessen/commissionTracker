// Run migrations using direct PostgreSQL connection
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse Supabase URL to get connection details
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];

if (!projectRef) {
  console.error('Could not parse project ref from SUPABASE_URL');
  process.exit(1);
}

// Construct connection string (user will need to provide password)
const dbPassword = process.env.DB_PASSWORD || process.argv[2];

if (!dbPassword) {
  console.error('Usage: node run-migrations-direct.js <db-password>');
  console.error('Or set DB_PASSWORD environment variable');
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-1-us-east-2.pooler.supabase.com:6543/postgres`;

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

async function runMigrations() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    for (const migration of migrations) {
      const filepath = path.join(__dirname, '../supabase/migrations', migration);
      
      if (!fs.existsSync(filepath)) {
        console.error(`❌ File not found: ${migration}`);
        process.exit(1);
      }
      
      const sql = fs.readFileSync(filepath, 'utf8');
      console.log(`📝 Running: ${migration}`);
      
      try {
        await client.query(sql);
        console.log(`✅ Success: ${migration}\n`);
      } catch (err) {
        console.error(`❌ Error in ${migration}:`);
        console.error(err.message);
        process.exit(1);
      }
    }
    
    console.log('✅ All migrations completed successfully!');
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
