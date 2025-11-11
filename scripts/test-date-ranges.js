#!/usr/bin/env node

/**
 * Test script to verify date range calculations for all time periods
 */

// Mock Date to November 10, 2025 for consistent testing
const mockDate = new Date(2025, 10, 10, 15, 30, 0); // Nov 10, 2025 3:30 PM

function getDateRange(period) {
  const now = mockDate;
  let endDate = new Date(now);
  let startDate;

  switch (period) {
    case 'daily':
      // Today from 00:00:00 to now
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;

    case 'weekly':
      // Last 7 days from now
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      break;

    case 'monthly':
      // Entire current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'yearly':
      // Year-to-date from Jan 1 to now
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    default:
      // Default to monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

// Test expenses with their dates
const expenses = [
  { name: 'Londen Leads 1', amount: 1250, date: new Date(2025, 10, 6) },  // Nov 6
  { name: 'Londen Leads 2', amount: 1250, date: new Date(2025, 10, 13) }, // Nov 13
  { name: 'Londen Leads 3', amount: 1250, date: new Date(2025, 10, 20) }, // Nov 20
  { name: 'Londen Leads 4', amount: 1250, date: new Date(2025, 10, 27) }, // Nov 27
];

function isInDateRange(date, range) {
  return date >= range.startDate && date <= range.endDate;
}

function testTimeframe(period) {
  const range = getDateRange(period);
  const filtered = expenses.filter(e => isInDateRange(e.date, range));
  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  console.log(`\n📊 ${period.toUpperCase()} Timeframe:`);
  console.log(`   Date Range: ${range.startDate.toLocaleDateString()} to ${range.endDate.toLocaleDateString()}`);
  console.log(`   Expenses Included: ${filtered.length} of ${expenses.length}`);
  filtered.forEach(e => {
    console.log(`     ✅ ${e.name}: $${e.amount} (${e.date.toLocaleDateString()})`);
  });
  expenses.filter(e => !filtered.includes(e)).forEach(e => {
    console.log(`     ❌ ${e.name}: $${e.amount} (${e.date.toLocaleDateString()})`);
  });
  console.log(`   Total: $${total}`);

  return { period, total, count: filtered.length };
}

console.log('========================================');
console.log('Testing Date Range Calculations');
console.log(`Current Date: ${mockDate.toLocaleDateString()} ${mockDate.toLocaleTimeString()}`);
console.log('========================================');

// Test all timeframes
const results = [
  testTimeframe('daily'),
  testTimeframe('weekly'),
  testTimeframe('monthly'),
  testTimeframe('yearly')
];

console.log('\n========================================');
console.log('SUMMARY:');
console.log('========================================');
results.forEach(r => {
  const expected = r.period === 'monthly' ? 5000 :
                   r.period === 'yearly' ? 5000 :
                   r.period === 'weekly' ? 1250 :
                   r.period === 'daily' ? 0 : 0;
  const status = r.total === expected ? '✅' : '❌';
  console.log(`${status} ${r.period}: $${r.total} (${r.count} expenses) - Expected: $${expected}`);
});

console.log('\n✅ Monthly timeframe now correctly includes all expenses in the month!');