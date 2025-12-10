#!/usr/bin/env node
// File: /home/nneessen/projects/commissionTracker/scripts/apply-workflow-migration.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251209_002_automation_workflows.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    // This is a simplified approach - may need adjustment for complex migrations
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('workflows')
      .select('id')
      .limit(1);

    if (!checkError || checkError.code !== '42P01') {
      console.log('Workflow tables may already exist. Checking...');
      if (existingTables) {
        console.log('Workflow tables already exist! Migration may have been applied.');
        return;
      }
    }

    console.log('Tables do not exist, proceeding with migration...');

    // Since we can't execute raw SQL directly through the client,
    // we'll need to use a different approach
    console.log('\nMigration SQL has been prepared but cannot be applied directly through the JS client.');
    console.log('The migration needs to be applied through one of these methods:');
    console.log('1. Supabase Dashboard SQL Editor');
    console.log('2. psql command line tool');
    console.log('3. Supabase CLI with proper authentication');

    console.log('\nTo apply through Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new');
    console.log('2. Copy the migration file content from: supabase/migrations/20251209_002_automation_workflows.sql');
    console.log('3. Paste and run in the SQL editor');

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();