#!/usr/bin/env node
// Apply commission fix migration to remote Supabase database

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection details
const DB_CONFIG = {
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pcyaqwodnyrpkaiojnpz',
  password: 'N123j234n345!$!$',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

const MIGRATION_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '20251222_005_fix_commission_auto_paid_status.sql');

async function applyMigration() {
  const client = new Client(DB_CONFIG);

  try {
    console.log('🔄 Connecting to remote Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('📄 Reading migration file...');
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

    console.log('🚀 Applying commission fix migration...');
    await client.query(sql);

    console.log('\n✅ Migration applied successfully!');
    console.log('📋 Summary of changes:');
    console.log('  - auto_create_commission_record() now creates with status=pending');
    console.log('  - Removed automatic marking as paid when policy becomes active');
    console.log('  - Added mark_commission_paid() function for manual payment tracking');
    console.log('\n🎉 Commission workflow fixed!');
    console.log('  New policies → Commission created as pending → User marks as paid when received');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.error('\n⚠️  The password may be incorrect.');
      console.error('Please update the password in this script or use the Supabase dashboard.');
    } else if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some objects already exist, this might be a partial success.');
      console.log('The migration may have been partially applied before.');
    }

    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

// Run the migration
applyMigration();