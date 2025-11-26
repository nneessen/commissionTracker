# Recruiting Pipeline System - Continuation Prompt

**USE THIS PROMPT TO CONTINUE IN A NEW CONVERSATION**

Copy/paste everything below the line into a new Claude Code conversation:

---

I'm building a production-grade recruiting pipeline system to replace an inefficient Kanban board. The database schema is 100% complete. Now I need to build the frontend (services, hooks, and master-detail UI).

## ✅ What's Complete - Phase 1 Database (100%)

### Database Migrations Created (6 files):
1. `20251126222255_create_pipeline_templates.sql` - Template system
2. `20251126222339_create_pipeline_phases.sql` - Configurable phases
3. `20251126222410_create_phase_checklist_items.sql` - 6 checklist item types
4. `20251126222444_create_recruit_phase_progress.sql` - Track recruit's phase
5. `20251126224011_create_recruit_checklist_progress.sql` - Track item completion
6. `20251126224052_seed_default_pipeline_template.sql` - Default template + 8 phases + 22 items

### Schema Summary:
```
pipeline_templates (configurable templates)
  └─ pipeline_phases (8 phases: Initial Contact → ... → Complete)
      └─ phase_checklist_items (22 items: documents, tasks, approvals, training, signatures)

recruit_phase_progress (which phase is each recruit in?)
recruit_checklist_progress (which items has recruit completed?)
  └─ links to user_documents (for document uploads)
```

### Key Features Implemented:
- **Configurable everything** - No hardcoded enums, all in database
- **Template versioning** - Recruits lock to template version when they start
- **Auto-advancement** - Some phases auto-complete, others need manual approval
- **6 checklist types**: document_upload, task_completion, training_module, manual_approval, automated_check, signature_required
- **RLS security** - Uplines can only see their recruits
- **Default template seeded** - 8 phases, 22 checklist items ready to use

---

## 🎯 What to Build Next - Phase 1 Frontend

### Task 1: Create Service Layers

**File:** `src/services/recruiting/pipelineService.ts`
```typescript
// CRUD operations for pipeline templates, phases, and checklist items
// Functions needed:
// - getTemplates(): fetch all templates
// - getTemplate(id): fetch single template with phases + checklist items (deep fetch)
// - createTemplate(data): create new template
// - updateTemplate(id, data): update template
// - deleteTemplate(id): delete template
// - createPhase(templateId, data): add phase to template
// - updatePhase(phaseId, data): update phase
// - deletePhase(phaseId): delete phase
// - createChecklistItem(phaseId, data): add item to phase
// - updateChecklistItem(itemId, data): update item
// - deleteChecklistItem(itemId): delete item
```

**File:** Update `src/services/recruiting/recruitingService.ts`
```typescript
// CHANGE: Query user_profiles table (NOT recruiting_profiles)
// Filter: .in('onboarding_status', ['lead', 'active'])
// Join with recruiter: .select('*, recruiter:recruiter_id(id, email, first_name, last_name)')
// Functions to update:
// - getRecruits(filters?) → query user_profiles
// - getRecruit(userId) → query user_profiles
// - createRecruit(data) → insert into user_profiles with onboarding_status='lead'
// - updateRecruit(userId, data) → update user_profiles
```

**File:** `src/services/recruiting/checklistService.ts`
```typescript
// Manage recruit progress through checklist
// Functions needed:
// - getRecruitPhaseProgress(userId): fetch all phase progress for recruit
// - getCurrentPhase(userId): get recruit's current in_progress phase
// - getChecklistProgress(userId, phaseId): fetch checklist item progress for phase
// - updateChecklistItemStatus(userId, itemId, status, metadata?): mark item complete/approved/rejected
// - advanceToNextPhase(userId, currentPhaseId): move recruit to next phase
// - blockPhase(userId, phaseId, reason): mark phase as blocked
// - approveDocument(documentId, approverId): approve uploaded document + update linked checklist item
// - rejectDocument(documentId, approverId, reason): reject doc + set checklist to needs_resubmission
```

### Task 2: Create TanStack Query Hooks

