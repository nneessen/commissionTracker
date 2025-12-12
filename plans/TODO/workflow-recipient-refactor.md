# Workflow Email Recipient System Refactor Plan

**Created:** 2025-12-11
**Status:** Ready for Implementation
**Priority:** High - Fixes critical UX issue
**Reviewed:** 2025-12-11 - Comprehensive code review completed

## Problem Statement

The current "Trigger User" option as default recipient makes no business sense - why would someone trigger a workflow to email themselves? This is backward and indicates poor UX design copied from generic workflow tools.

**Additionally, existing Edge Function code has bugs:**
- `all_trainers` queries non-existent `role` column (should be `roles` array)
- `manager` recipient queries non-existent `user_hierarchy` table (should use `upline_id` on `user_profiles`)

## Solution Overview

Replace the nonsensical recipient system with business-aligned options that actually make sense for an insurance commission tracking system.

---

## Prerequisites Verified ✅

| Item | Status | Notes |
|------|--------|-------|
| `policies.client_email` column | ❌ Does NOT exist | Must join to `clients` table via `client_id` FK |
| `clients.email` column | ✅ Exists | Nullable - need null handling |
| `/src/components/ui/checkbox.tsx` | ✅ Exists | shadcn/ui checkbox component |
| `user_profiles.upline_id` | ✅ Exists | For hierarchy lookups - NO separate `user_hierarchy` table |
| `user_profiles.roles` | ✅ Exists as `text[]` | Array, not singular `role` column |
| `get_downline_ids(uuid)` function | ✅ Exists | Returns `TABLE(downline_id uuid)` |
| `pipeline_phases` table | ✅ Exists | Has `phase_name`, `template_id`, `is_active` |
| `recruit_phase_progress` table | ✅ Exists | Has `phase_id`, `status`, `user_id` |

---

## New Recipient Types

### Hierarchy-Based
- `direct_upline` - Manager of the context user (via `upline_id`)
- `direct_downline` - All direct reports (where `upline_id = context_user`)
- `entire_downline` - Recursive all downline (uses existing `get_downline_ids`)
- `upline_chain` - All upline to top (recursive CTE, max depth 10)

### Role-Based
- `role` - Users with specific role(s) from `roles` array
- `all_agents` - All users with `agent_status = 'licensed'`
- `all_managers` - Users who have at least one downline
- `admins` - Users with `is_admin = true`
- `all_trainers` - Users with `'trainer'` in `roles` array

### Event Context
- `policy_agent` - Agent who owns policy (`policies.user_id`)
- `policy_client` - Client on policy (via `policies.client_id` → `clients.email`)
- `commission_recipient` - Agent receiving commission (`policies.user_id` via commission)
- `event_user` - User ID from event context data

### Recruiting Pipeline
- `pipeline_phase` - Recruits in specific phases (dynamic from DB)
- `pipeline_recruiter` - Recruiter of pipeline members (`user_profiles.recruiter_id`)
- `pipeline_upline` - Assigned upline of recruits (`user_profiles.upline_id`)

### Custom
- `specific_email` - Hardcoded email address
- `email_list` - Multiple emails (max 50)
- `dynamic_field` - Email from event field path

---

## Implementation Steps

### Step 1: Fix Existing Broken Code in Edge Function

**File:** `supabase/functions/process-workflow/index.ts`

**Bug 1 (Lines ~351-355):** `all_trainers` uses wrong column
```typescript
// BROKEN:
const { data: trainers } = await supabase
  .from('user_profiles')
  .select('id, email')
  .eq('role', 'trainer')  // ❌ Column doesn't exist

// FIXED:
const { data: trainers } = await supabase
  .from('user_profiles')
  .select('id, email')
  .contains('roles', ['trainer'])  // ✅ Use array contains
```

**Bug 2 (Lines ~325-343):** `manager` queries non-existent table
```typescript
// BROKEN:
const { data: hierarchy } = await supabase
  .from('user_hierarchy')  // ❌ Table doesn't exist
  .select('parent_user_id')
  .eq('user_id', context.recipientId)
  .single();

// FIXED:
const { data: user } = await supabase
  .from('user_profiles')
  .select('upline_id')
  .eq('id', context.recipientId)
  .single();

if (user?.upline_id) {
  const { data: manager } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', user.upline_id)
    .single();
  // ...
}
```

### Step 2: Type Definitions

**File:** `/Users/nickneessen/projects/commissionTracker/src/types/workflow-recipients.types.ts`

