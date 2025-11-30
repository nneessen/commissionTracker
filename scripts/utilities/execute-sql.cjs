#!/usr/bin/env node
// Execute SQL file using Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function executeSQLFile(filepath) {
  console.log(`📝 Reading SQL file: ${filepath}\n`);

  const sql = fs.readFileSync(filepath, 'utf8');

  // Split into individual statements (basic approach)
  // This won't work for complex SQL with nested statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';

    // Skip comments and empty lines
    if (stmt.startsWith('--') || stmt.trim() === ';') continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      // Use raw SQL execution via Supabase
      const { data, error } = await supabase.rpc('exec_sql', { query: stmt });

      if (error) throw error;

      console.log(`✅ Success\n`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      console.error(`Statement: ${stmt.substring(0, 100)}...\n`);

      // Continue on error for some statements (like DROP IF EXISTS)
      if (err.message.includes('does not exist') || err.message.includes('already exists')) {
        console.log('⚠️  Continuing despite error...\n');
        continue;
      }

      process.exit(1);
    }
  }

  console.log('✅ All statements executed successfully!');
}

const sqlFile = process.argv[2] || path.join(__dirname, '../supabase/COMBINED_MIGRATIONS_20251102.sql');
executeSQLFile(sqlFile).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
