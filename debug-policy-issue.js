// /home/nneessen/projects/commissionTracker/debug-policy-issue.js

// Run this in the browser console at http://localhost:3000

console.log('========== DEBUGGING POLICY ISSUE ==========');

// 1. Check current localStorage
console.log('\n1. Current localStorage:');
const storageKey = 'commission_tracker_policies';
const currentData = localStorage.getItem(storageKey);
console.log('Raw data:', currentData);
if (currentData) {
  const parsed = JSON.parse(currentData);
  console.log('Parsed policies:', parsed);
  console.log('Count:', parsed.length);
}

// 2. Try to directly add a test policy
console.log('\n2. Adding test policy directly to localStorage...');
const testPolicy = {
  id: 'debug-' + Date.now(),
  policyNumber: 'DEBUG-' + Date.now(),
  status: 'active',
  client: {
    name: 'Debug Test',
    state: 'CA',
    age: 30,
    email: 'debug@test.com',
    phone: '555-0000'
  },
  carrierId: 'carrier-1',
  product: 'term_life',
  effectiveDate: new Date().toISOString(),
  annualPremium: 1200,
  paymentFrequency: 'monthly',
  commissionPercentage: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
existing.push(testPolicy);
localStorage.setItem(storageKey, JSON.stringify(existing));
console.log('Policy added to localStorage');

// 3. Verify it was saved
console.log('\n3. Verification:');
const afterAdd = localStorage.getItem(storageKey);
const afterParsed = JSON.parse(afterAdd);
console.log('New count:', afterParsed.length);
console.log('Last policy:', afterParsed[afterParsed.length - 1]);

// 4. Check if React sees it
console.log('\n4. React state check:');
console.log('Check if the UI updates automatically or if you need to refresh');
console.log('If you need to refresh, there\'s a React state issue');
console.log('If it shows up after refresh, localStorage is working but React state isn\'t updating');

console.log('\n========== END DEBUG ==========');
console.log('Now try adding a policy through the form and watch the console logs');