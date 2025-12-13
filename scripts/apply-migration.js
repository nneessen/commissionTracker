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
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251213_001_add_getuser_commission_profile_function.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log('Applying migration: 20251213_001_add_getuser_commission_profile_function.sql');

    // Execute the SQL directly
    const { data, error } = await supabase.rpc('query', { query: sql });

    if (error) {
      // If the rpc function doesn't exist, we need to use a different approach
      console.error('Note: Direct SQL execution via RPC failed. The function has been created in the migration file.');
      console.log('Please apply the migration manually via Supabase Dashboard or CLI.');
      console.log('\nMigration file location:');
      console.log(migrationPath);
      return;
    }

    console.log('✅ Migration applied successfully');

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

applyMigration();