```typescript
// Recipient types for workflow email actions
export type RecipientType =
  // Hierarchy-based
  | 'direct_upline'
  | 'direct_downline'
  | 'entire_downline'
  | 'upline_chain'
  // Role-based
  | 'role'
  | 'all_agents'
  | 'all_managers'
  | 'all_trainers'
  | 'admins'
  // Event context
  | 'policy_agent'
  | 'policy_client'
  | 'commission_recipient'
  | 'event_user'
  // Recruiting pipeline
  | 'pipeline_phase'
  | 'pipeline_recruiter'
  | 'pipeline_upline'
  // Custom
  | 'specific_email'
  | 'email_list'
  | 'dynamic_field'
  // Legacy (backward compat)
  | 'trigger_user'
  | 'current_user';

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export interface RecipientConfig {
  type: RecipientType;
  // For 'role' type
  roles?: string[];
  // For 'pipeline_phase' type
  phaseIds?: string[];
  phaseStatuses?: PhaseStatus[];
  // For 'specific_email' and 'email_list'
  emails?: string[];
  // For 'dynamic_field'
  fieldPath?: string;
  // Options
  includeInactive?: boolean;
  maxRecipients?: number; // Default: 50
}

export interface ResolvedRecipients {
  emails: string[];
  userIds: string[];
  count: number;
  truncated: boolean; // True if maxRecipients limit was hit
}

// Category groupings for UI
export const RECIPIENT_CATEGORIES = {
  hierarchy: {
    label: 'Hierarchy',
    types: ['direct_upline', 'direct_downline', 'entire_downline', 'upline_chain']
  },
  role: {
    label: 'Role-Based',
    types: ['role', 'all_agents', 'all_managers', 'all_trainers', 'admins']
  },
  context: {
    label: 'Event Context',
    types: ['policy_agent', 'policy_client', 'commission_recipient', 'event_user']
  },
  pipeline: {
    label: 'Recruiting Pipeline',
    types: ['pipeline_phase', 'pipeline_recruiter', 'pipeline_upline']
  },
  custom: {
    label: 'Custom',
    types: ['specific_email', 'email_list', 'dynamic_field']
  }
} as const;
```

### Step 3: Update Workflow Types

**File:** `/Users/nickneessen/projects/commissionTracker/src/types/workflow.types.ts`

Add to `WorkflowAction.config`:
```typescript
import type { RecipientConfig } from './workflow-recipients.types';

export interface WorkflowAction {
  // ... existing fields
  config: {
    // ... existing fields

    // NEW: Structured recipient config (preferred)
    recipientConfig?: RecipientConfig;

    // LEGACY: Keep for backward compatibility
    recipientType?: string;
    recipientEmail?: string;
    recipientId?: string;
  };
}
```

### Step 4: Create Pipeline Phases Hook

