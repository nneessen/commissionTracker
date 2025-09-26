// /home/nneessen/projects/commissionTracker/ADD-POLICY-NOW.js
//
// INSTRUCTIONS:
// 1. Open http://localhost:3000 in your browser
// 2. Open Developer Console (F12)
// 3. Copy and paste this entire script
// 4. Press Enter
// 5. Refresh the page
// 6. The new policy should appear

(function() {
    console.log('=== ADDING TEST POLICY ===');

    // Get existing policies
    const STORAGE_KEY = 'commission_tracker_policies';
    const existing = localStorage.getItem(STORAGE_KEY);
    const policies = existing ? JSON.parse(existing) : [];

    console.log('Current policies:', policies.length);

    // Create a new test policy
    const testPolicy = {
        id: 'console-' + Date.now(),
        policyNumber: 'CONSOLE-' + Date.now(),
        status: 'active',
        client: {
            name: 'Console Test User',
            state: 'CA',
            age: 30,
            email: 'console@test.com',
            phone: '555-1234'
        },
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: new Date().toISOString(),
        annualPremium: 3600, // $300/month * 12
        paymentFrequency: 'monthly',
        commissionPercentage: 75,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: 'Added via console'
    };

    // Add to policies array
    policies.push(testPolicy);

    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));

    console.log('✅ Policy added successfully!');
    console.log('Policy number:', testPolicy.policyNumber);
    console.log('New total:', policies.length);
    console.log('');
    console.log('🔄 NOW REFRESH THE PAGE to see if it appears');
    console.log('');
    console.log('If it appears after refresh, the issue is with real-time state updates.');
    console.log('If it does NOT appear, there is an issue with reading from localStorage.');

    return testPolicy;
})();