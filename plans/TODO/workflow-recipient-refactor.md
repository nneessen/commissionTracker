# Workflow Email Recipient System Refactor Plan

**Created:** 2024-12-11
**Status:** Ready for Implementation
**Priority:** High - Fixes critical UX issue

## Problem Statement

The current "Trigger User" option as default recipient makes no business sense - why would someone trigger a workflow to email themselves? This is backward and indicates poor UX design copied from generic workflow tools.

## Solution Overview

Replace the nonsensical recipient system with business-aligned options that actually make sense for an insurance commission tracking system.

## New Recipient Types

### Hierarchy-Based
- `direct_upline` - Manager of the trigger user
- `direct_downline` - All direct reports
- `entire_downline` - Recursive all downline
- `upline_chain` - All upline to top

### Role-Based
- `role` - Users with specific role(s)
- `all_agents` - All active agents
- `all_managers` - Users with downline
- `admins` - Admin users only

### Event Context
- `policy_holder` - Client on policy (needs verification)
- `policy_agent` - Agent who owns policy
- `commission_recipient` - Agent receiving commission
- `event_user` - User from event data

### Recruiting Pipeline
- `pipeline_phase` - Recruits in specific phases (dynamic from DB)
- `pipeline_recruiter` - Recruiter of pipeline members
- `pipeline_upline` - Assigned upline of recruits

### Custom
- `specific_email` - Hardcoded email
- `email_list` - Multiple emails
- `dynamic_field` - Email from event field

## Implementation Steps

### 1. Type Definitions
```typescript
// File: /home/nneessen/projects/commissionTracker/src/types/workflow-recipients.types.ts
export type RecipientType =
  | 'direct_upline'
  | 'direct_downline'
  | 'entire_downline'
  | 'upline_chain'
  | 'role'
  | 'all_agents'
  | 'all_managers'
  | 'admins'
  | 'event_user'
  | 'commission_recipient'
  | 'pipeline_phase'
  | 'pipeline_recruiter'
  | 'pipeline_upline'
  | 'specific_email'
  | 'email_list'
  | 'dynamic_field';

export interface RecipientConfig {
  type: RecipientType;
  roles?: string[];
  phaseIds?: string[];
  phaseStatuses?: ('not_started' | 'in_progress' | 'completed' | 'blocked')[];
  emails?: string[];
  fieldPath?: string;
  includeInactive?: boolean;
  maxRecipients?: number;
}
```

### 2. Update Workflow Types
- Add `recipientConfig?: RecipientConfig` to WorkflowAction config
- Keep old fields for backward compatibility

### 3. Create Pipeline Phases Hook
- Location: `/src/features/recruiting/hooks/usePipelinePhases.ts`
- Follow existing hook patterns from policies feature
- Cache for 5 minutes

### 4. Update WorkflowActionsBuilder UI
- Remove "Trigger User" as option
- Add category-based recipient selector
- Dynamic pipeline phase multi-select
- Proper theme colors (blue/amber/violet)

### 5. Database Migration
```sql
-- File: supabase/migrations/20241211_001_workflow_recipient_config.sql
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS recipient_config jsonb;

CREATE OR REPLACE FUNCTION get_entire_downline(p_user_id uuid)
RETURNS TABLE(id uuid, email text, depth int) AS $$
-- Implementation with RLS checks
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_recruit_phase_progress_lookup
ON recruit_phase_progress(phase_id, status);
```

### 6. Create Recipient Resolver Service
- Location: `/src/services/workflow-recipients.service.ts`
- Implement resolution logic for each recipient type
- Proper error handling and logging

## Critical Considerations

### Backward Compatibility
- Must handle existing workflows with `recipientType: 'trigger_user'`
- Migration path to convert old format to new

### Security
- RLS policies restrict email access
- Recursive CTE has depth limit (10)
- No direct email exposure in UI

### Performance
- Pipeline phases cached 5 minutes
- Indexed queries for phase lookups
- Server-side resolution only

## Testing Requirements

1. Unit tests for recipient resolver
2. UI tests for backward compatibility
3. Integration tests for each recipient type
4. Build validation: `npm run build`
5. Test validation: `npm run test:run`

## Open Questions

1. Does `policies` table have `client_email` column?
2. Does `/components/ui/checkbox` component exist?
3. Should we auto-migrate existing "trigger_user" workflows?

## Success Metrics

- Zero "Trigger User" selections in new workflows
- Successful migration of existing workflows
- No runtime errors in recipient resolution
- Improved workflow automation adoption

## Next Actions

1. Verify prerequisites (checkbox component, policies table)
2. Create type definitions
3. Implement UI changes
4. Run database migration
5. Deploy and monitor

---
End of Plan