// scripts/fix-commissions-simple.ts
// Simple script to check and fix commission records

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking database for policies and commissions...\n');

  // Call the stored procedure that backfills commissions
  const { data, error } = await supabase.rpc('backfill_commissions_for_existing_policies');

  if (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 The trigger might not be deployed yet.');
    console.log('📋 Please run the migration manually:');
    console.log('   ./scripts/run-migration.sh supabase/migrations/003_auto_commission_and_user_settings.sql');
    process.exit(1);
  }

  console.log('✅ Success!', data);
}

main();
