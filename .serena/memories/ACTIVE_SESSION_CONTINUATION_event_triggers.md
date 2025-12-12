# CRITICAL: Workflow Event Trigger System Implementation - PHASE 1 COMPLETE

**Created**: 2024-12-12
**Updated**: 2024-12-12 (Phase 1 Completed)
**Priority**: HIGH
**Estimated Effort**: 8-12 hours (3 hours completed, 5-9 hours remaining)

## PHASE 1 COMPLETED ✅

### What Was Implemented
1. **WorkflowEventEmitter Service** (`src/services/events/workflowEventEmitter.ts`)
   - Centralized event emission system
   - Finds workflows listening to specific events
   - Evaluates conditions and cooldowns
   - Creates workflow runs and triggers Edge Function
   - Event constants for type safety

2. **Database Migration** (`20251212_001_workflow_event_tracking.sql`)
   - Created workflow_events table for tracking
   - Added indexes for efficient queries
   - RLS policies for security
   - Automatic cleanup of old events (30 days)

3. **Recruit Service Integration** 
   - Events now fire on:
     - Recruit creation (RECRUIT_CREATED)
     - Phase changes (RECRUIT_PHASE_CHANGED)
     - Graduation to agent (RECRUIT_GRADUATED_TO_AGENT)
     - Dropout (RECRUIT_DROPPED_OUT)
   - Full context passed with each event

### Testing Completed
- ✅ TypeScript compilation passes
- ✅ Build completes successfully
- ✅ No type errors

## Current State Analysis

The workflow automation system has been built with a complete UI for creating event-triggered workflows, but **the backend event firing mechanism is completely missing**. This means:

- ✅ UI for selecting event triggers works
- ✅ Events are saved to workflows correctly
- ✅ Trigger event types exist in database
- ❌ **NO code fires these events when actions happen**
- ❌ **NO mechanism to execute workflows when events occur**

## The Problem

Users can create workflows like:
- "Send email when recruit graduates to agent"
- "Create notification when policy is approved"
- "Update field when commission is earned"

But these workflows will NEVER run because nothing in the codebase triggers these events.

## Required Implementation

### Phase 1: Event Emission Infrastructure (3-4 hours)

Create a centralized event system that fires when database changes occur:

```typescript
// src/services/eventEmitter.ts
class WorkflowEventEmitter {
  async emit(eventName: string, context: Record<string, any>) {
    // 1. Find all active workflows with this event trigger
    // 2. Check conditions and cooldowns
    // 3. Queue workflow execution
  }
}
```

### Phase 2: Integration Points (4-5 hours)

Add event emissions to existing services:

#### Recruit Events
- `src/services/recruiting/recruitService.ts`:
  - Fire `recruit.phase_changed` when updatePhase() is called
  - Fire `recruit.graduated_to_agent` when phase becomes 'graduated'
  - Fire `recruit.dropped_out` when phase becomes 'dropped'
  - Include recruit data in event context

#### Policy Events
- `src/services/policyService.ts`:
  - Fire `policy.created` in createPolicy()
  - Fire `policy.approved` in approvePolicy()
  - Fire `policy.cancelled` in cancelPolicy()
  - Include policy and client data in context

#### Commission Events
- `src/services/commissionService.ts`:
  - Fire `commission.earned` when commission calculated
  - Fire `commission.chargeback` when chargeback occurs
  - Include commission and agent data in context

#### User Events
- `src/contexts/AuthContext.tsx`:
  - Fire `user.login` on successful authentication
  - Fire `user.role_changed` when role updates
  - Include user data in context

### Phase 3: Workflow Execution Engine (2-3 hours)

Implement the actual workflow runner:

```typescript
// src/services/workflowExecutor.ts
class WorkflowExecutor {
  async executeTriggeredWorkflows(eventName: string, context: any) {
    // 1. Query workflows with matching event trigger
    // 2. Check rate limits and cooldowns
    // 3. Create workflow runs
    // 4. Execute via Edge Function or queue
  }
}
```

### Phase 4: Database Infrastructure (1-2 hours)

Add required database components:

```sql
-- Table to track event occurrences
CREATE TABLE workflow_events (
  id UUID PRIMARY KEY,
  event_name TEXT NOT NULL,
  context JSONB,
  fired_at TIMESTAMP DEFAULT NOW(),
  workflows_triggered INTEGER DEFAULT 0
);

-- Index for efficient event lookup
CREATE INDEX idx_workflow_config_event_trigger
ON workflows((config->>'trigger'->>'eventName'))
WHERE status = 'active';
```