**File:** `/Users/nickneessen/projects/commissionTracker/src/features/training-hub/hooks/usePipelinePhases.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';

interface PipelinePhase {
  id: string;
  phase_name: string;
  phase_order: number;
  template_id: string;
  is_active: boolean;
}

interface PipelineTemplate {
  id: string;
  name: string;
  phases: PipelinePhase[];
}

export function usePipelinePhases() {
  return useQuery({
    queryKey: ['pipeline-phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_templates')
        .select(`
          id,
          name,
          pipeline_phases (
            id,
            phase_name,
            phase_order,
            template_id,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(template => ({
        id: template.id,
        name: template.name,
        phases: (template.pipeline_phases || [])
          .filter((p: PipelinePhase) => p.is_active)
          .sort((a: PipelinePhase, b: PipelinePhase) => a.phase_order - b.phase_order)
      })) as PipelineTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePipelinePhaseOptions() {
  const { data: templates = [], isLoading } = usePipelinePhases();

  // Flatten to simple options for multi-select
  const options = templates.flatMap(template =>
    template.phases.map(phase => ({
      value: phase.id,
      label: `${template.name} > ${phase.phase_name}`,
      templateId: template.id,
      templateName: template.name,
      phaseName: phase.phase_name,
      order: phase.phase_order
    }))
  );

  return { options, isLoading };
}
```

### Step 5: Database Migration

**File:** `supabase/migrations/20251211_001_workflow_recipient_indexes.sql`

```sql
-- Migration: Add indexes for workflow recipient resolution
-- NOTE: Do NOT add recipient_config column to workflows table
-- Recipient config is stored per-action in the actions JSONB column

-- Index for role-based queries (GIN for array contains)
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles_gin
ON user_profiles USING GIN(roles);

-- Index for pipeline phase lookups
CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_phase_status
ON recruit_phase_progress(phase_id, status);

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_upline_active
ON user_profiles(upline_id)
WHERE upline_id IS NOT NULL AND is_deleted = false;

-- Function to get upline chain with depth limit
CREATE OR REPLACE FUNCTION get_upline_chain(p_user_id uuid, p_max_depth int DEFAULT 10)
RETURNS TABLE(id uuid, email text, depth int) AS $$
  WITH RECURSIVE upline_tree AS (
    -- Base case: start user's direct upline
    SELECT
      up.upline_id as id,
      (SELECT email FROM user_profiles WHERE id = up.upline_id) as email,
      1 as depth
    FROM user_profiles up
    WHERE up.id = p_user_id AND up.upline_id IS NOT NULL

    UNION ALL

    -- Recursive case: go up the chain
    SELECT
      up.upline_id,
      (SELECT email FROM user_profiles WHERE id = up.upline_id),
      ut.depth + 1
    FROM user_profiles up
    INNER JOIN upline_tree ut ON up.id = ut.id
    WHERE up.upline_id IS NOT NULL
      AND ut.depth < p_max_depth
  )
  SELECT * FROM upline_tree WHERE id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get downline with emails (uses existing get_downline_ids)
CREATE OR REPLACE FUNCTION get_downline_with_emails(p_user_id uuid, p_max_count int DEFAULT 50)
RETURNS TABLE(id uuid, email text) AS $$
  SELECT up.id, up.email
  FROM user_profiles up
  WHERE up.id IN (SELECT downline_id FROM get_downline_ids(p_user_id))
    AND up.id != p_user_id  -- Exclude self
    AND up.is_deleted = false
    AND up.email IS NOT NULL
  LIMIT p_max_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_upline_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_downline_with_emails TO authenticated;
```

### Step 6: Create Recipient Resolver Service

**File:** `/Users/nickneessen/projects/commissionTracker/src/services/workflow-recipient-resolver.ts`

```typescript
import { supabase } from '@/services/base/supabase';
import type { RecipientConfig, ResolvedRecipients, RecipientType } from '@/types/workflow-recipients.types';

const DEFAULT_MAX_RECIPIENTS = 50;

interface ResolverContext {
  triggeredBy?: string;
  triggeredByEmail?: string;
  recipientId?: string;
  recipientEmail?: string;
  policyId?: string;
  commissionId?: string;
  [key: string]: unknown;
}

export async function resolveRecipients(
  config: RecipientConfig,
  context: ResolverContext
): Promise<ResolvedRecipients> {
  const maxRecipients = config.maxRecipients || DEFAULT_MAX_RECIPIENTS;

  let result: ResolvedRecipients = {
    emails: [],
    userIds: [],
    count: 0,
    truncated: false
  };

  switch (config.type) {
    // Hierarchy-based
    case 'direct_upline':
      result = await resolveDirectUpline(context);
      break;
    case 'direct_downline':
      result = await resolveDirectDownline(context, maxRecipients);
      break;
    case 'entire_downline':
      result = await resolveEntireDownline(context, maxRecipients);
      break;
    case 'upline_chain':
      result = await resolveUplineChain(context, maxRecipients);
      break;

    // Role-based
    case 'role':
      result = await resolveByRoles(config.roles || [], maxRecipients);
      break;
    case 'all_agents':
      result = await resolveAllAgents(maxRecipients);
      break;
    case 'all_managers':
      result = await resolveAllManagers(maxRecipients);
      break;
    case 'all_trainers':
      result = await resolveAllTrainers(maxRecipients);
      break;
    case 'admins':
      result = await resolveAdmins(maxRecipients);
      break;

    // Event context
    case 'policy_agent':
      result = await resolvePolicyAgent(context);
      break;
    case 'policy_client':
      result = await resolvePolicyClient(context);
      break;
    case 'event_user':
      result = await resolveEventUser(context);
      break;

    // Pipeline
    case 'pipeline_phase':
      result = await resolvePipelinePhase(config.phaseIds || [], config.phaseStatuses, maxRecipients);
      break;
    case 'pipeline_recruiter':
      result = await resolvePipelineRecruiter(context);
      break;
    case 'pipeline_upline':
      result = await resolvePipelineUpline(context);
      break;

    // Custom
    case 'specific_email':
      result = resolveSpecificEmail(config.emails?.[0]);
      break;
    case 'email_list':
      result = resolveEmailList(config.emails || [], maxRecipients);
      break;
    case 'dynamic_field':
      result = resolveDynamicField(context, config.fieldPath);
      break;

    // Legacy backward compat
    case 'trigger_user':
    case 'current_user':
      result = resolveTriggerUser(context);
      break;

    default:
      console.warn(`Unknown recipient type: ${config.type}`);
  }

  return result;
}

// === HIERARCHY RESOLVERS ===

async function resolveDirectUpline(context: ResolverContext): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('upline_id')
    .eq('id', userId)
    .single();

  if (!data?.upline_id) return emptyResult();

  const { data: upline } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', data.upline_id)
    .single();

  if (!upline?.email) return emptyResult();

  return {
    emails: [upline.email],
    userIds: [upline.id],
    count: 1,
    truncated: false
  };
}

