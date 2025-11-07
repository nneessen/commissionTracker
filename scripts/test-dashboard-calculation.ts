// /home/nneessen/projects/commissionTracker/scripts/test-dashboard-calculation.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the date range logic from useMetricsWithDateRange
function getMonthlyDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

function isInDateRange(dateStr: string | null, dateRange: { start: string | null; end: string | null }): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const startDate = dateRange.start ? new Date(dateRange.start) : null;
  const endDate = dateRange.end ? new Date(dateRange.end) : null;

  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;

  return true;
}

async function testDashboardCalculation() {
  console.log('=== Testing Dashboard Calculation Logic ===\n');

  const dateRange = getMonthlyDateRange();
  console.log(`Date range for monthly period: ${dateRange.start} to ${dateRange.end}\n`);

  // Fetch ALL expenses (simulating useExpenses hook)
  const { data: allExpenses, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return;
  }

  console.log(`Total expenses in database: ${allExpenses?.length || 0}`);

  if (allExpenses) {
    // Filter expenses the same way useMetricsWithDateRange does
    console.log('\n--- Applying Date Filter (simulating useMetricsWithDateRange) ---');

    const filteredExpenses = allExpenses.filter((expense) => {
      const expenseDate = expense.date || expense.created_at;
      return isInDateRange(expenseDate, dateRange);
    });

    console.log(`Filtered expenses for current month: ${filteredExpenses.length}`);

    // Calculate total the same way
    const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    console.log('\n--- Filtered Expense Details ---');
    filteredExpenses.forEach((exp, idx) => {
      console.log(`  ${idx + 1}. Date: ${exp.date}, Amount: $${exp.amount}, Name: ${exp.name}`);
    });

    console.log(`\n=== Calculated Total (Dashboard Logic): $${total.toFixed(2)} ===`);

    // Check if there's a discrepancy
    if (total !== 5000 && filteredExpenses.length === 4) {
      console.log('\n⚠️ BUG DETECTED: Total should be $5000 but calculated as $' + total.toFixed(2));
    }

    // Check for any edge cases
    console.log('\n--- Debugging Edge Cases ---');
    console.log('Checking for null/undefined amounts:');
    const hasNullAmounts = filteredExpenses.some(e => e.amount == null);
    console.log(`  Has null amounts: ${hasNullAmounts}`);

    console.log('\nChecking individual amounts:');
    filteredExpenses.forEach((exp, idx) => {
      console.log(`  ${idx + 1}. Amount value: ${exp.amount}, Type: ${typeof exp.amount}`);
    });

    // Check if recurring_group_id might be causing issues
    const groupedByRecurring = new Map<string, any[]>();
    filteredExpenses.forEach(exp => {
      const key = exp.recurring_group_id || 'non-recurring';
      if (!groupedByRecurring.has(key)) {
        groupedByRecurring.set(key, []);
      }
      groupedByRecurring.get(key)!.push(exp);
    });

    console.log('\nGrouping by recurring_group_id:');
    groupedByRecurring.forEach((expenses, groupId) => {
      const groupTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      console.log(`  Group: ${groupId}, Count: ${expenses.length}, Total: $${groupTotal.toFixed(2)}`);
    });
  }
}

// Run the test
testDashboardCalculation().catch(console.error);