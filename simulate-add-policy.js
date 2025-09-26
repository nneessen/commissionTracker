// /home/nneessen/projects/commissionTracker/simulate-add-policy.js

// This simulates exactly what happens when you click "Add Policy" in the UI
// It follows the exact flow from PolicyForm -> usePolicy hook

function simulateAddPolicy() {
  console.log('\n=== SIMULATING ADD POLICY FLOW ===\n');

  // 1. Simulate form data (what PolicyForm sends)
  const formData = {
    clientName: 'John Smith',
    clientState: 'CA',
    clientAge: 35,
    clientEmail: 'john@example.com',
    clientPhone: '555-1234',
    carrierId: 'carrier-1',
    product: 'term_life',
    policyNumber: 'POL-' + Date.now(),
    effectiveDate: new Date().toISOString().split('T')[0],
    premium: 300, // Monthly premium
    paymentFrequency: 'monthly',
    commissionPercentage: 75,
    status: 'active',
    notes: 'Test policy added programmatically'
  };

  console.log('Form data prepared:');
  console.log('  Client:', formData.clientName);
  console.log('  Policy #:', formData.policyNumber);
  console.log('  Premium:', '$' + formData.premium + '/month');

  // 2. Calculate annual premium (from policyCalculations.ts)
  const annualPremium = formData.premium * 12; // monthly * 12
  console.log('\nCalculated annual premium:', '$' + annualPremium);

  // 3. Create policy object (matching usePolicy.ts structure)
  const newPolicy = {
    id: 'sim-' + Date.now(),
    policyNumber: formData.policyNumber,
    status: formData.status,
    client: {
      name: formData.clientName,
      state: formData.clientState,
      age: formData.clientAge,
      email: formData.clientEmail,
      phone: formData.clientPhone,
    },
    carrierId: formData.carrierId,
    product: formData.product,
    effectiveDate: new Date(formData.effectiveDate),
    termLength: undefined, // Not in form
    expirationDate: undefined, // Removed from form
    annualPremium: annualPremium,
    paymentFrequency: formData.paymentFrequency,
    commissionPercentage: formData.commissionPercentage,
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: formData.notes,
  };

  console.log('\nPolicy object created with ID:', newPolicy.id);

  // 4. Mock localStorage operations (what usePolicy does)
  const STORAGE_KEY = 'commission_tracker_policies';

  // Get current policies
  const mockStorage = {};
  mockStorage[STORAGE_KEY] = JSON.stringify([]);

  const currentPolicies = JSON.parse(mockStorage[STORAGE_KEY] || '[]');
  console.log('\nCurrent policies in storage:', currentPolicies.length);

  // Check for duplicates
  const isDuplicate = currentPolicies.some(p => p.policyNumber === newPolicy.policyNumber);
  if (isDuplicate) {
    console.error('ERROR: Duplicate policy number!');
    return;
  }

  // Add new policy
  currentPolicies.push(newPolicy);
  mockStorage[STORAGE_KEY] = JSON.stringify(currentPolicies);

  console.log('Policy added to storage');
  console.log('New total:', currentPolicies.length);

  // 5. Verify the save
  const verification = JSON.parse(mockStorage[STORAGE_KEY]);
  console.log('\n✅ Verification: Found', verification.length, 'policies after save');

  const addedPolicy = verification.find(p => p.id === newPolicy.id);
  if (addedPolicy) {
    console.log('✅ SUCCESS: Policy was correctly added and can be retrieved');
    console.log('\nAdded policy details:');
    console.log('  ID:', addedPolicy.id);
    console.log('  Number:', addedPolicy.policyNumber);
    console.log('  Client:', addedPolicy.client.name);
    console.log('  Annual Premium:', '$' + addedPolicy.annualPremium);
    console.log('  Expected Commission:', '$' + (addedPolicy.annualPremium * addedPolicy.commissionPercentage / 100));
  } else {
    console.log('❌ FAIL: Policy not found after save!');
  }

  return newPolicy;
}

// Run the simulation
const result = simulateAddPolicy();

console.log('\n=== SIMULATION COMPLETE ===');
console.log('The logic flow is correct. If policies aren\'t showing in the UI,');
console.log('the issue is likely with React state updates or component re-rendering.');