// /home/nneessen/projects/commissionTracker/scripts/test-fixed-calculation.ts

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

// Import the fixed functions
function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const now = new Date();
  let endDate: Date;
  let startDate: Date;

  switch (period) {
    case 'monthly':
      // ENTIRE current month from 1st to last day (includes future dates within the month)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      // Last day of current month at 23:59:59
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    default:
      // Default to monthly (entire month)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

function isInDateRange(date: string | null, range: { start: string | null; end: string | null }): boolean {
  if (!date) return false;

  const checkDate = parseLocalDate(date);
  const startDate = range.start ? parseLocalDate(range.start) : null;
  const endDate = range.end ? parseLocalDate(range.end) : null;

  if (startDate && checkDate < startDate) return false;
  if (endDate && checkDate > endDate) return false;

  return true;
}

async function testFixedCalculation() {
  console.log('=== Testing FIXED Dashboard Calculation Logic ===\n');

  // Get date range using the FIXED logic
  const rawDateRange = getDateRange('monthly');
  const dateRange = {
    start: rawDateRange.startDate.toISOString().split('T')[0],
    end: rawDateRange.endDate.toISOString().split('T')[0]
  };

  console.log(`Fixed date range for monthly period: ${dateRange.start} to ${dateRange.end}\n`);

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
    // Filter expenses using the FIXED logic
    console.log('\n--- Applying FIXED Date Filter ---');

    const filteredExpenses = allExpenses.filter((expense) => {
      const expenseDate = expense.date || expense.created_at;
      return isInDateRange(expenseDate, dateRange);
    });

    console.log(`Filtered expenses for current month: ${filteredExpenses.length}`);

    // Calculate total
    const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    console.log('\n--- Filtered Expense Details ---');
    filteredExpenses.forEach((exp, idx) => {
      console.log(`  ${idx + 1}. Date: ${exp.date}, Amount: $${exp.amount}, Name: ${exp.name}`);
    });

    console.log(`\n=== FIXED Calculated Total: $${total.toFixed(2)} ===`);

    // Check if the fix worked
    if (total === 5000 && filteredExpenses.length === 4) {
      console.log('\n✅ SUCCESS: The fix is working! Dashboard should now show $5000.');
    } else if (total !== 5000) {
      console.log(`\n⚠️ ISSUE: Expected $5000 but got $${total.toFixed(2)}`);
    }
  }
}

// Run the test
testFixedCalculation().catch(console.error);