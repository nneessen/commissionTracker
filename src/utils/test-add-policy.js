// /home/nneessen/projects/commissionTracker/src/utils/test-add-policy.js

// Test script to manually add a policy to localStorage
const testPolicy = {
  id: 'test-' + Date.now(),
  policyNumber: 'TEST-001',
  status: 'active',
  client: {
    name: 'John Doe',
    state: 'CA',
    age: 35,
    email: 'john@example.com',
    phone: '555-0100'
  },
  carrierId: 'carrier-1',
  product: 'term_life',
  effectiveDate: new Date('2024-01-01').toISOString(),
  annualPremium: 1200,
  paymentFrequency: 'monthly',
  commissionPercentage: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: 'Test policy added manually'
};

// Get existing policies
const storageKey = 'commission_tracker_policies';
const existing = localStorage.getItem(storageKey);
const policies = existing ? JSON.parse(existing) : [];

// Add the test policy
policies.push(testPolicy);

// Save back to localStorage
localStorage.setItem(storageKey, JSON.stringify(policies));

console.log('Test policy added successfully');
console.log('Total policies:', policies.length);
console.log('Refresh the page to see the new policy');