# Manual Test Instructions for Policy Addition

## Test Steps

1. **Open the application**
   - Navigate to http://localhost:3000
   - The app should load with the Policy Dashboard

2. **Add a new policy via the form**
   - Click "Add Policy" button
   - Fill in the form:
     - Client Name: Test User
     - State: CA
     - Age: 35
     - Carrier: Select any available carrier
     - Product Type: Term Life
     - Policy Number: TEST-001
     - Effective Date: Today
     - Premium Amount: 250
     - Payment Frequency: Monthly
     - Commission %: 50
     - Status: Active
   - Click "Add Policy"

3. **Verify the policy appears**
   - The modal should close
   - The new policy should appear in the list immediately
   - Check that it shows:
     - Policy number: TEST-001
     - Client: Test User
     - Annual Premium: $3,000 (250 * 12)
     - Commission: $1,500 (50% of annual)

## Alternative Test via Console

If the form doesn't work, test directly in browser console:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Copy and paste the test script from `test-live-app.js`
4. Press Enter to run
5. Refresh the page
6. Check if the policy appears in the list

## Debugging

If policies aren't appearing:

1. Check browser console for errors
2. Look for console.log outputs:
   - "Form submitted with data:"
   - "Submission data with annual premium:"
   - "addPolicy called with:"
   - "Created new policy object:"
   - "Updated policies list, new length:"

3. Check localStorage:
   ```javascript
   localStorage.getItem('commission_tracker_policies')
   ```

## Expected Behavior

- Policies should be added immediately without page refresh
- Annual premium should be calculated correctly based on payment frequency
- Commission should be calculated as percentage of annual premium
- Policy should persist after page refresh