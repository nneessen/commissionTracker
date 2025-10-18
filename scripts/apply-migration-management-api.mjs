#!/usr/bin/env node
// scripts/apply-migration-management-api.mjs
// Use Supabase Management API to execute SQL

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'pcyaqwodnyrpkaiojnpz';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

async function executeViaManagementAPI() {
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251018_003_enhance_commission_chargeback_trigger.sql');

  console.log('=' .repeat(60));
  console.log('  Supabase Management API Migration Tool');
  console.log('='.repeat(60));
  console.log('');
  console.log(`📝 Reading migration: ${migrationPath}\n`);

  const sql = readFileSync(migrationPath, 'utf8');

  console.log('🚀 Executing via Management API...\n');

  // Try Management API v1 SQL endpoint
  const apiUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ Migration executed successfully!');
      console.log('Response:', responseText);
      console.log('\n✅ COMPLETE!');
      process.exit(0);
    } else {
      console.error('❌ Management API Error:', response.status, response.statusText);
      console.error('Response:', responseText);
    }
  } catch (err) {
    console.error('❌ Request Error:', err.message);
  }

  // Try alternative endpoint format
  console.log('\n🔄 Trying alternative endpoint...\n');

  const altUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`;

  try {
    const response = await fetch(altUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ Migration executed successfully!');
      console.log('Response:', responseText);
      console.log('\n✅ COMPLETE!');
      process.exit(0);
    } else {
      console.error('❌ Alternative Endpoint Error:', response.status, response.statusText);
      console.error('Response:', responseText);
    }
  } catch (err) {
    console.error('❌ Request Error:', err.message);
  }

  console.log('\n❌ Both Management API endpoints failed');
  console.log('This likely requires a Management API access token, not the service role key.');
  process.exit(1);
}

executeViaManagementAPI();
