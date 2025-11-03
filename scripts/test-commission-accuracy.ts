#!/usr/bin/env tsx
/**
 * Commission Accuracy Test Script
 *
 * Verifies that commission calculations are accurate and consistent across the application.
 * Tests both database-side calculations and ensures client-side displays match.
 *
 * Usage: npx tsx scripts/test-commission-accuracy.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Policy {
  id: string;
  policy_number: string;
  annual_premium: number;
  commission_percentage: number;
  status: string;
}

interface Commission {
  id: string;
  policy_id: string;
  amount: number;
  advance_months: number;
  status: string;
}

async function testCommissionAccuracy() {
  console.log('🧪 Commission Accuracy Test Suite\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Database Integrity - All active policies have commissions
  console.log('Test 1: Database Integrity Check');
  try {
    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('id, policy_number, status')
      .eq('status', 'active');

    if (policiesError) throw policiesError;

    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('policy_id');

    if (commissionsError) throw commissionsError;

    const commissionPolicyIds = new Set(commissions?.map(c => c.policy_id) || []);
    const missingCommissions = policies?.filter(p => !commissionPolicyIds.has(p.id)) || [];

    if (missingCommissions.length === 0) {
      console.log(`✅ PASS: All ${policies?.length || 0} active policies have commission records\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${missingCommissions.length} policies missing commissions`);
      console.log('Missing:', missingCommissions.map(p => p.policy_number).join(', '));
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 2: Manual Calculation Verification
  console.log('Test 2: Manual Calculation Verification');
  try {
    const { data: testPolicies, error } = await supabase
      .from('policies')
      .select(`
        id,
        policy_number,
        annual_premium,
        commission_percentage,
        status,
        commissions (
          amount,
          advance_months
        )
      `)
      .eq('status', 'active')
      .limit(5);

    if (error) throw error;

    // Get contract level from user metadata (hardcoded for now as 120)
    const contractLevel = 120 / 100; // 1.20

    let allMatch = true;
    for (const policy of testPolicies || []) {
      const commission = (policy as any).commissions?.[0];
      if (!commission) continue;

      const monthlyPremium = policy.annual_premium / 12;
      const expectedAmount = monthlyPremium * policy.commission_percentage * contractLevel * commission.advance_months;
      const dbAmount = commission.amount;
      const difference = Math.abs(expectedAmount - dbAmount);

      // Allow 1 cent tolerance for rounding
      if (difference > 0.01) {
        console.log(`❌ Policy ${policy.policy_number}: Expected $${expectedAmount.toFixed(2)}, Got $${dbAmount.toFixed(2)}`);
        allMatch = false;
      }
    }

    if (allMatch) {
      console.log(`✅ PASS: All commission amounts match expected calculations (contract level 120)\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Some commission amounts don't match\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 3: Contract Level Application
  console.log('Test 3: Contract Level Multiplier Applied');
  try {
    const { data: testPolicy, error } = await supabase
      .from('policies')
      .select(`
        id,
        policy_number,
        annual_premium,
        commission_percentage,
        commissions (amount, advance_months)
      `)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (error) throw error;

    const commission = (testPolicy as any).commissions?.[0];
    if (!commission) throw new Error('No commission found');

    const monthlyPremium = testPolicy.annual_premium / 12;
    const baseCommission = monthlyPremium * testPolicy.commission_percentage * commission.advance_months;
    const withContractLevel = commission.amount;

    // Contract level should make commission higher than base
    const multiplier = withContractLevel / baseCommission;

    if (multiplier >= 1.0 && multiplier <= 2.0) {
      console.log(`✅ PASS: Contract level multiplier detected (${multiplier.toFixed(2)}x)\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Unexpected multiplier ${multiplier.toFixed(2)}x\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 4: No Orphaned Commissions
  console.log('Test 4: No Orphaned Commission Records');
  try {
    const { data: orphanedCommissions, error } = await supabase
      .from('commissions')
      .select('id, policy_id')
      .is('policy_id', null);

    if (error) throw error;

    if (!orphanedCommissions || orphanedCommissions.length === 0) {
      console.log(`✅ PASS: No orphaned commission records\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Found ${orphanedCommissions.length} orphaned commissions\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error}\n`);
    failed++;
  }

  // Summary
  console.log('═'.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('✅ All tests passed! Commission data is accurate.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

testCommissionAccuracy().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
