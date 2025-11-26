# Continue Recruiting System Implementation

## Context
We're building a comprehensive recruiting management system for insurance agents. The backend is 100% complete and tested - database, services, hooks all working. Now we need to build the frontend UI components.

## What's Been Completed ✅

### Database (All migrations applied and tested)
- ✅ `recruiting_profiles` table - Main recruit tracking
- ✅ `onboarding_phases` table - 8-phase tracking system with auto-triggers
- ✅ `recruit_documents` table - Document management
- ✅ `recruit_emails` + `recruit_email_attachments` tables - Email tracking
- ✅ `recruit_activity_log` table - Complete audit trail
- ✅ All RLS policies, triggers, and indexes working

### Backend Code
- ✅ TypeScript types: `src/types/recruiting.ts`
- ✅ Service layer: `src/services/recruiting/recruitingService.ts`
- ✅ TanStack Query hooks: `src/features/recruiting/hooks/`
  - useRecruits, useRecruitById, useRecruitingStats, useSearchRecruits
  - useCreateRecruit, useUpdateRecruit, useDeleteRecruit
  - useRecruitPhases, useUpdatePhase
  - useRecruitDocuments, useUploadDocument, useDeleteDocument, useUpdateDocumentStatus
  - useRecruitEmails, useSendEmail
  - useRecruitActivityLog

### What's Tested
- ✅ All migrations run successfully
- ✅ Schema verified (tables, foreign keys, RLS, triggers all correct)
- ✅ Service imports fixed (properly organized in `src/services/recruiting/`)

## What Needs To Be Done 🚧

### Phase 1: Core UI Components (PRIORITY)
Build these components following existing project patterns (see hierarchy feature for reference):

1. **RecruitingDashboard** (`src/features/recruiting/RecruitingDashboard.tsx`)
   - Use Kanban view (user explicitly requested this over table view)
   - Install @dnd-kit/core for drag-and-drop: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
   - Columns: Lead → Pre-Licensing → Exam → Licensed → Contracted → Active
   - Header with quick stats (total, active, completed, pending tasks)
   - Quick actions: "Add New Recruit", "Send Bulk Email", filters
   - Each card shows: photo, name, assigned upline, days in phase, quick actions

2. **RecruitCard** (`src/features/recruiting/components/RecruitCard.tsx`)
   - Compact card for Kanban view
   - Profile photo (fallback to initials)
   - Name, email, current phase badge
   - Assigned upline avatar
   - Days in current phase indicator
   - Drag handle icon
   - Click opens RecruitDetailModal

3. **AddRecruitDialog** (`src/features/recruiting/components/AddRecruitDialog.tsx`)
   - Use TanStack Form for validation
   - Required: first_name, last_name, email, phone
   - Optional: address, social media handles, assigned_upline_id, recruiter_id (default to current user)
   - On save → triggers useCreateRecruit mutation
   - Success → opens RecruitDetailModal for new recruit

### Phase 2: Detail Modal (COMPLEX - 7 TABS)
**RecruitDetailModal** (`src/features/recruiting/components/RecruitDetailModal.tsx`)
Use tabbed interface like AgentDetailModal in hierarchy feature.

Tabs:
1. **Overview** - Contact info, social media links, upline selector, progress bar, key dates
2. **Onboarding Progress** - Visual timeline, phase status, edit inline
3. **Documents** - Upload button, table of docs, preview/download/delete
4. **Communication** - Email timeline, "Send Email" button, notes
5. **Personal Information** - Editable form with save
6. **Social Media** - LinkedIn/Instagram profile data (if connected), connect buttons
7. **Activity Log** - Audit trail

### Phase 3: Supporting Components
4. **EmailComposeDialog** - Rich text editor, attachments, send via useSendEmail
5. **DocumentUploadDialog** - File upload with type selection, validation
6. **PhaseProgressBar** - Visual onboarding progress (X of Y phases completed)
7. **OnboardingTimeline** - Vertical timeline component

### Phase 4: Routing & Navigation
8. Add route to `src/router.tsx`: `/recruiting` → `RecruitingDashboard`
9. Add sidebar nav item in `src/components/layout/Sidebar.tsx`:
   ```typescript
   { icon: UserPlus, label: "Recruiting", href: "/recruiting" }
   ```
   Import `UserPlus` from `lucide-react`

