#!/usr/bin/env node
import { readFileSync } from 'fs';

const PROJECT_REF = 'pcyaqwodnyrpkaiojnpz';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const migrationPath = 'supabase/migrations/20251127181301_add_rbac_table_security.sql';

console.log('📝 Reading migration:', migrationPath);
const sql = readFileSync(migrationPath, 'utf8');

console.log('🚀 Executing via Management API /database/query...\n');

const apiUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

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
  process.exit(0);
} else {
  console.log('❌ Failed:', response.status, response.statusText);
  console.log('Response:', responseText);
  process.exit(1);
}
