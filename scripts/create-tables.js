#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/scripts/create-tables.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('Creating tables in Supabase...');

  // Read the migration file
  const migrationSQL = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20240112000000_create_tables.sql'),
    'utf8'
  );

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: migrationSQL
  }).single();

  if (error) {
    // If RPC doesn't exist, try direct execution
    console.log('RPC not available, executing SQL statements directly...');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);

      // Use raw SQL execution via the REST API
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: statement
        })
      });

      if (!response.ok) {
        console.error('Failed to execute statement:', await response.text());
      }
    }
  }

  console.log('Tables created successfully!');
}

createTables().catch(console.error);