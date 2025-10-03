#!/usr/bin/env node
// Run migrations using Supabase REST API
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceKey);
  process.exit(1);
}

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

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/rest/v1/rpc/exec_sql`);
    
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runMigrations() {
  console.log('🚀 Starting migrations via Supabase API...\n');
  
  for (const migration of migrations) {
    const filepath = path.join(__dirname, '../supabase/migrations', migration);
    
    if (!fs.existsSync(filepath)) {
      console.error(`❌ File not found: ${migration}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(filepath, 'utf8');
    console.log(`📝 Running: ${migration}`);
    
    try {
      await executeSQL(sql);
      console.log(`✅ Success: ${migration}\n`);
    } catch (err) {
      console.error(`❌ Error in ${migration}:`);
      console.error(err.message);
      
      // If exec_sql doesn't exist, provide alternative instructions
      if (err.message.includes('404') || err.message.includes('not found')) {
        console.error('\n⚠️  exec_sql RPC function not available.');
        console.error('Please run migrations manually using one of these methods:');
        console.error('1. Supabase Dashboard SQL Editor');
        console.error('2. psql with database password');
        console.error('3. node scripts/run-migrations-direct.js <password>');
      }
      process.exit(1);
    }
  }
  
  console.log('✅ All migrations completed successfully!');
}

runMigrations();
