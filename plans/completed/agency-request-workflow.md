# Agency Request & Approval Workflow - Implementation Plan

## Problem Restatement

Agents who build teams and hit external quotas can request to "become an agency." This is an MLM-style hierarchy where:
- Agent remains in their upline's hierarchy (upline_id chain intact)
- Agent gains their own agency (becomes owner)
- Existing downline automatically move to the new agency
- Future recruits go to the new agency
- Agencies form a parent-child hierarchy

**Constraints:**
- Eligibility is NOT tracked in this app (external system)
- Approval is by the agent's direct upline
- This is a REQUEST workflow, not direct creation

---

## High-Level Architecture

### Frontend Responsibilities
- Request form for agents to submit agency request
- Pending requests list for uplines to review
- Approve/reject actions with optional rejection reason
- Status display for agents tracking their request

### Backend Responsibilities
- `agency_requests` table for workflow state
- `parent_agency_id` column on `agencies` for hierarchy
- RLS policies for visibility (requester sees own, approver sees pending)
- Approval trigger to create agency + reassign agents

### Data Ownership
- Request owned by requester
- Approval action owned by approver (upline)
- Created agency owned by requester

### Auth Boundaries
- Agents can only request for themselves
- Only direct upline can approve/reject
- Super admins can view all requests (admin oversight)

---

## Data Model & Schema Changes

### 1. Add `parent_agency_id` to `agencies` table

```sql
ALTER TABLE agencies
ADD COLUMN parent_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

CREATE INDEX idx_agencies_parent ON agencies(parent_agency_id);
```

### 2. New Table: `agency_requests`

```sql
CREATE TABLE agency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester (the agent wanting to become an agency)
  requester_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Approver (the agent's direct upline)
  approver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- IMO context (inherited from requester)
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Current agency (before becoming own agency)
  current_agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Proposed agency details
  proposed_name TEXT NOT NULL,
  proposed_code TEXT NOT NULL,
  proposed_description TEXT,

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  -- If approved, link to created agency
  created_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- Rejection reason (if rejected)
  rejection_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agency_requests_requester ON agency_requests(requester_id);
CREATE INDEX idx_agency_requests_approver ON agency_requests(approver_id);
CREATE INDEX idx_agency_requests_status ON agency_requests(status);
CREATE INDEX idx_agency_requests_imo ON agency_requests(imo_id);

-- Unique: only one pending request per user
CREATE UNIQUE INDEX idx_agency_requests_pending_unique
  ON agency_requests(requester_id)
  WHERE status = 'pending';
```

### 3. RLS Policies for `agency_requests`

```sql
-- Enable RLS
ALTER TABLE agency_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view their own requests
CREATE POLICY "Requesters can view own requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Approvers can view requests they need to approve
CREATE POLICY "Approvers can view pending requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (approver_id = auth.uid());

-- Agents can create requests (self only)
CREATE POLICY "Agents can create own requests" ON agency_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Requesters can cancel their pending requests
CREATE POLICY "Requesters can cancel pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Approvers can approve/reject pending requests
CREATE POLICY "Approvers can review pending requests" ON agency_requests
  FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (status IN ('approved', 'rejected'));

-- Super admins can view all requests
CREATE POLICY "Super admins can view all requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- IMO admins can view requests in their IMO
CREATE POLICY "IMO admins can view IMO requests" ON agency_requests
  FOR SELECT TO authenticated
  USING (imo_id = get_my_imo_id() AND is_imo_admin());
```

### 4. Approval Function (Database-level transaction)