## Implementation Approach

### Option 1: Database Triggers (Recommended)
- Use PostgreSQL triggers to detect changes
- Call Edge Functions when events occur
- Pros: Reliable, works even if app crashes
- Cons: Requires database access

### Option 2: Application-Level Events
- Emit events from service methods
- Use in-memory event bus
- Pros: Easier to test, more control
- Cons: Events lost if app crashes

### Option 3: Hybrid Approach
- Critical events via database triggers
- Non-critical via application
- Best of both worlds

## Files to Modify

### High Priority (Core Implementation)
1. Create `src/services/events/workflowEventEmitter.ts`
2. Create `src/services/events/workflowExecutor.ts`
3. Update `src/services/recruiting/recruitService.ts`
4. Update `src/services/policyService.ts`
5. Update `src/services/commissionService.ts`

### Medium Priority (Extended Events)
6. Update `src/contexts/AuthContext.tsx`
7. Update `src/services/emailService.ts`
8. Create `supabase/functions/workflow-event-processor/index.ts`

### Low Priority (Monitoring)
9. Create event dashboard in Training Hub
10. Add event history tracking
11. Create debugging tools

## Testing Requirements

### Unit Tests Required
- Event emitter fires correctly
- Workflow executor queries correctly
- Rate limiting works
- Cooldowns enforced

### Integration Tests Required
- Recruit graduation triggers workflow
- Policy creation triggers workflow
- Multiple workflows can listen to same event
- Conditional triggers work

### Edge Cases to Handle
- Workflow deleted while event firing
- Database transaction rollback
- Circular event chains
- Rate limit exceeded
- Malformed event context

## Success Criteria

1. **Working Event System**: Events fire when actions occur
2. **Workflow Execution**: Workflows run when their event triggers
3. **Performance**: <100ms overhead per event
4. **Reliability**: No lost events, proper error handling
5. **Observability**: Can see what events fired when

## Next Steps

When implementing, start with:

1. **Pick ONE event** (suggest: `recruit.graduated_to_agent`)
2. **Implement end-to-end** for that single event
3. **Test thoroughly** including Edge Function execution
4. **Then expand** to other events

## Critical Considerations

### Performance Impact
- Events will fire frequently
- Need efficient queries to find matching workflows
- Consider caching active workflows
- Batch event processing if needed

### Security
- Validate event context before execution
- Prevent event injection attacks
- Audit trail for all executions
- Rate limit per user/workflow

### Error Handling
- Don't let workflow errors affect main operation
- Retry failed executions
- Alert on repeated failures
- Provide debugging tools

## Next Steps - PHASE 2 REQUIRED

### Immediate Actions Needed
1. **Apply Database Migration**
   ```bash
   # Fix migration sync issue first
   supabase db pull
   # Then apply the new migration
   npx supabase migration up --local
   ```

2. **Test Event Firing**
   - Create a workflow with event trigger for "recruit.graduated_to_agent"
   - Update a recruit's status to "completed"
   - Verify workflow_events table gets populated
   - Check workflow_runs table for new runs

3. **Extend to Other Services** (3-4 hours)
   - Policy Service events (created, approved, cancelled)
   - Commission Service events (earned, chargeback, paid)
   - Email Service events (sent, failed, bounced)

### Known Issues to Address
- Database migration sync issue needs resolution
- Edge Function may need updating to handle event-triggered runs
- No UI feedback when events fire (consider adding toast notifications)

## Command to Continue

When ready to implement Phase 2:

```
Continue implementing Phase 2 of the workflow event trigger system.
Start by resolving the database migration sync issue, then test the recruit graduation event end-to-end.
After confirming it works, extend event emissions to policy and commission services.
```

## Questions to Answer First

Before starting implementation:

1. Should events be synchronous or asynchronous?
2. How should we handle workflow errors - retry, ignore, or alert?
3. Should we implement rate limiting per event or per workflow?
4. Do we need event replay capability for debugging?
5. Should certain events bypass cooldowns (e.g., critical alerts)?

---

This is a MAJOR architectural addition that touches many parts of the system. Recommend dedicated focus session with no other tasks.