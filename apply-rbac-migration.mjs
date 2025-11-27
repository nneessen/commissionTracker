#!/usr/bin/env node
import { readFileSync } from 'fs';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const migrationPath = 'supabase/migrations/20251127181301_add_rbac_table_security.sql';

console.log('📝 Reading migration:', migrationPath);
const sql = readFileSync(migrationPath, 'utf8');

console.log('🚀 Executing migration via Supabase REST API...\n');

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
  console.log('✅ Migration executed successfully!');
  process.exit(0);
} else {
  const errorText = await response.text();
  console.error('❌ Failed:', response.status, errorText);
  process.exit(1);
}