```sql
CREATE OR REPLACE FUNCTION approve_agency_request(
  p_request_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_new_agency_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  -- Get and lock the request
  SELECT * INTO v_request
  FROM agency_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  IF v_request.approver_id != v_current_user_id THEN
    RAISE EXCEPTION 'Not authorized to approve this request';
  END IF;

  -- Create the new agency
  INSERT INTO agencies (
    imo_id,
    name,
    code,
    description,
    owner_id,
    parent_agency_id,
    is_active
  ) VALUES (
    v_request.imo_id,
    v_request.proposed_name,
    v_request.proposed_code,
    v_request.proposed_description,
    v_request.requester_id,
    v_request.current_agency_id,
    true
  ) RETURNING id INTO v_new_agency_id;

  -- Update the requester's agency_id to their new agency
  UPDATE user_profiles
  SET agency_id = v_new_agency_id
  WHERE id = v_request.requester_id;

  -- Move all downline agents to the new agency
  -- (agents whose upline chain includes the requester)
  UPDATE user_profiles
  SET agency_id = v_new_agency_id
  WHERE hierarchy_path LIKE '%' || v_request.requester_id::text || '%'
    AND id != v_request.requester_id;

  -- Add agency_owner role to the requester
  UPDATE user_profiles
  SET roles = array_append(
    COALESCE(roles, ARRAY[]::text[]),
    'agency_owner'
  )
  WHERE id = v_request.requester_id
    AND NOT ('agency_owner' = ANY(COALESCE(roles, ARRAY[]::text[])));

  -- Update the request as approved
  UPDATE agency_requests
  SET
    status = 'approved',
    created_agency_id = v_new_agency_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN v_new_agency_id;
END;
$$;
```

---

## API & Data Flow Design

### AgencyRequestRepository

```typescript
// src/services/agency-request/AgencyRequestRepository.ts

interface AgencyRequestRow {
  id: string;
  requester_id: string;
  approver_id: string;
  imo_id: string;
  current_agency_id: string;
  proposed_name: string;
  proposed_code: string;
  proposed_description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_agency_id: string | null;
  rejection_reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

class AgencyRequestRepository {
  // CRUD operations
  async create(data: AgencyRequestInsert): Promise<AgencyRequestRow>;
  async findById(id: string): Promise<AgencyRequestRow | null>;
  async findByRequester(requesterId: string): Promise<AgencyRequestRow[]>;
  async findPendingForApprover(approverId: string): Promise<AgencyRequestRow[]>;
  async findByImo(imoId: string): Promise<AgencyRequestRow[]>;

  // Status updates
  async cancel(id: string): Promise<AgencyRequestRow>;
  async reject(id: string, reason: string): Promise<AgencyRequestRow>;

  // Approval via RPC
  async approve(id: string): Promise<string>; // Returns new agency ID
}
```

### AgencyRequestService

```typescript
// src/services/agency-request/AgencyRequestService.ts

class AgencyRequestService {
  // Request creation
  async createRequest(data: {
    proposed_name: string;
    proposed_code: string;
    proposed_description?: string;
  }): Promise<AgencyRequestRow>;
  // - Validates user has an upline
  // - Validates no pending request exists
  // - Validates code is available
  // - Sets approver_id = user's upline_id

  // Request management
  async getMyRequests(): Promise<AgencyRequestRow[]>;
  async getPendingRequestsToApprove(): Promise<AgencyRequestRow[]>;
  async cancelRequest(requestId: string): Promise<void>;

  // Approval flow
  async approveRequest(requestId: string): Promise<Agency>;
  async rejectRequest(requestId: string, reason: string): Promise<void>;
}
```

---

## Frontend Integration Plan

### React Query Hooks

```typescript
// src/hooks/agency-request/useAgencyRequestQueries.ts

// Queries
useMyAgencyRequests()
usePendingRequestsToApprove()
useAgencyRequest(requestId)

// Mutations
useCreateAgencyRequest()
useCancelAgencyRequest()
useApproveAgencyRequest()
useRejectAgencyRequest()
```

### Cache Strategy
- `['agency-requests', 'my']` - Current user's requests
- `['agency-requests', 'pending']` - Pending requests for approval
- `['agency-requests', requestId]` - Single request
- `['agencies']` - Invalidate on approval (new agency created)
- `['user-profiles']` - Invalidate on approval (roles updated)

### UI Components

