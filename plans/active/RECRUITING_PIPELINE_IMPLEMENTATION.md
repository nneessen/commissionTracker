# Recruiting Pipeline System - Implementation Plan

## Overview

Transform recruiting system from **basic Kanban board** → **production-grade recruiting operations platform**

---

## Visual Comparison: Before vs After

### BEFORE (Kanban - Inefficient)
```
┌────────────┬────────────┬────────────┬────────────┬────────────┬────────────┐
│ Contact    │ Application│Background  │Pre-License │ Exam       │ License    │
│            │            │            │            │            │            │
│ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │            │            │            │
│ │John    │ │ │Sarah   │ │ │Mike    │ │            │            │            │
│ │Smith   │ │ │Johnson │ │ │Davis   │ │            │            │            │
│ └────────┘ │ └────────┘ │ └────────┘ │            │            │            │
│            │            │            │            │            │            │
│ ┌────────┐ │ ┌────────┐ │            │            │            │            │
│ │Lisa    │ │ │Tom     │ │            │            │            │            │
│ │Wong    │ │ │Brown   │ │            │            │            │            │
│ └────────┘ │ └────────┘ │            │            │            │            │
│            │            │            │            │            │            │
│ ┌────────┐ │            │            │            │            │            │
│ │Amy     │ │            │            │            │            │            │
│ │Chen    │ │            │            │            │            │            │
│ └────────┘ │            │            │            │            │            │
│            │            │            │            │            │            │
│   (only 3  │  (only 2   │  (only 1   │  (empty)   │  (empty)   │  (empty)   │
│   visible) │   visible) │   visible) │            │            │            │
└────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘

PROBLEMS:
❌ Can only see 6 recruits total (3+2+1)
❌ Wasted space in empty columns
❌ No task/checklist visibility
❌ No document management
❌ No notifications
❌ Can't customize phases
❌ No analytics
```

### AFTER (Master-Detail - Efficient)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Recruiting Pipeline                                      [+ Add Recruit]    │
│ Filters: [All Phases▼] [All Status▼] [Search: john]     Sort: Phase▼       │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ RECRUIT LIST (20+)   │ DETAIL: John Smith                                   │
│                      │                                                       │
│ 🟢 John Smith        │ Progress: ████████░░░░░░░░ 38% (Phase 3/8)          │
│  └ Initial Contact   │                                                       │
│     2 days           │ ┌──────────────── PHASE TIMELINE ──────────────────┐ │
│                      │ │ ✅ 1. Initial Contact (completed in 2 days)      │ │
│ 🟡 Sarah Johnson ⚠️  │ │ ✅ 2. Application (completed in 5 days)          │ │
│  └ Background Check  │ │ 🟡 3. Background Check (in progress, day 3)      │ │
│     8 days STUCK     │ │ ⚪ 4. Pre-Licensing                               │ │
│                      │ │ ⚪ 5. Exam                                         │ │
│ 🔴 Mike Davis        │ │ ⚪ 6. State License                                │ │
│  └ Pre-Licensing     │ │ ⚪ 7. Contracting                                  │ │
│     BLOCKED          │ │ ⚪ 8. Complete                                     │ │
│                      │ └───────────────────────────────────────────────────┘ │
│ 🟢 Lisa Wong         │                                                       │
│  └ Application       │ ┌───────── CURRENT PHASE: BACKGROUND CHECK ────────┐ │
│     1 day            │ │ ✅ Submit application form                        │ │
│                      │ │    Completed 2 days ago by recruit                │ │
│ 🟢 Tom Brown         │ │                                                   │ │
│  └ Application       │ │ ✅ Upload resume                                  │ │
│     3 days           │ │    Completed 2 days ago by recruit                │ │
│                      │ │                                                   │ │
│ 🟢 Amy Chen          │ │ 🟡 Background check authorization (PENDING)       │ │
│  └ Initial Contact   │ │    ⏳ Waiting for your approval                   │ │
│     1 day            │ │    [✓ Approve] [✗ Reject]                         │ │
│                      │ │                                                   │ │
│ 🟢 David Lee         │ │ ⚪ Pay background check fee ($50)                 │ │
│  └ Exam              │ │    Not started                                    │ │
│     5 days           │ └───────────────────────────────────────────────────┘ │
│                      │                                                       │
│ ... (14 more)        │ [Documents (3)] [Emails (7)] [Activity (24)]         │
│                      │                                                       │
│ Showing 21 of 42     │ 📋 Quick Actions:                                    │
│                      │ [📧 Send Email] [📝 Add Note] [➡️ Advance Phase]    │
└──────────────────────┴──────────────────────────────────────────────────────┘