async function resolveDirectDownline(context: ResolverContext, max: number): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('upline_id', userId)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveEntireDownline(context: ResolverContext, max: number): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase.rpc('get_downline_with_emails', {
    p_user_id: userId,
    p_max_count: max + 1
  });

  return formatResult(data || [], max);
}

async function resolveUplineChain(context: ResolverContext, max: number): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase.rpc('get_upline_chain', {
    p_user_id: userId,
    p_max_depth: Math.min(max, 10)
  });

  return formatResult(data || [], max);
}

// === ROLE RESOLVERS ===

async function resolveByRoles(roles: string[], max: number): Promise<ResolvedRecipients> {
  if (roles.length === 0) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .overlaps('roles', roles)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAllAgents(max: number): Promise<ResolvedRecipients> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('agent_status', 'licensed')
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAllManagers(max: number): Promise<ResolvedRecipients> {
  // Users who have at least one person reporting to them
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .in('id',
      supabase
        .from('user_profiles')
        .select('upline_id')
        .not('upline_id', 'is', null)
    )
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAllTrainers(max: number): Promise<ResolvedRecipients> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .contains('roles', ['trainer'])
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAdmins(max: number): Promise<ResolvedRecipients> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('is_admin', true)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

// === CONTEXT RESOLVERS ===

async function resolvePolicyAgent(context: ResolverContext): Promise<ResolvedRecipients> {
  if (!context.policyId) return emptyResult();

  const { data } = await supabase
    .from('policies')
    .select('user_id, user:user_profiles!user_id(id, email)')
    .eq('id', context.policyId)
    .single();

  if (!data?.user?.email) return emptyResult();

  return {
    emails: [data.user.email],
    userIds: [data.user.id],
    count: 1,
    truncated: false
  };
}

async function resolvePolicyClient(context: ResolverContext): Promise<ResolvedRecipients> {
  if (!context.policyId) return emptyResult();

  // Join policies -> clients to get email
  const { data } = await supabase
    .from('policies')
    .select('client:clients(id, email)')
    .eq('id', context.policyId)
    .single();

  if (!data?.client?.email) return emptyResult();

  return {
    emails: [data.client.email],
    userIds: [], // Clients are not users
    count: 1,
    truncated: false
  };
}

async function resolveEventUser(context: ResolverContext): Promise<ResolvedRecipients> {
  const userId = context.eventUserId || context.recipientId;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', userId)
    .single();

  if (!data?.email) return emptyResult();

  return {
    emails: [data.email],
    userIds: [data.id],
    count: 1,
    truncated: false
  };
}

// === PIPELINE RESOLVERS ===

async function resolvePipelinePhase(
  phaseIds: string[],
  statuses: string[] | undefined,
  max: number
): Promise<ResolvedRecipients> {
  if (phaseIds.length === 0) return emptyResult();

  let query = supabase
    .from('recruit_phase_progress')
    .select('user_id, user:user_profiles!user_id(id, email)')
    .in('phase_id', phaseIds);

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  const { data } = await query.limit(max + 1);

  const users = (data || [])
    .filter(d => d.user?.email)
    .map(d => ({ id: d.user!.id, email: d.user!.email }));

  return formatResult(users, max);
}

async function resolvePipelineRecruiter(context: ResolverContext): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('recruiter_id')
    .eq('id', userId)
    .single();

  if (!data?.recruiter_id) return emptyResult();

  const { data: recruiter } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', data.recruiter_id)
    .single();

  if (!recruiter?.email) return emptyResult();

  return {
    emails: [recruiter.email],
    userIds: [recruiter.id],
    count: 1,
    truncated: false
  };
}

async function resolvePipelineUpline(context: ResolverContext): Promise<ResolvedRecipients> {
  // Same as direct_upline for recruits
  return resolveDirectUpline(context);
}

// === CUSTOM RESOLVERS ===

function resolveSpecificEmail(email: string | undefined): ResolvedRecipients {
  if (!email || !isValidEmail(email)) return emptyResult();

  return {
    emails: [email],
    userIds: [],
    count: 1,
    truncated: false
  };
}

function resolveEmailList(emails: string[], max: number): ResolvedRecipients {
  const validEmails = emails.filter(isValidEmail).slice(0, max);

  return {
    emails: validEmails,
    userIds: [],
    count: validEmails.length,
    truncated: emails.length > max
  };
}

function resolveDynamicField(context: ResolverContext, fieldPath: string | undefined): ResolvedRecipients {
  if (!fieldPath) return emptyResult();

  // Navigate the field path to get the value
  const parts = fieldPath.split('.');
  let value: unknown = context;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return emptyResult();
    }
  }

  if (typeof value === 'string' && isValidEmail(value)) {
    return {
      emails: [value],
      userIds: [],
      count: 1,
      truncated: false
    };
  }

  return emptyResult();
}

