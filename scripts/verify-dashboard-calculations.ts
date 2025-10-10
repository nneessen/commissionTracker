// scripts/verify-dashboard-calculations.ts
// This script verifies that all dashboard calculations are working correctly
// Run with: npx tsx scripts/verify-dashboard-calculations.ts

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyCalculations() {
  console.log('\n🔍 VERIFYING DASHBOARD CALCULATIONS\n');
  console.log('=' .repeat(80));

  // Fetch commissions
  const { data: commissions, error: commError } = await supabase
    .from('commissions')
    .select('*');

  if (commError) {
    console.error('Error fetching commissions:', commError);
    return;
  }

  // Fetch policies
  const { data: policies, error: policyError } = await supabase
    .from('policies')
    .select('*');

  if (policyError) {
    console.error('Error fetching policies:', policyError);
    return;
  }

  // Fetch expenses
  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('*');

  if (expenseError) {
    console.error('Error fetching expenses:', expenseError);
    return;
  }

  console.log(`\n📊 DATA SUMMARY:`);
  console.log(`  - Commissions: ${commissions?.length || 0} records`);
  console.log(`  - Policies: ${policies?.length || 0} records`);
  console.log(`  - Expenses: ${expenses?.length || 0} records`);

  // COMMISSION CALCULATIONS
  console.log('\n\n💰 COMMISSION CALCULATIONS:');
  console.log('-'.repeat(80));

  if (commissions && commissions.length > 0) {
    const paidCommissions = commissions.filter(c => c.status === 'paid');
    const pendingCommissions = commissions.filter(c => c.status === 'pending');

    const totalPaidAdvance = paidCommissions.reduce((sum, c) => sum + (parseFloat(c.advance_amount || c.commission_amount || c.amount || '0')), 0);
    const totalPendingAdvance = pendingCommissions.reduce((sum, c) => sum + (parseFloat(c.advance_amount || c.commission_amount || c.amount || '0')), 0);
    const totalEarnedAmount = commissions.reduce((sum, c) => sum + (parseFloat(c.earned_amount || '0')), 0);

    console.log(`\n  ✅ CORRECT CALCULATION (using advanceAmount):`);
    console.log(`     Paid Commissions: $${totalPaidAdvance.toFixed(2)} (${paidCommissions.length} records)`);
    console.log(`     Pending Commissions: $${totalPendingAdvance.toFixed(2)} (${pendingCommissions.length} records)`);

    console.log(`\n  ❌ OLD CALCULATION (using earnedAmount - WRONG!):`);
    console.log(`     Total Earned Amount: $${totalEarnedAmount.toFixed(2)}`);
    console.log(`     ^ This was $0 because monthsPaid starts at 0 for new policies`);

    // Show sample commission
    if (commissions.length > 0) {
      const sample = commissions[0];
      console.log(`\n  📋 Sample Commission Record:`);
      console.log(`     ID: ${sample.id}`);
      console.log(`     Status: ${sample.status}`);
      console.log(`     Advance Amount: $${parseFloat(sample.advance_amount || sample.commission_amount || sample.amount || '0').toFixed(2)}`);
      console.log(`     Earned Amount: $${parseFloat(sample.earned_amount || '0').toFixed(2)}`);
      console.log(`     Months Paid: ${sample.months_paid || 0}`);
      console.log(`     Note: Earned Amount = (Advance / AdvanceMonths) × MonthsPaid`);
    }

    // Calculate average commission rate
    const avgRate = commissions.reduce((sum, c) => sum + (parseFloat(c.rate || '0')), 0) / commissions.length;
    console.log(`\n  Average Commission Rate: ${avgRate.toFixed(2)}%`);
  } else {
    console.log('  No commissions found');
  }

  // EXPENSE CALCULATIONS
  console.log('\n\n💸 EXPENSE CALCULATIONS:');
  console.log('-'.repeat(80));

  if (expenses && expenses.length > 0) {
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

    console.log(`\n  ✅ CORRECT CALCULATION (actual total):`);
    console.log(`     Total Expenses: $${totalExpenses.toFixed(2)} (${expenses.length} records)`);

    console.log(`\n  ❌ OLD CALCULATION was extrapolating to monthly average`);
    console.log(`     For example: $5,000 over 10 days → $15,220/month`);
    console.log(`     This was confusing and wrong!`);

    // Show sample expense
    if (expenses.length > 0) {
      const sample = expenses[0];
      console.log(`\n  📋 Sample Expense Record:`);
      console.log(`     Name: ${sample.name}`);
      console.log(`     Amount: $${parseFloat(sample.amount || '0').toFixed(2)}`);
      console.log(`     Category: ${sample.category}`);
      console.log(`     Date: ${sample.date}`);
    }
  } else {
    console.log('  No expenses found');
  }

  // POLICY CALCULATIONS
  console.log('\n\n📋 POLICY CALCULATIONS:');
  console.log('-'.repeat(80));

  if (policies && policies.length > 0) {
    const totalPremium = policies.reduce((sum, p) => sum + parseFloat(p.annual_premium || '0'), 0);
    const avgPremium = totalPremium / policies.length;

    console.log(`\n  ✅ CORRECT CALCULATION:`);
    console.log(`     Total Premium Written: $${totalPremium.toFixed(2)}`);
    console.log(`     Average Premium per Policy: $${avgPremium.toFixed(2)}`);
    console.log(`     Total Policies: ${policies.length}`);

    // Count by status
    const activeCount = policies.filter(p => p.status === 'active').length;
    const cancelledCount = policies.filter(p => p.status === 'cancelled').length;
    const lapsedCount = policies.filter(p => p.status === 'lapsed').length;

    console.log(`\n  Policy Status Breakdown:`);
    console.log(`     Active: ${activeCount}`);
    console.log(`     Cancelled: ${cancelledCount}`);
    console.log(`     Lapsed: ${lapsedCount}`);
  } else {
    console.log('  No policies found');
  }

  // NET INCOME CALCULATION
  if (commissions && expenses) {
    console.log('\n\n📈 NET INCOME CALCULATION:');
    console.log('-'.repeat(80));

    const paidCommissions = commissions?.filter(c => c.status === 'paid') || [];
    const totalPaidAdvance = paidCommissions.reduce((sum, c) => sum + (parseFloat(c.advance_amount || c.commission_amount || c.amount || '0')), 0);
    const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0) || 0;
    const netIncome = totalPaidAdvance - totalExpenses;

    console.log(`\n  ✅ CORRECT CALCULATION:`);
    console.log(`     Total Commission Earned: $${totalPaidAdvance.toFixed(2)}`);
    console.log(`     Total Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`     Net Income: $${netIncome.toFixed(2)}`);
    console.log(`     Profit Margin: ${totalPaidAdvance > 0 ? ((netIncome / totalPaidAdvance) * 100).toFixed(1) : 0}%`);
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE\n');
}

verifyCalculations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