BENEFITS:
✅ See 20+ recruits at once (vs 6)
✅ Color-coded status (green/yellow/red)
✅ Detailed checklist for current phase
✅ Document approval workflow
✅ Quick actions on selected recruit
✅ Filtering/sorting/search
✅ Analytics (not shown: separate dashboard)
```

---

## Implementation Phases

### ✅ PHASE 0: Foundation (ALREADY DONE)
**Status:** Complete - migrations created but need redesign

**What Exists:**
- ✅ user_profiles table with onboarding fields
- ✅ user_documents table
- ✅ user_emails table
- ✅ user_activity_log table
- ✅ onboarding_phases table (⚠️ needs redesign - currently has hardcoded enum)

**What Needs Fixing:**
- ❌ onboarding_phases has hardcoded phase_name enum → needs to be configurable
- ❌ Missing: pipeline_templates, pipeline_phases, phase_checklist_items, recruit_phase_progress, recruit_checklist_progress

---

### 🎯 PHASE 1: Core Foundation (Week 1-2)
**Goal:** Get basic master-detail UI working with manual phase management

#### Database Work
1. **Redesign onboarding system to be configurable**
   - Create `pipeline_templates` table
   - Create `pipeline_phases` table (replaces hardcoded enum)
   - Create `phase_checklist_items` table
   - Create `recruit_phase_progress` table
   - Create `recruit_checklist_progress` table
   - Create default template with 8 phases
   - Seed checklist items for each phase

2. **Migration strategy**
   - Keep existing user_profiles, user_documents, user_emails, user_activity_log
   - Drop old `onboarding_phases` table (was never pushed to production)
   - Create new configurable schema

#### Backend Services
3. **Create/update services**
   - `pipelineService.ts` - CRUD for templates, phases, checklist items
   - Update `recruitingService.ts` - query user_profiles with onboarding_status filter
   - `checklistService.ts` - manage recruit progress through checklist items

#### Frontend - Components
4. **Master-detail layout**
   - `RecruitMasterDetail.tsx` - main container with 2-column layout
   - `RecruitListTable.tsx` - left panel, compact table of recruits
     - Columns: Status, Name, Current Phase, Days in Phase, Last Activity
     - Color-coded status indicators
     - Sortable/filterable
     - Click row → load detail panel
   - `RecruitDetailPanel.tsx` - right panel, selected recruit details
     - Phase timeline component
     - Current phase checklist
     - Quick action buttons

5. **Supporting components**
   - `PhaseTimeline.tsx` - visual progress through 8 phases
   - `PhaseChecklist.tsx` - list of checklist items with completion status
   - `AddRecruitDialog.tsx` - update to create user_profile with onboarding fields

#### Frontend - Hooks
6. **TanStack Query hooks**
   - Update `useRecruits.ts` - query user_profiles table, filter by onboarding_status
   - Update `useRecruitMutations.ts` - create/update user_profiles
   - Create `usePhaseProgress.ts` - track recruit progress through phases
   - Create `useChecklistProgress.ts` - track checklist item completion

#### Testing
7. **Manual testing checklist**
   - [ ] Create new recruit → verify default template assigned
   - [ ] Verify 8 phases auto-created in recruit_phase_progress
   - [ ] View recruit in master-detail layout
   - [ ] Manually advance recruit to next phase
   - [ ] Mark checklist item as complete
   - [ ] Upload document, link to checklist item
   - [ ] Filter recruits by phase
   - [ ] Sort recruits by days in phase

**Deliverable:** Working master-detail UI with manual phase management

---

### 🎯 PHASE 2: Automation & Notifications (Week 3)
**Goal:** Intelligent system with auto-advancement and real-time notifications

#### Database Work
8. **Add notification system**
   - Create `notifications` table
   - Create `notification_preferences` table
   - Add database triggers:
     - `notify_on_checklist_completion` - when recruit completes item
     - `notify_on_document_upload` - when recruit uploads document
     - `notify_on_phase_completion` - when phase is completed

9. **Add business logic triggers**
   - `auto_advance_phase` - when all required checklist items complete
   - `check_phase_completion` - called after each checklist item update

#### Backend Services
10. **Notification service**
    - `notificationService.ts` - create, read, mark as read
    - `checkPhaseCompletion()` - check if all required items done
    - `advanceToNextPhase()` - move recruit to next phase
    - `createNotification()` - create notification record

11. **Scheduled jobs** (Supabase Edge Functions + pg_cron)
    - `detectStuckRecruits.ts` - run daily, find recruits stuck > expected duration
    - `documentExpirationCheck.ts` - run daily, alert on expiring documents

#### Frontend - Components
12. **Notification UI**
    - `NotificationBell.tsx` - bell icon with unread count badge
    - `NotificationDropdown.tsx` - list of recent notifications
    - `NotificationItem.tsx` - individual notification with link
    - Add notification bell to navbar

13. **Auto-advancement UI**
    - Update `PhaseChecklist.tsx` - show "Phase will auto-advance when all items complete"
    - Visual indicator when phase is ready for advancement
    - Override button for manual control

#### Frontend - Hooks
14. **Real-time subscriptions**
    - `useNotifications.ts` - subscribe to notification updates
    - Real-time badge count updates
    - Play sound/show toast on new notification

#### Testing
15. **Automation testing checklist**
    - [ ] Complete all required items in phase → verify auto-advance
    - [ ] Upload document → verify upline receives notification
    - [ ] Recruit stuck > threshold → verify stuck notification created
    - [ ] Mark notification as read → verify badge count updates
    - [ ] Click notification → verify navigation to correct page
    - [ ] Approve document → verify recruit receives notification

**Deliverable:** Self-managing system with notifications and auto-advancement

---

### 🎯 PHASE 3: Analytics & Pipeline Builder (Week 4)
**Goal:** Admin tools and insights dashboard

#### Frontend - Analytics Dashboard
16. **Analytics page** (`/recruiting/analytics`)
    - `RecruitingAnalytics.tsx` - main analytics page
    - `FunnelChart.tsx` - visual funnel showing dropoff by phase
    - `TimeMetricsTable.tsx` - avg time in each phase vs expected
    - `BottleneckDetection.tsx` - automated insights (which phases are slow, why)
    - KPI cards: Total recruits, avg completion time, completion rate
    - Filter by date range, upline, template

17. **Advanced filtering**
    - Update `RecruitListTable.tsx` filters:
      - Filter by phase (dropdown)
      - Filter by status (on-track / needs attention / blocked)
      - Filter by upline (for team leaders)
      - Filter by stuck recruits only
    - Saved filter presets (e.g., "My stuck recruits", "Needs approval")

#### Frontend - Pipeline Builder (Admin)
18. **Pipeline management UI** (`/recruiting/pipelines`)
    - `PipelineTemplates.tsx` - list all templates
    - `PipelineBuilder.tsx` - create/edit template
    - `PhaseEditor.tsx` - add/edit phases within template
    - `ChecklistItemEditor.tsx` - add/edit checklist items
    - Drag-and-drop phase reordering
    - Clone template functionality
    - Set default template

#### Backend Services
19. **Analytics service**
    - `analyticsService.ts` - calculate funnel, time metrics, bottlenecks
    - Materialized views for performance:
      - `mv_recruit_funnel` - recruit count by phase
      - `mv_phase_time_metrics` - avg time in each phase
    - Refresh materialized views nightly

#### Testing
20. **Analytics testing checklist**
    - [ ] Verify funnel chart shows correct counts
    - [ ] Verify time metrics calculate correctly
    - [ ] Verify bottleneck detection identifies slow phases
    - [ ] Create second template → assign recruits
    - [ ] Edit template → add new phase
    - [ ] Reorder phases via drag-and-drop
    - [ ] Export analytics to CSV

**Deliverable:** Full admin tools + data-driven insights

---

### 🎯 PHASE 4: Polish & Production (Week 5+)
**Goal:** Production-ready system with all features

#### Features
21. **Email notifications**
    - Email templates (HTML + plain text)
    - Email digest job (daily/weekly based on preferences)
    - Unsubscribe links
    - Email delivery tracking (sent, delivered, opened)

22. **Bulk actions**
    - Multi-select recruits in table
    - Bulk email compose dialog
    - Bulk phase advancement
    - Bulk template assignment

23. **Document management enhancements**
    - Document expiration tracking
    - Auto-alerts 30/15/7 days before expiration
    - Re-upload flow for expired documents
    - Document versioning (keep history of uploads)

24. **Recruit portal improvements**
    - FAQ section
    - Help resources (embedded videos, PDFs)
    - Progress celebration (confetti on phase completion)
    - Estimated time to completion

25. **Performance optimization**
    - Pagination on recruit list (20 per page)
    - Virtual scrolling for large lists
    - Lazy loading of detail panel
    - Debounced search/filter

26. **Mobile responsiveness**
    - Responsive table (collapses to cards on mobile)
    - Detail panel becomes modal on mobile
    - Touch-friendly UI elements
    - Mobile notification support

27. **Security & permissions**
    - RLS policies for pipeline_templates (only admins can edit)
    - Uplines can only see their recruits
    - Team leaders can see team's recruits (hierarchy-aware)
    - Audit log for all admin actions

28. **Error handling & validation**
    - Form validation with helpful error messages
    - Retry logic for failed operations
    - Graceful degradation if notifications fail
    - User-friendly error pages

#### Testing
29. **Production readiness checklist**
    - [ ] Load test with 100 recruits
    - [ ] Test on mobile devices (iOS, Android)
    - [ ] Test email delivery
    - [ ] Test bulk operations with 50 recruits
    - [ ] Security audit (RLS policies, SQL injection, XSS)
    - [ ] Performance audit (Lighthouse score >90)
    - [ ] Accessibility audit (WCAG AA compliance)
    - [ ] Browser testing (Chrome, Firefox, Safari, Edge)

**Deliverable:** Production-ready recruiting platform

---

## What to Delete / Keep / Rebuild

### ❌ DELETE (Not Needed Anymore)
- `src/features/recruiting/RecruitingDashboard.tsx` (Kanban board - scrap it)
- `src/features/recruiting/components/RecruitCard.tsx` (Kanban card - scrap it)
- `@dnd-kit` dependency (drag-and-drop for Kanban - remove from package.json)
- Old `onboarding_phases` migration (redesign with configurable schema)

### ✅ KEEP (Still Useful)
- `supabase/migrations/20251126205759_alter_user_profiles_add_onboarding.sql` - user_profiles extension
- `supabase/migrations/20251126205911_create_user_documents.sql` - user_documents table
- `supabase/migrations/20251126205947_create_user_emails.sql` - user_emails table
- `supabase/migrations/20251126210028_create_user_activity_log.sql` - activity log
- Route structure (`/recruiting` in router.tsx)
- Sidebar navigation link
- TanStack Query/Form patterns
- TypeScript types structure (update field names)

### 🔄 REBUILD (Update for New System)
- `src/features/recruiting/components/AddRecruitDialog.tsx` - keep form, update to create user_profile
- `src/services/recruiting/recruitingService.ts` - update queries for user_profiles table
- `src/types/recruiting.ts` - update to match new schema
- All hooks in `src/features/recruiting/hooks/` - update for new data structures

---

## Database Schema Summary

### New Tables (Phase 1)
```sql
pipeline_templates          -- Configurable pipeline templates
pipeline_phases             -- Phases within each template
phase_checklist_items       -- Tasks/docs/approvals per phase
recruit_phase_progress      -- Track which phase each recruit is in
recruit_checklist_progress  -- Track completion of individual items
```

### New Tables (Phase 2)
```sql
notifications               -- In-app + email notifications
notification_preferences    -- User preferences for notifications
```

### Existing Tables (Keep)
```sql
user_profiles              -- Extended with onboarding fields
user_documents             -- Document uploads
user_emails                -- Email communication history
user_activity_log          -- Audit trail
```

---

## Key Questions Before Starting

### 1. Default Pipeline Phases
Confirm these 8 phases are correct:
1. Initial Contact
2. Application
3. Background Check
4. Pre-Licensing
5. Exam
6. State License
7. Contracting
8. Complete

### 2. Checklist Items per Phase
For each phase, what are the typical tasks? Examples:

**Phase 1: Initial Contact**
- ☐ Phone screening completed (manual approval by upline)
- ☐ Interest form submitted (task by recruit)

**Phase 2: Application**
- ☐ Application form (document upload - required)
- ☐ Resume (document upload - required)
- ☐ References (document upload - optional)

**Phase 3: Background Check**
- ☐ Background check authorization signed (signature required)
- ☐ Background check fee paid ($50) (task + receipt upload)
- ☐ Background check passed (automated check or manual approval)

... (need details for phases 4-8)

### 3. Auto-Advancement Rules
Which phases should auto-advance vs require manual approval?

**My recommendations:**
- Auto: Application (when all docs uploaded)
- Auto: Background Check (when passed)
- Manual: Initial Contact (upline decides if recruit is qualified)
- Manual: Pre-Licensing (upline verifies completion)
- Manual: Exam (upline verifies pass)
- Manual: Contracting (upline approves contracts)

### 4. Stuck Thresholds
How long before "stuck" alert?

**My recommendations:**
- Initial Contact: 3 days
- Application: 7 days
- Background Check: 10 days
- Pre-Licensing: 14 days
- Exam: 21 days
- State License: 14 days
- Contracting: 7 days

### 5. Notification Priorities
Which notifications are most important?

**My recommendations (Priority 1 - must have):**
- Recruit uploads document → notify upline
- Recruit stuck > threshold → notify upline
- Upline approves/rejects → notify recruit
- Phase completed → notify both

**Priority 2 (nice to have):**
- Document expiring soon → notify both
- New recruit assigned → notify upline
- Checklist item completed → notify upline

---

## Success Criteria

**User can:**
- ✅ See 20+ recruits at once in compact table
- ✅ Click recruit → see detailed progress with checklist
- ✅ Filter by phase, status, upline
- ✅ Receive notifications when recruits complete items
- ✅ Approve/reject documents with one click
- ✅ Manually advance recruit to next phase
- ✅ See analytics: funnel, bottlenecks, time metrics
- ✅ Customize pipeline phases (admin)

**System can:**
- ✅ Auto-advance phase when all required items complete
- ✅ Detect stuck recruits and alert uplines
- ✅ Track document expiration and send reminders
- ✅ Log all actions for audit trail
- ✅ Handle 100+ recruits without performance issues

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 2 weeks | Working master-detail UI with manual management |
| Phase 2 | 1 week | Auto-advancement + notifications |
| Phase 3 | 1 week | Analytics + pipeline builder |
| Phase 4 | 2 weeks | Production polish + testing |
| **Total** | **6 weeks** | **Production-ready recruiting platform** |

---

## Next Steps

1. **Review this plan** - provide feedback, answer questions
2. **Confirm phase/checklist details** - need to know exact requirements
3. **Approve approach** - scrap Kanban and rebuild vs incremental migration
4. **Start Phase 1** - database schema + master-detail UI
5. **Iterate based on feedback** - show progress after each phase

---

## Final Recommendation

**Scrap the Kanban board and rebuild from scratch** because:
- Kanban and master-detail are fundamentally different UX patterns
- Configurable phases require complete schema redesign anyway
- Faster to build clean than refactor broken foundation
- Current implementation has zero production data to migrate
- Can build properly from the start with all requirements in mind

**Start with Phase 1**, get master-detail UI working with manual management, then layer on automation and intelligence in Phases 2-3.