function resolveTriggerUser(context: ResolverContext): ResolvedRecipients {
  const email = context.recipientEmail || context.triggeredByEmail;
  const id = context.recipientId || context.triggeredBy;

  if (!email) return emptyResult();

  return {
    emails: [email as string],
    userIds: id ? [id as string] : [],
    count: 1,
    truncated: false
  };
}

// === HELPERS ===

function emptyResult(): ResolvedRecipients {
  return { emails: [], userIds: [], count: 0, truncated: false };
}

function formatResult(
  data: Array<{ id: string; email: string }>,
  max: number
): ResolvedRecipients {
  const truncated = data.length > max;
  const limited = truncated ? data.slice(0, max) : data;

  return {
    emails: limited.map(d => d.email),
    userIds: limited.map(d => d.id),
    count: limited.length,
    truncated
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Step 7: Update WorkflowActionsBuilder UI

**File:** `/Users/nickneessen/projects/commissionTracker/src/features/training-hub/components/WorkflowActionsBuilder.tsx`

Key changes:
1. Replace single recipient dropdown with category-based selector
2. Add multi-select for pipeline phases
3. Add role selector for role-based recipients
4. Keep backward compat for legacy recipient types
5. Use proper theme colors (blue for email, amber for notification, violet for webhook)

---

## Backward Compatibility

### Legacy Recipient Types Mapping:
| Legacy Type | New Handling |
|-------------|--------------|
| `trigger_user` | Maps to `event_user` internally |
| `current_user` | Maps to trigger context user |
| `specific_email` | Unchanged |
| `all_agents` | Unchanged |
| `manager` | Maps to `direct_upline` |
| `all_trainers` | Fixed to use `roles` array |

### Migration Strategy:
- **DO NOT** auto-migrate existing workflows
- Keep legacy types functional via resolver mapping
- New workflows use new type structure
- UI only shows new options going forward

---

## Security Considerations

1. **RLS Bypass:** Functions use `SECURITY DEFINER` - ensure they don't expose emails beyond what RLS allows
2. **Depth Limit:** Hierarchy traversals limited to 10 levels
3. **Max Recipients:** Hard limit of 50 to prevent mass email abuse
4. **Email Validation:** All custom emails validated before use
5. **No Direct Exposure:** Email addresses resolved server-side only

---

## Testing Requirements

### Unit Tests:
```typescript
describe('resolveRecipients', () => {
  it('should resolve direct_upline from upline_id', async () => { ... });
  it('should return empty for user with no upline', async () => { ... });
  it('should resolve all_trainers using roles array', async () => { ... });
  it('should resolve policy_client via clients join', async () => { ... });
  it('should handle legacy trigger_user type', async () => { ... });
  it('should enforce maxRecipients limit', async () => { ... });
  it('should validate email format', async () => { ... });
});
```

### Integration Tests:
```bash
npm run test:run
```

### Build Validation:
```bash
npm run build
npx tsc --noEmit
```

---

## Implementation Order

1. ✅ Review and verify prerequisites
2. [ ] Fix existing Edge Function bugs (all_trainers, manager)
3. [ ] Create type definitions file
4. [ ] Update workflow.types.ts
5. [ ] Create usePipelinePhases hook
6. [ ] Run database migration via `scripts/apply-migration.sh`
7. [ ] Create recipient resolver service
8. [ ] Update WorkflowActionsBuilder UI
9. [ ] Update Edge Function to use new resolver
10. [ ] Run tests and build
11. [ ] Deploy and monitor

---

## Success Metrics

- Zero "Trigger User" selections in new workflows
- All existing workflows continue to function
- No runtime errors in recipient resolution
- Build passes with zero TypeScript errors
- All unit tests pass

---

End of Plan
