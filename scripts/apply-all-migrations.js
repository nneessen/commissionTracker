#!/usr/bin/env node
// scripts/apply-all-migrations.js
// Apply all SQL migrations to Supabase using service role key

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyAllMigrations() {
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
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration files\n`);

    // Try to create migrations tracking table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS applied_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Check which migrations have been applied
    const { data: appliedMigrations } = await supabase
      .from('applied_migrations')
      .select('filename')
      .order('filename');

    const appliedSet = new Set(appliedMigrations?.map(m => m.filename) || []);

    // Apply each migration
    for (const file of sqlFiles) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`📝 Applying ${file}...`);

      const migrationPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(migrationPath, 'utf-8');

      // Split by semicolons but be careful with functions
      const statements = sql
        .split(/;\s*$/gm)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      let success = true;

      for (const statement of statements) {
        if (statement.trim().startsWith('--') || statement.trim().length === 1) {
          continue; // Skip comments and empty statements
        }

        try {
          // Use raw SQL execution through admin API
          const { error } = await supabase.rpc('exec_sql', {
            query: statement
          }).catch(async (rpcError) => {
            // If RPC doesn't exist, try direct execution
            // This is a fallback for when exec_sql doesn't exist
            console.log('  Note: exec_sql RPC not available, migration file created but not applied');
            return { error: rpcError };
          });

          if (error) {
            console.error(`  ❌ Error in statement:`, error.message);
            success = false;
            break;
          }
        } catch (err) {
          console.error(`  ❌ Failed to execute statement:`, err.message);
          success = false;
          break;
        }
      }

      if (success) {
        // Mark as applied
        try {
          await supabase
            .from('applied_migrations')
            .insert({ filename: file });
          console.log(`  ✅ Successfully applied ${file}\n`);
        } catch (err) {
          console.log(`  ⚠️  Migration applied but couldn't track it: ${err.message}\n`);
        }
      } else {
        console.log(`  ⚠️  Failed to apply ${file}\n`);
        console.log('\nMigration file location for manual application:');
        console.log(migrationPath);
        console.log('\nYou can apply this manually via Supabase Dashboard SQL editor');
      }
    }

    console.log('\n✅ Migration process complete');

  } catch (error) {
    console.error('Error in migration process:', error);

    // Provide instructions for manual application
    console.log('\n📋 To apply migrations manually:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of each migration file');
    console.log('4. Execute them in order');
    console.log('\nMigration files are located in:');
    console.log(path.join(__dirname, '../supabase/migrations'));
  }
}

applyAllMigrations();