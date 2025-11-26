# Recruiting Pipeline Implementation - IN PROGRESS

## Current Status: Phase 1 Database Schema - 80% Complete

**Date Started:** Nov 26, 2025
**Current Progress:** Creating database migrations for configurable pipeline system

---

## ✅ COMPLETED (Last 30 minutes)

### Database Migrations Created:
1. ✅ `20251126222255_create_pipeline_templates.sql` - Template system for multiple pipeline configurations
2. ✅ `20251126222339_create_pipeline_phases.sql` - Configurable phases (replaces hardcoded enum)
3. ✅ `20251126222410_create_phase_checklist_items.sql` - Task/document/approval items per phase
4. ✅ `20251126222444_create_recruit_phase_progress.sql` - Track which phase each recruit is in

### Key Architectural Decisions Made:
- ✅ Replaced hardcoded `phase_name` enum with database-driven configuration
- ✅ Template versioning - recruits lock to template version when they start
- ✅ 6 checklist item types: document_upload, task_completion, training_module, manual_approval, automated_check, signature_required
- ✅ Auto-advancement configurable per phase
- ✅ RLS policies for security (uplines can only see their recruits)

---

## 🔧 REMAINING TASKS

### Immediate Next Steps (to complete Phase 1 database):

**1. Create `recruit_checklist_progress` migration**
   - Tracks completion status of individual checklist items per recruit
   - Fields: user_id, checklist_item_id, status (not_started/in_progress/completed/approved/rejected/needs_resubmission), completed_at, completed_by, verified_at, verified_by, rejection_reason, document_id, notes, metadata
   - Status workflow: not_started → in_progress → completed → (if verification required) → approved/rejected
   - Links to user_documents table for document_upload type items

**2. Create seed migration for default template**
   - Create default pipeline template: "Standard Agent Onboarding"
   - Create 8 phases:
     1. Initial Contact (manual approval, estimated 2 days)
     2. Application (auto-advance, estimated 5 days)
     3. Background Check (auto-advance, estimated 7 days)
     4. Pre-Licensing (manual approval, estimated 10 days)
     5. Exam (manual approval, estimated 21 days)
     6. State License (manual approval, estimated 14 days)
     7. Contracting (manual approval, estimated 7 days)
     8. Complete (auto, estimated 0 days)
   - Add checklist items for each phase (see detailed list below)

**3. Create trigger to auto-create phase progress when recruit is added**
   - When user_profile with `onboarding_status='lead'` is created
   - Get default template (where `is_default=true`)
   - Create recruit_phase_progress records for all phases in that template
   - Set first phase to `status='in_progress'`, rest to `'not_started'`
   - Create recruit_checklist_progress records for all checklist items

**4. Drop old `onboarding_phases` table**
   - No longer needed - replaced by `recruit_phase_progress` + `pipeline_phases`
   - Was never pushed to production, so safe to drop

---

## 📋 Default Checklist Items (Need to Seed)

### Phase 1: Initial Contact
- Phone screening completed (manual_approval, upline, required)
- Interest form submitted (task_completion, recruit, required)

### Phase 2: Application
- Application form (document_upload, application, recruit, required, needs verification by upline)
- Resume (document_upload, resume, recruit, required, needs verification by upline)
- References (document_upload, other, recruit, optional)

### Phase 3: Background Check
- Background check authorization signed (signature_required, recruit, required)
- Background check fee paid (task_completion, recruit, required, upload receipt)
- Background check passed (manual_approval, upline, required)

### Phase 4: Pre-Licensing
- Pre-licensing course enrollment (task_completion, recruit, required)
- Pre-licensing course completed (training_module, recruit, required, external_link)
- Pre-licensing exam passed (manual_approval, upline, required)

### Phase 5: Exam
- State exam scheduled (task_completion, recruit, required)
- State exam passed (manual_approval, upline, required)
- Exam results uploaded (document_upload, certification, recruit, required)

### Phase 6: State License
- State license application submitted (task_completion, recruit, required)
- State license fee paid (task_completion, recruit, required)
- State license approved (manual_approval, upline, required)
- License number entered (task_completion, recruit, required)