**File:** `src/features/recruiting/hooks/usePipeline.ts`
```typescript
// Hooks for templates/phases/checklist items
export function useTemplates() // fetch all templates
export function useTemplate(id) // fetch single template with phases + items
export function useCreateTemplate() // mutation
export function useUpdateTemplate() // mutation
export function useDeleteTemplate() // mutation
```

**File:** Update `src/features/recruiting/hooks/useRecruits.ts`
```typescript
// CHANGE: Query user_profiles, not recruiting_profiles
// Keep same function signatures, just update internal queries
export function useRecruits(filters?) // fetch user_profiles with onboarding_status filter
export function useRecruit(userId) // fetch single user_profile
export function useCreateRecruit() // mutation - creates user_profile
export function useUpdateRecruit() // mutation
```

**File:** `src/features/recruiting/hooks/useRecruitProgress.ts`
```typescript
// NEW FILE - Track recruit's progress through pipeline
export function useRecruitPhaseProgress(userId) // fetch all phase progress
export function useCurrentPhase(userId) // fetch current in_progress phase
export function useChecklistProgress(userId, phaseId) // fetch checklist item progress
export function useUpdateChecklistItem() // mutation - mark item complete
export function useAdvancePhase() // mutation - move to next phase
export function useApproveDocument() // mutation - approve doc + update checklist
export function useRejectDocument() // mutation - reject doc
```

### Task 3: Build Master-Detail UI Components

**File:** `src/features/recruiting/RecruitingDashboard.tsx`
```typescript
// REPLACE entire file - no more Kanban
// New layout: 2-column master-detail
// Left: RecruitListTable (compact, 20+ recruits visible)
// Right: RecruitDetailPanel (selected recruit details)
```

**File:** `src/features/recruiting/components/RecruitListTable.tsx`
```typescript
// NEW FILE - Left panel
// Compact table showing all recruits:
// Columns: Status (🟢/🟡/🔴), Name, Current Phase, Days in Phase, Last Activity
// Features: Click row → select recruit, Filter by phase/status, Sort by name/phase/days
// Color coding: 🟢 on-track, 🟡 needs attention (>1.5x estimated days), 🔴 blocked
```

**File:** `src/features/recruiting/components/RecruitDetailPanel.tsx`
```typescript
// NEW FILE - Right panel
// Shows selected recruit's details:
// - PhaseTimeline component (visual progress bar)
// - Current phase name + status
// - PhaseChecklist component (checklist items for current phase)
// - Tabs: Documents, Emails, Activity Log
// - Quick actions: Send Email, Add Note, Advance Phase, Mark Blocked
```

**File:** `src/features/recruiting/components/PhaseTimeline.tsx`
```typescript
// NEW FILE - Visual progress indicator
// Shows all 8 phases in horizontal timeline
// ✅ completed (green), 🟡 in_progress (yellow), ⚪ not_started (gray), 🔴 blocked (red)
// Click phase → show details
// Progress percentage: "3 of 8 phases complete (38%)"
```

**File:** `src/features/recruiting/components/PhaseChecklist.tsx`
```typescript
// NEW FILE - Checklist for current phase
// List of checklist items with status icons:
// ✅ approved (green), 🟡 pending approval (yellow), ⚪ not started (gray), ❌ rejected (red)
// Each item shows: name, description, status, action button
// Action button varies by item type:
// - document_upload: [Upload] or [View] + [Approve]/[Reject] (if upline)
// - task_completion: [Mark Complete] (if recruit)
// - manual_approval: [Approve] (if upline)
// - training_module: [View Training] + [Mark Complete]
```

**File:** Update `src/features/recruiting/components/AddRecruitDialog.tsx`
```typescript
// UPDATE: Change mutation to create user_profile (not recruiting_profile)
// Set: onboarding_status='lead', current_onboarding_phase='Initial Contact'
// Form fields: first_name, last_name, email, phone, referral_source
```

### Task 4: Update Types

