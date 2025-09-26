// /home/nneessen/projects/commissionTracker/test-policy-node.js

const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./test-storage');

const STORAGE_KEY = 'commission_tracker_policies';

// Simulate adding a policy like the React app would
function simulateAddPolicy() {
    console.log('\n=== SIMULATING POLICY ADDITION ===\n');

    // Get current policies
    const currentPolicies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    console.log('Current policies count:', currentPolicies.length);

    // Create new policy (matching React structure)
    const newPolicy = {
        id: 'node-test-' + Date.now(),
        policyNumber: 'NODE-' + Math.floor(Math.random() * 10000),
        status: 'active',
        client: {
            name: 'Node Test Client',
            state: 'CA',
            age: 30,
            email: 'nodetest@example.com',
            phone: '555-9999'
        },
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: new Date().toISOString(),
        annualPremium: 2400,
        paymentFrequency: 'monthly',
        commissionPercentage: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add to array
    currentPolicies.push(newPolicy);

    // Save back
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPolicies));

    console.log('✅ Added policy:', newPolicy.policyNumber);
    console.log('New total:', currentPolicies.length);
    console.log('\nPolicy details:');
    console.log(JSON.stringify(newPolicy, null, 2));

    // Verify it was saved
    const verification = JSON.parse(localStorage.getItem(STORAGE_KEY));
    console.log('\n✅ Verification - policies in storage:', verification.length);
}

// Check what's currently stored
function checkStorage() {
    console.log('\n=== CHECKING STORAGE ===\n');
    const policies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    console.log('Found', policies.length, 'policies');
    if (policies.length > 0) {
        console.log('\nPolicy list:');
        policies.forEach(p => {
            console.log(`- ${p.policyNumber}: ${p.client?.name || 'Unknown'} (${p.status})`);
        });
    }
}

// Run tests
checkStorage();
simulateAddPolicy();
checkStorage();

console.log('\n=== TEST COMPLETE ===');
console.log('If this worked, the issue is with the React app, not localStorage');