### Phase 7: Contracting
- Carrier contracts submitted (document_upload, contract, recruit, required, needs verification)
- E&O insurance obtained (document_upload, certification, recruit, required)
- Commission structure agreed (manual_approval, upline, required)
- Onboarding paperwork complete (manual_approval, upline, required)

### Phase 8: Complete
- (No checklist items - just marks completion)

---

## 🏗️ Frontend Work (After Database Complete)

### Services Layer:
1. `src/services/recruiting/pipelineService.ts` - CRUD for templates, phases, checklist items
2. Update `src/services/recruiting/recruitingService.ts` - query user_profiles with `onboarding_status='lead'`
3. `src/services/recruiting/checklistService.ts` - manage recruit progress through checklist

### TanStack Query Hooks:
1. `useTemplates()` - fetch all pipeline templates
2. `useTemplate(id)` - fetch single template with phases + checklist items
3. `useRecruits()` - UPDATE to query user_profiles, not recruiting_profiles
4. `useRecruitPhaseProgress(userId)` - fetch recruit's progress through all phases
5. `useRecruitChecklistProgress(userId, phaseId)` - fetch checklist progress for current phase
6. Mutations: `useUpdatePhaseProgress`, `useUpdateChecklistProgress`, `useApproveDocument`

### Components (Master-Detail UI):
1. `RecruitMasterDetail.tsx` - 2-column layout container
2. `RecruitListTable.tsx` - left panel, compact table, filtering/sorting
3. `RecruitDetailPanel.tsx` - right panel, selected recruit details
4. `PhaseTimeline.tsx` - visual progress bar through 8 phases
5. `PhaseChecklist.tsx` - current phase checklist with item statuses
6. UPDATE `AddRecruitDialog.tsx` - create user_profile with onboarding fields

---

## 🗂️ Files to Delete (Clean Up Old Kanban)

- `src/features/recruiting/RecruitingDashboard.tsx` (Kanban board)
- `src/features/recruiting/components/RecruitCard.tsx` (Kanban cards)
- Remove `@dnd-kit` from package.json
- Drop old `onboarding_phases` migration (20251126205833)

---

## 📦 Context Reached - Continuation Prompt

**To continue from here, copy/paste this prompt into a new conversation:**

```
I'm implementing the recruiting pipeline system redesign. I've completed 80% of the database schema migrations.

**What's Done:**
- ✅ pipeline_templates table (configurable templates)
- ✅ pipeline_phases table (configurable phases, no hardcoded enum)
- ✅ phase_checklist_items table (6 item types)
- ✅ recruit_phase_progress table (track phase per recruit)

**What's Left for Phase 1 Database:**
1. Create recruit_checklist_progress migration
2. Create seed migration for default template + 8 phases + checklist items
3. Create trigger to auto-create progress when recruit added
4. Drop old onboarding_phases table
5. Test with `npx supabase db reset`

**Then Phase 1 Frontend:**
1. Create services (pipelineService, update recruitingService, checklistService)
2. Create hooks (useTemplates, useRecruits, usePhaseProgress, useChecklistProgress)
3. Build master-detail UI components (see docs/RECRUITING_IMPLEMENTATION_IN_PROGRESS.md)
4. Delete old Kanban components

**Reference docs:**
- /docs/RECRUITING_SYSTEM_REDESIGN.md - full design spec
- /plans/active/RECRUITING_PIPELINE_IMPLEMENTATION.md - phased implementation plan
- /docs/RECRUITING_IMPLEMENTATION_IN_PROGRESS.md - current progress (this file)

Please continue from step 1: Create the recruit_checklist_progress migration.
```

---

## 🔗 Related Files

- Design Spec: `/docs/RECRUITING_SYSTEM_REDESIGN.md`
- Implementation Plan: `/plans/active/RECRUITING_PIPELINE_IMPLEMENTATION.md`
- Memory: `.serena/memories/recruiting_pipeline_redesign_nov2025`

---

**Next Session:** Create recruit_checklist_progress migration + seed data
