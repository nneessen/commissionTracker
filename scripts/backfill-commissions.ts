// scripts/backfill-commissions.ts
// Backfills commission records for existing policies that don't have them

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillCommissions() {
  try {
    console.log('🔍 Checking Supabase connection...');

    // Check if we can query the policies table at all
    const { count, error: countError } = await supabase
      .from('policies')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total policies in database: ${count ?? 'unknown'}`);
    if (countError) {
      console.error('❌ Error counting policies:', countError);
    }

    console.log('🔍 Fetching all policies...');

    // Get all policies - need to use service role or disable RLS for this script
    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('id, policy_number, annual_premium, commission_percentage, user_id, effective_date');

    if (policiesError) {
      console.error('❌ Policies error details:', policiesError);
      throw new Error(`Failed to fetch policies: ${policiesError.message}`);
    }

    console.log('📋 Raw policies data:', policies);

    if (!policies || policies.length === 0) {
      console.log('❌ No policies found in database');
      return;
    }

    console.log(`✅ Found ${policies.length} policies`);

    // Get existing commissions to avoid duplicates
    const { data: existingCommissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('policy_id');

    if (commissionsError) {
      throw new Error(`Failed to fetch existing commissions: ${commissionsError.message}`);
    }

    const existingPolicyIds = new Set(existingCommissions?.map(c => c.policy_id) || []);
    console.log(`📋 Found ${existingPolicyIds.size} existing commission records`);

    // Filter policies that need commission records
    const policiesNeedingCommissions = policies.filter(p => !existingPolicyIds.has(p.id));

    if (policiesNeedingCommissions.length === 0) {
      console.log('✅ All policies already have commission records!');
      return;
    }

    console.log(`🔧 Creating commission records for ${policiesNeedingCommissions.length} policies...`);

    // Create commission records
    const commissionsToInsert = policiesNeedingCommissions.map(policy => {
      const commissionAmount = policy.annual_premium * policy.commission_percentage;

      return {
        policy_id: policy.id,
        user_id: policy.user_id,
        amount: commissionAmount,
        commission_date: policy.effective_date,
        status: 'pending' as const,
        notes: 'Backfilled from existing policy',
      };
    });

    const { data: insertedCommissions, error: insertError } = await supabase
      .from('commissions')
      .insert(commissionsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert commissions: ${insertError.message}`);
    }

    console.log(`✅ Successfully created ${insertedCommissions?.length || 0} commission records!`);
    console.log('\n📊 Summary:');
    commissionsToInsert.forEach((comm, idx) => {
      const policy = policiesNeedingCommissions[idx];
      console.log(`  - Policy ${policy.policy_number}: $${comm.amount.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Error backfilling commissions:', error);
    process.exit(1);
  }
}

backfillCommissions()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