**File:** Update `src/types/recruiting.ts`
```typescript
// Update to match new database schema
export interface PipelineTemplate {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelinePhase {
  id: string;
  template_id: string;
  phase_name: string;
  phase_description?: string;
  phase_order: number;
  estimated_days?: number;
  auto_advance: boolean;
  required_approver_role?: 'upline' | 'admin' | 'system';
  is_active: boolean;
}

export interface PhaseChecklistItem {
  id: string;
  phase_id: string;
  item_type: 'document_upload' | 'task_completion' | 'training_module' | 'manual_approval' | 'automated_check' | 'signature_required';
  item_name: string;
  item_description?: string;
  item_order: number;
  is_required: boolean;
  can_be_completed_by: 'recruit' | 'upline' | 'system';
  requires_verification: boolean;
  verification_by?: 'upline' | 'system';
  external_link?: string;
  document_type?: string;
  metadata?: Record<string, any>;
}

export interface RecruitPhaseProgress {
  id: string;
  user_id: string;
  phase_id: string;
  template_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  started_at?: string;
  completed_at?: string;
  blocked_reason?: string;
  notes?: string;
}

export interface RecruitChecklistProgress {
  id: string;
  user_id: string;
  checklist_item_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'approved' | 'rejected' | 'needs_resubmission';
  completed_at?: string;
  completed_by?: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  document_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// Extend UserProfile with onboarding fields (already exists in user_profiles table)
// No changes needed to UserProfile type - fields already added in earlier migration
```

### Task 5: Delete Old Code

**Files to DELETE:**
- `src/features/recruiting/RecruitingDashboard.tsx` (old Kanban version - will be replaced)
- `src/features/recruiting/components/RecruitCard.tsx` (Kanban cards - no longer needed)

**Package.json:**
- Remove `@dnd-kit` dependencies (drag-and-drop not needed)

---

## 📁 Reference Files to Read

**Design Docs:**
- `/docs/RECRUITING_SYSTEM_REDESIGN.md` - Full architecture (500+ lines)
- `/plans/active/RECRUITING_PIPELINE_IMPLEMENTATION.md` - Implementation plan
- `/docs/RECRUITING_IMPLEMENTATION_IN_PROGRESS.md` - Progress tracker

**Existing Code to Reference:**
- `src/services/recruiting/recruitingService.ts` - Pattern to follow (UPDATE queries)
- `src/features/recruiting/hooks/useRecruits.ts` - Pattern to follow (UPDATE queries)
- `src/features/dashboard/components/DetailedKPIGrid_List.tsx` - Compact table example
- `src/features/hierarchy/components/AgentDetailModal.tsx` - Detail panel example

**Database Migrations:**
- All in `supabase/migrations/` starting with `20251126222...`

---

## 🎯 Start Here

**Step 1:** Create `src/services/recruiting/pipelineService.ts` with CRUD operations for templates/phases/checklist items

**Step 2:** Update `src/services/recruiting/recruitingService.ts` to query `user_profiles` instead of `recruiting_profiles`

**Step 3:** Create `src/services/recruiting/checklistService.ts` with functions to manage recruit progress

**Step 4:** Create TanStack Query hooks in `src/features/recruiting/hooks/`

**Step 5:** Build master-detail UI components starting with `RecruitingDashboard.tsx`

**Step 6:** Delete old Kanban code

---

## 🔑 Key Principles

1. **Query user_profiles, NOT recruiting_profiles** - Recruits are users with `onboarding_status='lead'`
2. **Use existing user_documents table** - Link via `document_id` in recruit_checklist_progress
3. **Color-coded status everywhere** - 🟢 on-track, 🟡 needs attention, 🔴 blocked
4. **Master-detail layout** - See many recruits at once, deep dive on selected recruit
5. **Follow existing patterns** - Use TanStack Query/Form, shadcn components, service layer pattern

---

## ✅ Expected Outcome

After completing frontend work, users should be able to:
- See 20+ recruits in compact table view
- Click recruit → see detailed phase timeline + checklist
- Filter recruits by phase, status, upline
- Sort by name, phase, days in phase
- Mark checklist items complete
- Upload documents linked to checklist items
- Approve/reject documents (uplines only)
- Manually advance recruits to next phase
- Mark recruits as blocked with reason

---

**Now start with Task 1: Create pipelineService.ts**
