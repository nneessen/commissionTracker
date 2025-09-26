# Testing Policy Addition - Browser Instructions

## Quick Test (Copy & Paste into Browser Console)

1. Open http://localhost:3000 in your browser
2. Open Developer Console (F12 or Right-click → Inspect → Console)
3. Copy and paste this entire code block:

```javascript
// ADD A TEST POLICY
(function() {
    const STORAGE_KEY = 'commission_tracker_policies';

    // Get existing policies
    const existing = localStorage.getItem(STORAGE_KEY);
    const policies = existing ? JSON.parse(existing) : [];

    console.log('Current policies:', policies.length);

    // Create new policy
    const testPolicy = {
        id: 'browser-' + Date.now(),
        policyNumber: 'BROWSER-TEST-' + Date.now(),
        status: 'active',
        client: {
            name: 'Browser Test User',
            state: 'CA',
            age: 35,
            email: 'test@example.com',
            phone: '555-1234'
        },
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: new Date().toISOString(),
        annualPremium: 3600,
        paymentFrequency: 'monthly',
        commissionPercentage: 75,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: 'Added via browser console'
    };

    // Add and save
    policies.push(testPolicy);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));

    console.log('✅ Policy added:', testPolicy.policyNumber);
    console.log('New total:', policies.length);
    console.log('🔄 REFRESH THE PAGE NOW to see if it appears!');

    return testPolicy;
})();
```

4. Press Enter to run the code
5. **REFRESH THE PAGE** (F5 or Cmd+R)
6. Check if the new policy appears in the table

## What to Look For

After refreshing:
- ✅ **SUCCESS**: The policy appears in the table
- ❌ **FAIL**: The policy does NOT appear (indicates React state issue)

## Alternative Test Method

Open `test-live-addition.html` in your browser:
```bash
# In terminal:
firefox test-live-addition.html
# or
chrome test-live-addition.html
```

This provides a UI to:
- Check current policies
- Add test policies
- Clear all policies
- Open the main app

## Verification Steps

1. Check localStorage directly:
```javascript
// In console:
JSON.parse(localStorage.getItem('commission_tracker_policies'))
```

2. Check if PolicyList component is reading correctly:
```javascript
// In console after page load:
document.querySelectorAll('tbody tr').length
```

3. Test the form manually:
- Click "+ New Policy" button
- Fill out all required fields
- Click "Add Policy"
- Check if it appears in the table

## Current Issue Status

Based on the code review:
1. ✅ Fixed: Scope issue in usePolicy hook
2. ✅ Fixed: Multiple state instances between components
3. ✅ Fixed: Props now passed from PolicyDashboard to children
4. ✅ Removed: Expiration date field from form
5. ⏳ Testing: Actual browser behavior with the fixes