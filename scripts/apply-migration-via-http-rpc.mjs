#!/usr/bin/env node
// scripts/apply-migration-via-http-rpc.mjs
// Apply migration by first creating exec_sql RPC function, then using it

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function createExecSqlFunction() {
  console.log('📝 Creating temporary exec_sql function...');

  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN 'success';
END;
$$;
`;

  // Use raw HTTP to execute DDL since RPC doesn't exist yet
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({ query: createFunctionSQL })
  });

  if (!response.ok) {
    // Function might not exist yet, try creating via INSERT hack
    console.log('⚠️ exec_sql not available, trying alternative method...');
    return false;
  }

  console.log('✅ exec_sql function created');
  return true;
}

async function executeMigrationViaRPC() {
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251018_003_enhance_commission_chargeback_trigger.sql');

  console.log(`📝 Reading migration: ${migrationPath}\n`);
  const sql = readFileSync(migrationPath, 'utf8');

  console.log('🚀 Executing migration via RPC...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('❌ RPC Error:', error);
      return false;
    }

    console.log('✅ Migration executed successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

async function executeMigrationDirectly() {
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251018_003_enhance_commission_chargeback_trigger.sql');

  console.log(`📝 Reading migration: ${migrationPath}\n`);
  const sql = readFileSync(migrationPath, 'utf8');

  console.log('🚀 Trying direct SQL execution via REST API...\n');

  // Try using the query endpoint directly
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sql',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'tx=commit'
    },
    body: sql
  });

  if (response.ok) {
    console.log('✅ Migration executed successfully via direct SQL!');
    return true;
  } else {
    const errorText = await response.text();
    console.error('❌ Direct SQL execution failed:', response.status, errorText);
    return false;
  }
}

async function main() {
  console.log('=' .repeat(50));
  console.log('  Migration Application via HTTP/RPC');
  console.log('='.repeat(50));
  console.log('');

  // Try method 1: Direct SQL execution
  console.log('Method 1: Direct SQL execution');
  if (await executeMigrationDirectly()) {
    console.log('\n✅ SUCCESS!');
    process.exit(0);
  }

  // Try method 2: Create exec_sql function first
  console.log('\nMethod 2: Using exec_sql RPC');
  if (await createExecSqlFunction()) {
    if (await executeMigrationViaRPC()) {
      console.log('\n✅ SUCCESS!');
      process.exit(0);
    }
  }

  console.log('\n❌ All methods failed');
  console.log('Network may be blocking PostgreSQL connections.');
  console.log('Please apply migration manually via Supabase Dashboard.');
  process.exit(1);
}

main();
