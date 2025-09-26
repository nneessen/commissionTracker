// /home/nneessen/projects/commissionTracker/test-live-app.js

// This script tests the live application by simulating form submission
// Run this in the browser console while on http://localhost:3000

(function testPolicyAddition() {
  console.log('=== Testing Live Policy Addition ===');

  // Check current policies
  const currentPolicies = JSON.parse(localStorage.getItem('commission_tracker_policies') || '[]');
  console.log('Current policies count:', currentPolicies.length);

  // Generate a unique policy for testing
  const testPolicy = {
    id: 'live-test-' + Date.now(),
    policyNumber: 'LIVE-' + Date.now(),
    status: 'active',
    client: {
      name: 'Live Test Client',
      state: 'CA',
      age: 40,
      email: 'livetest@example.com',
      phone: '555-9999'
    },
    carrierId: 'carrier-1',
    product: 'term_life',
    effectiveDate: new Date('2024-01-15').toISOString(),
    annualPremium: 2400,
    paymentFrequency: 'monthly',
    commissionPercentage: 55,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Added via live test script'
  };

  // Add the test policy
  const updatedPolicies = [...currentPolicies, testPolicy];
  localStorage.setItem('commission_tracker_policies', JSON.stringify(updatedPolicies));

  console.log('✅ Test policy added:', testPolicy.policyNumber);
  console.log('New policies count:', updatedPolicies.length);

  // Trigger a storage event to notify React
  window.dispatchEvent(new Event('storage'));

  console.log('🔄 Refresh the page to see the new policy in the list');
  console.log('Or check if it appears immediately if the app is listening to storage events');

  return testPolicy;
})();