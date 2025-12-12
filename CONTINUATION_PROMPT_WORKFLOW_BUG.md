# CRITICAL CONTINUATION: Workflow Trigger Persistence Bug

## ⚠️ CRITICAL UNRESOLVED BUG
**The workflow trigger type is NOT persisting when editing workflows. This must be fixed immediately.**

## Problem Description
When a user edits a workflow and changes the trigger type (especially to "event" and selects an event), the changes do NOT save to the database. Upon reopening the workflow, all trigger changes are lost and revert to the previous values.

## User Context
- **User**: nneessen
- **Project**: Commission Tracker - Insurance Sales Management System
- **Location**: `/home/nneessen/projects/commissionTracker`
- **Frustration Level**: EXTREMELY HIGH (multiple failed attempts to fix)
- **User Quote**: "why are you being lazy and not testing and thoroughly reviewing this code you're writing?"

## Steps to Reproduce (CONFIRMED BY USER)
1. Go to Training Hub → Automation tab
2. Edit any existing workflow
3. Change trigger type to "Event"
4. Select any event (e.g., "recruit.created")
5. Click through to Review step
6. Click "Update"
7. Close and reopen the workflow
8. **BUG**: Trigger type has reverted - changes were NOT saved

## Current Code State

### Files Recently Modified (May Have Issues)
1. **src/services/workflowService.ts**
   - Lines 95-191: `updateWorkflow()` method
   - Supposedly fetches existing config and merges - NOT WORKING
   - Has console.log statements for debugging

2. **src/features/training-hub/components/WorkflowTriggerSetup.tsx**
   - Lines 50-88: `handleTriggerTypeChange()`
   - Lines 90-100: `handleEventChange()`
   - Should update both triggerType and trigger object

3. **src/features/training-hub/components/WorkflowWizard.tsx**
   - Lines 268-303: `handleSave()` method
   - Lines 74-126: Loading workflow data in useEffect

## What Has Been Tried (ALL FAILED)
1. ❌ Modified config merging in updateWorkflow
2. ❌ Added fetching of existing config before update
3. ❌ Synchronized trigger.type with triggerType
4. ❌ Added debug logging
5. ❌ Fixed handleTriggerTypeChange to update both fields

## Database Structure
```sql
workflows table:
- trigger_type: string (stores 'manual', 'event', 'schedule', 'webhook')
- config: jsonb (contains { trigger: { type, eventName, ... } })
- Both fields must be updated together
```

## Immediate Actions Required

### 1. Deep Debug the Update Flow
```javascript
// Add logging at EVERY step:
// - WorkflowWizard: Log formData before save
// - useUpdateWorkflow: Log data passed to service
// - workflowService: Log updateData sent to Supabase
// - Check Supabase logs for actual SQL executed
```

### 2. Test Database Update Directly
```sql
-- Test if database accepts the update
UPDATE workflows
SET trigger_type = 'event',
    config = jsonb_set(config, '{trigger}', '{"type":"event","eventName":"recruit.created"}'::jsonb)
WHERE id = 'WORKFLOW_ID';
```

### 3. Check for Hidden Issues
- RLS policies blocking updates?
- Database triggers interfering?
- Cache not invalidating properly?
- React state management issues?

## Required Testing Approach
1. **DO NOT claim it's fixed without testing**
2. Create a test workflow
3. Actually open the UI and test the edit flow
4. Verify in database that values persisted
5. Reload the UI and confirm values load correctly

## Other Features Added (Working)
- ✅ EventSelectionDialog component for better event selection UI
- ✅ Recipient recommendations based on selected events
- ✅ Priority field documentation and UI improvements
- ❌ But none of this matters if the core save functionality is broken

## Files to Check First
```bash
# Check these files in order:
src/features/training-hub/components/WorkflowWizard.tsx  # Start here - trace the save flow
src/hooks/workflows/useWorkflows.ts                      # Check the mutation
src/services/workflowService.ts                          # Check the update logic
src/features/training-hub/components/WorkflowTriggerSetup.tsx  # Check state updates

# Database check
SELECT id, name, trigger_type, config->>'trigger' as trigger_config
FROM workflows
ORDER BY updated_at DESC
LIMIT 5;
```

## Success Criteria
1. Edit a workflow
2. Change trigger type to "event"
3. Select "recruit.created" event
4. Save the workflow
5. Close and reopen
6. **MUST SEE**: Event trigger is still selected with "recruit.created"

## DO NOT
- Add more features until this is fixed
- Claim it's working without testing in the actual UI
- Make assumptions about what's working
- Skip any debugging steps

## START HERE
1. Open the project
2. Check `.serena/memories/CRITICAL_WORKFLOW_PERSISTENCE_BUG.md` for detailed notes
3. Add comprehensive logging at every step of the update flow
4. Test with a real workflow in the UI
5. Track the data through each layer until you find where it's failing

The user needs this fixed ASAP as it's blocking their entire workflow automation feature.