#!/usr/bin/env tsx
// scripts/check-db-health.ts
// Purpose: Verify all required database functions exist before deployment

import { createClient } from '@supabase/supabase-js';
import * as process from 'process';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// List of required database functions that the application depends on
const REQUIRED_FUNCTIONS = [
  {
    name: 'get_user_commission_profile',
    migration: '20251031_003_user_commission_rates_system.sql',
    description: 'Calculates user commission rate profile based on historical sales',
  },
  {
    name: 'calculate_earned_amount',
    migration: 'Various commission migrations',
    description: 'Calculates earned commission amounts',
  },
  {
    name: 'update_commission_earned_amounts',
    migration: 'Various commission migrations',
    description: 'Updates commission earned amounts in batch',
  },
];

interface FunctionCheckResult {
  name: string;
  exists: boolean;
  migration: string;
  description: string;
}

async function checkDatabaseFunctions(): Promise<FunctionCheckResult[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase configuration');
    console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const results: FunctionCheckResult[] = [];

  console.log('🔍 Checking database health...\n');

  for (const func of REQUIRED_FUNCTIONS) {
    try {
      // Query pg_proc to check if function exists
      const { data, error } = await supabase.rpc('sql', {
        query: `
          SELECT EXISTS (
            SELECT 1
            FROM pg_proc
            WHERE proname = '${func.name}'
          ) as exists;
        `,
      }).single();

      if (error) {
        // Fallback: Try to call the function to see if it exists
        const { error: rpcError } = await supabase.rpc(func.name as any, {});

        // If error is "missing required parameter", function exists
        const exists = rpcError?.message?.includes('missing') || false;

        results.push({
          name: func.name,
          exists,
          migration: func.migration,
          description: func.description,
        });
      } else {
        results.push({
          name: func.name,
          exists: data?.exists || false,
          migration: func.migration,
          description: func.description,
        });
      }
    } catch (err) {
      results.push({
        name: func.name,
        exists: false,
        migration: func.migration,
        description: func.description,
      });
    }
  }

  return results;
}

async function main() {
  const results = await checkDatabaseFunctions();

  let hasErrors = false;

  // Print results
  console.log('Database Function Health Check Results:');
  console.log('═'.repeat(80));
  console.log('');

  for (const result of results) {
    const status = result.exists ? '✅ EXISTS' : '❌ MISSING';
    console.log(`${status}  ${result.name}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   Migration: ${result.migration}`);
    console.log('');

    if (!result.exists) {
      hasErrors = true;
    }
  }

  console.log('═'.repeat(80));
  console.log('');

  if (hasErrors) {
    console.error('❌ Database health check FAILED');
    console.error('');
    console.error('Missing functions detected. Please apply the required migrations:');
    console.error('');

    const missingFunctions = results.filter((r) => !r.exists);
    for (const func of missingFunctions) {
      console.error(`  - ${func.name}`);
      console.error(`    Migration: supabase/migrations/${func.migration}`);
    }

    console.error('');
    console.error('To apply migrations:');
    console.error('  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new');
    console.error('  2. Copy the migration file contents');
    console.error('  3. Execute in the SQL editor');
    console.error('');
    process.exit(1);
  } else {
    console.log('✅ All required database functions are present');
    console.log('');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error during health check:');
  console.error(error);
  process.exit(1);
});
