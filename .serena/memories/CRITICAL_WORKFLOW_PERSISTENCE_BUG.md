# CRITICAL: Workflow Trigger Type Not Persisting - UNRESOLVED

## Problem Statement
**CRITICAL BUG**: When editing a workflow and changing the trigger type (especially to "event" and selecting an event), the changes are NOT persisting to the database when clicking Update. The workflow reverts to its previous trigger type when reopened.

## Current Status: NOT FIXED
Despite multiple attempts, the trigger type persistence is still broken. User has confirmed multiple times that changes are not saving.

## Reproduction Steps
1. Navigate to Training Hub → Automation tab
2. Edit an existing workflow
3. Change trigger type to "Event"
4. Select any event (e.g., recruit.created)
5. Continue through steps to Review
6. Click Update
7. Close dialog
8. Reopen the same workflow
9. **BUG**: Trigger type has reverted to previous value (not "event")

## Code Areas Involved

### Primary Files
1. **src/services/workflowService.ts**
   - `updateWorkflow()` method - Lines 95-191
   - Currently fetches existing config and merges, but something is wrong
   - Has debug logging added but not helping

2. **src/features/training-hub/components/WorkflowWizard.tsx**
   - `handleSave()` method - Lines 268-303
   - Passes `formData` to update service
   - Added console.log but issue persists

3. **src/features/training-hub/components/WorkflowTriggerSetup.tsx**
   - `handleTriggerTypeChange()` - Lines 50-88
   - Updates both triggerType and trigger object
   - `handleEventChange()` - Lines 90-100

4. **src/hooks/workflows/useWorkflows.ts**
   - `useUpdateWorkflow()` hook - Lines 68-83
   - Passes data to service

## Database Schema
```typescript
workflows: {
  trigger_type: string  // This field
  config: Json          // Contains { trigger: {...} }
  // Both need to be updated and synchronized
}
```

## Attempted Fixes (ALL FAILED)
1. ✗ Modified updateWorkflow to merge config properly
2. ✗ Ensured trigger.type matches triggerType
3. ✗ Added config fetching before update
4. ✗ Fixed handleTriggerTypeChange to set both fields
5. ✗ Added debug logging throughout

## What Needs Investigation

### 1. Check if formData is correct
- In WorkflowWizard, before calling updateWorkflow.mutateAsync()
- Log the exact formData being sent
- Verify trigger and triggerType are both set correctly

### 2. Check what's actually sent to database
- In workflowService.updateWorkflow()
- Log the exact updateData object
- Check Supabase network tab for actual SQL/RPC call

### 3. Check database directly
- Query workflows table after update
- See if trigger_type and config are actually updated
- Check if there's a database trigger or RLS policy interfering

### 4. Check if data is loading correctly
- When workflow is loaded for editing in WorkflowWizard useEffect
- Is the trigger data being properly parsed from config?
- Lines 74-126 in WorkflowWizard.tsx

## Debugging Commands to Run
```bash
# Check database directly
psql -c "SELECT id, name, trigger_type, config FROM workflows WHERE name LIKE '%Test%';"

# Monitor network requests
# Open Chrome DevTools → Network → Filter by "workflows"
# Watch the PATCH/UPDATE request payload and response

# Test with curl
curl -X PATCH "https://lxvtqphktemcwupsafpr.supabase.co/rest/v1/workflows?id=eq.WORKFLOW_ID" \
  -H "apikey: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"trigger_type":"event","config":{"trigger":{"type":"event","eventName":"recruit.created"}}}'
```

## Critical Questions
1. Is the updateWorkflow actually being called with complete data?
2. Is Supabase actually receiving the update request?
3. Is the database update succeeding but being overwritten?
4. Is there a race condition or cache issue?
5. Is RLS blocking the update silently?

## User Frustration Level: EXTREMELY HIGH
- Multiple attempts to fix have failed
- User explicitly stated: "why are you being lazy and not testing"
- This is blocking their workflow automation feature completely

## Next Steps for New Session
1. Add comprehensive logging at EVERY step
2. Test the update manually via Supabase SQL Editor
3. Check for any database constraints or triggers
4. Consider completely rewriting the update logic
5. TEST EVERY CHANGE MANUALLY before claiming it's fixed