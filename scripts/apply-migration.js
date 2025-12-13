#!/usr/bin/env node
// scripts/apply-migration.js
// Apply SQL migration to Supabase using the service role key

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get migration file from command line argument or use default
    const migrationFile = process.argv[2] || '20241213_009_fix_admin_deleteuser_verified.sql';
    const migrationPath = path.join(__dirname, '../supabase/migrations', migrationFile);

    // Check if file exists
    try {
      await fs.access(migrationPath);
    } catch {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log(`📝 Applying migration: ${migrationFile}`);
    console.log('');

    // Use Supabase's query method to execute raw SQL
    // This requires proper auth and may need to be done via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Fallback: Try using postgres connection if available
      console.log('⚠️  Direct SQL execution not available via Supabase client.');
      console.log('');
      console.log('Please run the migration using one of these methods:');
      console.log('');
      console.log('1. Via psql (if you have database password):');
      console.log(`   PGPASSWORD='your-password' psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -f ${migrationPath}`);
      console.log('');
      console.log('2. Via Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new');
      console.log('   Copy and paste the contents of:');
      console.log(`   ${migrationPath}`);
      console.log('');
      process.exit(1);
    }

    console.log('');
    console.log('✅ Migration applied successfully!');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

applyMigration();