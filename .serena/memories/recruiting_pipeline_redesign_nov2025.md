# Recruiting Pipeline System Redesign (Nov 2025)

## Critical Decision: Scrap Kanban, Build Master-Detail

**Problem with Original Kanban Approach:**
- Only 3 recruits visible per column (total of 6-8 on screen)
- Hardcoded phases (not customizable)
- No notification system
- No task/checklist management
- No document approval workflow
- No analytics or bottleneck detection
- Not production-ready for real recruiting operations

**New Approach: Production-Grade Recruiting Operations Platform**

### Core Architecture Changes

1. **UI Pattern: Master-Detail Layout (not Kanban)**
   - Left panel: Compact table showing 20+ recruits at once
   - Right panel: Detailed view of selected recruit with phase timeline, checklist, documents
   - Color-coded status indicators (green/yellow/red)
   - Filtering, sorting, search capabilities

2. **Configurable Pipeline System (not hardcoded)**
   - `pipeline_templates` table - multiple templates for different scenarios
   - `pipeline_phases` table - configurable phases per template
   - `phase_checklist_items` table - tasks, documents, approvals, training modules
   - No more hardcoded phase enum!

3. **Intelligent Automation**
   - Auto-phase advancement when all required items complete
   - Stuck recruit detection (>1.5x expected duration)
   - Document approval workflow (pending → approved/rejected → resubmit)
   - Real-time notifications (in-app + email digests)

4. **Checklist System (First-Class Feature)**
   - 6 checklist item types:
     - document_upload (recruit uploads, upline approves)
     - task_completion (recruit marks done)
     - training_module (external link, track completion)
     - manual_approval (upline approves after interview/review)
     - automated_check (system checks condition)
     - signature_required (e-signature integration)
   - Each item tracks: status, completed_by, verified_by, rejection_reason

5. **Notification System**
   - `notifications` table with types: phase_completed, document_uploaded, document_approved/rejected, recruit_stuck, approval_required
   - `notification_preferences` table for per-user settings
   - Database triggers for auto-notification creation
   - In-app bell icon with unread count
   - Email digests (immediate, daily, weekly)

6. **Analytics Dashboard**
   - Funnel visualization (recruit count by phase, dropoff rates)
   - Time metrics (avg time per phase vs expected)
   - Bottleneck detection (which phases are slowest, why)
   - Upline performance metrics
   - Export to CSV

7. **Dual UX (Two Different Views)**
   - **Upline View**: Power-user interface, see all recruits, bulk actions, analytics
   - **Recruit View**: Simple guided experience, "Your next steps", progress bar, upload buttons

### Database Schema Changes

**Keep (Already Migrated):**
- ✅ user_profiles (extended with onboarding_status, recruiter_id, etc.)
- ✅ user_documents
- ✅ user_emails
- ✅ user_activity_log

**Delete/Redesign:**
- ❌ Old onboarding_phases table (had hardcoded enum)

**Create New:**
- pipeline_templates
- pipeline_phases (configurable)
- phase_checklist_items
- recruit_phase_progress
- recruit_checklist_progress
- notifications
- notification_preferences

### Implementation Phases

**Phase 1 (2 weeks):** Core foundation - master-detail UI, manual phase management
**Phase 2 (1 week):** Automation - auto-advancement, notifications
**Phase 3 (1 week):** Analytics + pipeline builder (admin tools)
**Phase 4 (2 weeks):** Production polish - email, bulk actions, mobile, security

### What to Delete from Codebase
- ❌ src/features/recruiting/RecruitingDashboard.tsx (Kanban board)
- ❌ src/features/recruiting/components/RecruitCard.tsx (Kanban cards)
- ❌ @dnd-kit dependency (not needed)
- ❌ Old onboarding_phases migration

### What to Keep
- ✅ Route structure (/recruiting)
- ✅ Sidebar navigation
- ✅ TanStack Query/Form patterns
- ✅ TypeScript types structure (update field names)
- ✅ Migrations: user_profiles, user_documents, user_emails, user_activity_log

### What to Rebuild
- 🔄 All UI components (master-detail layout)
- 🔄 recruitingService (query user_profiles table, not recruiting_profiles)
- 🔄 All hooks (update for new schema)
- 🔄 AddRecruitDialog (update to create user_profile with onboarding fields)

### Default Pipeline (8 Phases - Awaiting User Confirmation)
1. Initial Contact
2. Application
3. Background Check
4. Pre-Licensing
5. Exam
6. State License
7. Contracting
8. Complete

### Key Decisions
- **Scrap Kanban entirely** - no incremental migration, build fresh
- **Master-detail pattern** - industry standard for CRM pipelines
- **Configurable everything** - no hardcoded business logic
- **Notification-first** - uplines get alerted on every important event
- **Analytics-driven** - identify bottlenecks automatically

### Files Created
- `/docs/RECRUITING_SYSTEM_REDESIGN.md` - Full 500+ line design doc
- `/plans/active/RECRUITING_PIPELINE_IMPLEMENTATION.md` - Detailed implementation plan

### Next Steps (Awaiting User Approval)
1. User reviews design docs
2. User answers questions (default phases, checklist items, auto-advancement rules)
3. User approves "scrap and rebuild" approach
4. Begin Phase 1 implementation