## Critical Project Rules ⚠️

### Organization (MUST FOLLOW)
- Feature-based folders: `src/features/recruiting/components/` for all components
- Service organized: `src/services/recruiting/` (ALREADY DONE - DON'T CHANGE)
- Hooks in: `src/features/recruiting/hooks/` (ALREADY DONE - DON'T CHANGE)
- Types in: `src/types/recruiting.ts` (ALREADY DONE - DON'T CHANGE)
- NEVER throw files at root level - everything has a proper place

### Zero Local Storage (CRITICAL)
- ❌ NEVER use localStorage, sessionStorage, or IndexedDB for business data
- ✅ ALL data must be in Supabase database
- ✅ Only use local storage for: session tokens, UI preferences (theme, sidebar state)
- ✅ All data must survive page refresh by fetching from database

### Existing Patterns To Follow
- **Reference the hierarchy feature** (`src/features/hierarchy/`) for complex modal patterns
- Use TanStack Router, TanStack Query, TanStack Form
- Use shadcn/ui + Tailwind CSS v4
- Dense, data-rich UIs (no cookie-cutter 4-card grids)
- File paths commented at top of every new file
- Conventional naming (PascalCase components, camelCase functions, kebab-case files)

### Styling Rules
- NO hard borders
- NO nested cards
- NO cookie-cutter 4-card grid layouts
- Follow existing theme patterns (check AgentDetailModal, HierarchyDashboard)
- Use semantic color coding from types (STATUS_COLORS, ONBOARDING_STATUS_COLORS)

## Reference Files

### Key files to review for patterns:
1. **Hierarchy feature** (similar complexity):
   - `src/features/hierarchy/HierarchyDashboard.tsx` - Main page structure
   - `src/features/hierarchy/components/AgentDetailModal.tsx` - Tabbed modal pattern
   - `src/services/hierarchy/hierarchyService.ts` - Service patterns

2. **Policies feature** (simpler CRUD):
   - `src/features/policies/PolicyDashboard.tsx` - Dashboard patterns
   - `src/features/policies/components/PolicyDialog.tsx` - Dialog patterns

3. **Router**:
   - `src/router.tsx` - How to add routes

4. **Sidebar**:
   - `src/components/layout/Sidebar.tsx` - How to add nav items

## Dependencies Needed
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Testing Requirements
- Test component as you build it
- Run `npm run typecheck` after changes
- Check for errors before saying complete
- Verify drag-and-drop works smoothly in Kanban
- Test all tabs in RecruitDetailModal
- Test form validations

## Storage Buckets (NOT YET CREATED)
**Manual Setup Required in Supabase Dashboard:**
1. Create bucket: `recruit-documents` (private, 10MB limit)
2. Create bucket: `email-attachments` (private, 10MB limit)
3. Set RLS policies to match table policies

## Edge Functions (FUTURE PHASE - DON'T BUILD YET)
OAuth and email sending will be added later. For now:
- Store Instagram/LinkedIn handles manually
- Email compose dialog can be built but won't send yet
- Focus on core CRUD and UI first

## Current Todo List
1. ✅ Database migrations
2. ✅ TypeScript types
3. ✅ Service layer
4. ✅ TanStack Query hooks
5. ✅ Fix service organization
6. ⏳ Install @dnd-kit dependencies
7. ⏳ Build RecruitingDashboard with Kanban
8. ⏳ Build RecruitCard component
9. ⏳ Build AddRecruitDialog
10. ⏳ Build RecruitDetailModal (7 tabs)
11. ⏳ Build supporting components
12. ⏳ Add routing
13. ⏳ Add sidebar navigation
14. ⏳ E2E testing

## Detailed Plan
Full implementation plan saved at: `plans/active/recruiting-page.md`

## START HERE
Install dependencies then begin with RecruitingDashboard component:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Then create:
- `src/features/recruiting/RecruitingDashboard.tsx`
- `src/features/recruiting/components/` folder
- Start with basic Kanban layout, then add drag-and-drop

Remember: Follow existing patterns, stay organized, no local storage for data, test as you build!
