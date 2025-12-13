#!/usr/bin/env node
// scripts/generate-sql-for-dashboard.js
// Generate SQL for manual execution in Supabase Dashboard

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSQL() {
  const migrationFile = path.join(__dirname, '../supabase/migrations/20241213_005_admin_deleteuser_function.sql');

  try {
    const sql = await fs.readFile(migrationFile, 'utf-8');

    console.log('================================================================================');
    console.log('COPY THE SQL BELOW AND PASTE INTO SUPABASE DASHBOARD SQL EDITOR:');
    console.log('================================================================================\n');
    console.log(sql);
    console.log('\n================================================================================');
    console.log('INSTRUCTIONS:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor (left sidebar)');
    console.log('4. Click "New Query"');
    console.log('5. Paste the SQL above');
    console.log('6. Click "Run" button');
    console.log('================================================================================');

  } catch (error) {
    console.error('Error reading migration file:', error.message);
    process.exit(1);
  }
}

generateSQL();