1. **RequestAgencyForm** - Agent submits request
   - Location: Settings > My Agency > Request Status
   - Fields: name, code, description
   - Validation: code uniqueness check

2. **MyAgencyRequestStatus** - Agent views their request
   - Shows: pending/approved/rejected status
   - Actions: Cancel (if pending)

3. **PendingApprovalsList** - Upline sees requests to approve
   - Location: Settings > Approvals (or sidebar badge)
   - Shows: requester name, proposed agency details
   - Actions: Approve, Reject (with reason)

4. **ApprovalDialog** - Confirmation before approve/reject

---

## Implementation Steps

### Phase 1: Database (Migration)
1. Create migration file `20251221_002_agency_requests.sql`
2. Add `parent_agency_id` to agencies
3. Create `agency_requests` table
4. Add RLS policies
5. Create `approve_agency_request` function
6. Apply migration
7. Regenerate types

### Phase 2: Backend Services
1. Create `src/types/agency-request.types.ts`
2. Create `src/services/agency-request/AgencyRequestRepository.ts`
3. Create `src/services/agency-request/AgencyRequestService.ts`
4. Add to service index exports

### Phase 3: React Query Hooks
1. Create `src/hooks/agency-request/useAgencyRequestQueries.ts`
2. Create `src/hooks/agency-request/useAgencyRequestMutations.ts`
3. Add to hooks index exports

### Phase 4: UI Components
1. Create `src/features/settings/agency-request/` directory
2. Build `RequestAgencyForm.tsx`
3. Build `MyAgencyRequestStatus.tsx`
4. Build `PendingApprovalsList.tsx`
5. Build `ApprovalDialog.tsx`
6. Add to Settings routes

### Phase 5: Integration
1. Add "Pending Approvals" badge to sidebar (if any pending)
2. Update agency display to show parent relationship
3. Test full workflow

---

## Test Plan

### Unit Tests
- AgencyRequestService.createRequest validation
- AgencyRequestService role/permission checks
- Code availability validation

### Integration Tests
- Full request → approval → agency creation flow
- Downline agent reassignment verification
- Role addition to new agency owner

### Edge Cases
- Agent with no upline cannot request
- Agent with pending request cannot create another
- Duplicate agency code rejection
- Approver tries to approve already-approved request
- Requester cancels then re-requests
- Super admin oversight visibility

### Security Tests
- Non-upline cannot approve/reject
- Non-requester cannot cancel
- RLS policy verification

---

## Risk & Failure Analysis

### Data Corruption Risks
- **Downline reassignment partial failure**: Mitigated by database transaction
- **Role not added**: Mitigated by transaction rollback

### Security Risks
- **Unauthorized approval**: RLS + function check on approver_id
- **Code collision**: Unique constraint on (imo_id, code)

### Race Conditions
- **Concurrent approval**: FOR UPDATE lock in function
- **Concurrent code check**: Unique index handles collision

### Rollback Strategy
- Migration is additive (new column, new table)
- No destructive changes to existing data
- Can drop table/column if needed

---

## Final Implementation Checklist

- [ ] Migration: Add parent_agency_id to agencies
- [ ] Migration: Create agency_requests table
- [ ] Migration: RLS policies
- [ ] Migration: approve_agency_request function
- [ ] Migration: Apply and regenerate types
- [ ] Types: agency-request.types.ts
- [ ] Repository: AgencyRequestRepository.ts
- [ ] Service: AgencyRequestService.ts
- [ ] Hooks: useAgencyRequestQueries.ts
- [ ] Hooks: useAgencyRequestMutations.ts
- [ ] UI: RequestAgencyForm.tsx
- [ ] UI: MyAgencyRequestStatus.tsx
- [ ] UI: PendingApprovalsList.tsx
- [ ] UI: ApprovalDialog.tsx
- [ ] Routes: Add to settings routes
- [ ] Sidebar: Pending approvals badge
- [ ] Tests: Service layer tests
- [ ] Tests: Full workflow test
- [ ] Build: npm run build passes
- [ ] Verify: UI renders without errors
