// /home/nneessen/projects/commissionTracker/scripts/verify-expense-data.ts

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

async function verifyExpenseData() {
  console.log('=== Verifying Expense Data ===\n');

  // Get current month date range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get the last day of the current month
  const lastDay = new Date(year, month, 0).getDate();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  console.log(`Checking expenses for period: ${startDate} to ${endDate}\n`);

  // Fetch all expenses for current month
  const { data: allExpenses, error: allError } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (allError) {
    console.error('Error fetching expenses:', allError);
    return;
  }

  console.log(`Total expenses found for current month: ${allExpenses?.length || 0}`);

  if (allExpenses && allExpenses.length > 0) {
    console.log('\n--- Expense Details ---');

    // Group by recurring_group_id to identify duplicates
    const recurringGroups = new Map<string, any[]>();
    const nonRecurring: any[] = [];

    allExpenses.forEach(expense => {
      if (expense.recurring_group_id) {
        if (!recurringGroups.has(expense.recurring_group_id)) {
          recurringGroups.set(expense.recurring_group_id, []);
        }
        recurringGroups.get(expense.recurring_group_id)!.push(expense);
      } else {
        nonRecurring.push(expense);
      }
    });

    // Display non-recurring expenses
    if (nonRecurring.length > 0) {
      console.log('\nNon-recurring expenses:');
      nonRecurring.forEach((exp, idx) => {
        console.log(`  ${idx + 1}. Date: ${exp.date}, Amount: $${exp.amount}, Name: ${exp.name}`);
      });
    }

    // Display recurring expense groups
    if (recurringGroups.size > 0) {
      console.log('\nRecurring expense groups:');
      recurringGroups.forEach((expenses, groupId) => {
        console.log(`\n  Group ID: ${groupId}`);
        console.log(`  Number of expenses in this month: ${expenses.length}`);
        expenses.forEach((exp, idx) => {
          console.log(`    ${idx + 1}. Date: ${exp.date}, Amount: $${exp.amount}, Name: ${exp.name}, Frequency: ${exp.recurring_frequency}`);
        });
      });
    }

    // Calculate total for the month
    const totalAmount = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    console.log(`\n=== Total Amount for Current Month: $${totalAmount.toFixed(2)} ===`);

    // Check for potential duplicates (same amount on same date)
    const duplicates = new Map<string, any[]>();
    allExpenses.forEach(exp => {
      const key = `${exp.date}-${exp.amount}`;
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key)!.push(exp);
    });

    const hasDuplicates = Array.from(duplicates.values()).some(group => group.length > 1);
    if (hasDuplicates) {
      console.log('\n⚠️ WARNING: Potential duplicate expenses found:');
      duplicates.forEach((expenses, key) => {
        if (expenses.length > 1) {
          console.log(`\n  Date-Amount: ${key}`);
          expenses.forEach((exp, idx) => {
            console.log(`    ${idx + 1}. ID: ${exp.id}, Name: ${exp.name}, Group: ${exp.recurring_group_id || 'none'}`);
          });
        }
      });
    }
  }
}

// Run the verification
verifyExpenseData().catch(console.error);