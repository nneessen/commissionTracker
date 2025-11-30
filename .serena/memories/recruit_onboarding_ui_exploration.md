# Recruit Onboarding System - UI Component Exploration

## Executive Summary
The recruit onboarding system has a comprehensive UI implementation with multiple components for different user types (recruits, trainers, admins). The system covers recruit creation, progress tracking, phase/checklist management, and document handling.

---

## 1. RECRUIT-FACING UI COMPONENTS

### User Experience Flow for Recruits

**Step 1: Login**
- Recruit logs in (existing auth system)
- Sidebar checks roles and shows only recruit-specific navigation
- Recruit sees single menu item: "My Progress" → `/recruiting/my-pipeline`

**Step 2: Dashboard (MyRecruitingPipeline.tsx)**
**Path**: `/src/features/recruiting/pages/MyRecruitingPipeline.tsx`

Key Sections:
1. **Header**: 
   - Title: "My Onboarding Progress"
   - Completion percentage badge (e.g., "45% Complete")

2. **Profile Card** (Your Profile section):
   - Avatar (24x24 px) with upload button
   - Name, Email, Phone
   - Resident State
   - Onboarding started date
   - File upload validation: image files, 5MB max, auto-reload after upload

3. **Overall Progress Card**:
   - Progress bar (visual)
   - Completion percentage
   - Onboarding phases list with status indicators:
     - Completed (green check circle)
     - In Progress (yellow clock icon)
     - Blocked (red alert icon)
     - Not Started (gray circle)
   - Shows: phase name, start date, completion date, estimated days, blocked reasons

4. **Current Phase Card**:
   - Shows current phase name
   - Phase notes/instructions
   - Generic next steps (hardcoded placeholder list):
     - Complete required documents for this phase
     - Stay in contact with your trainer
     - Follow the phase checklist items

5. **Required Documents Card**:
   - Lists uploaded documents with status badges
   - Status: pending, received, approved, rejected
   - Metadata: upload date, file type
   - Empty state shows placeholder

6. **Trainer Contact Card** (if upline assigned):
   - Trainer avatar, name, email, phone
   - Contact button (email link)
   - Empty state if no trainer assigned yet

---

## 2. ADMIN/TRAINER-FACING UI COMPONENTS

### RecruitingDashboard.tsx
**Path**: `/src/features/recruiting/RecruitingDashboard.tsx`
**Accessible at**: `/recruiting`
**Requires Permission**: `nav.recruiting_pipeline`

Features:
- **Header Stats**: Total recruits, active, completed, dropped
- **Recruit List Table** (RecruitListTable):
  - Search, filter, sort capabilities
  - Columns: Name, Email, Phone, Status, Recruiter, Upline, Created date
  - Row actions: Select/Detail view, Edit, Graduate (if eligible)
- **Action Buttons**:
  - Add Recruit (opens AddRecruitDialog)
  - Email (bulk email - placeholder)
  - Export CSV
  - Pipeline Admin Link (super-admin only)
- **RecruitDetailPanel** (on selection):
  - Shows detailed recruit profile and progress

---

## 3. KEY COMPONENTS BREAKDOWN

### AddRecruitDialog.tsx
**Path**: `/src/features/recruiting/components/AddRecruitDialog.tsx`
**Triggered by**: Admin/Trainer clicks "Add" button

**Form Structure** (5 Tabs):
```
Tab 1: Basic Info
  - First Name (required)
  - Last Name (required)
  - Email (required, unique check)
  - Phone (optional)
  - Date of Birth (optional, 18+ validation)

Tab 2: Address
  - Street Address
  - City
  - State (dropdown with all US states)
  - ZIP Code

Tab 3: Professional
  - Resident State (licensed state, dropdown)
  - License Number
  - NPN (National Producer Number)
  - License Expiration Date

Tab 4: Assignment
  - Upline/Trainer (dropdown, filters: agent/admin/trainer/upline_manager roles)
  - Recruiter auto-set to current user

Tab 5: Social/Referral
  - Instagram Username
  - LinkedIn Username
  - Facebook Handle
  - Personal Website (auto-prepends https://)
  - Referral Source (textarea)
```

**On Submit**:
- Validation checks
- Duplicate email check
- Creates user with roles: ['recruit']
- Sets onboarding_status: 'interview_1'
- Initializes phase progress from template

### RecruitDetailPanel.tsx
**Path**: `/src/features/recruiting/components/RecruitDetailPanel.tsx`
**Shows when**: Admin/Trainer clicks on a recruit in list

**Tabs**:
1. **Progress Tab**: 
   - Phase Timeline (PhaseTimeline component)
   - Phase Checklist (PhaseChecklist component)
   - Buttons: Advance Phase, Block Phase, Update Status

2. **Documents Tab**:
   - DocumentManager component
   - Upload, view, approve, reject docs
   - Document status tracking

3. **Activity Tab**:
   - Activity log from database
   - Shows recruitment journey events

4. **Messages Tab**:
   - EmailManager component
   - Send/receive messages with recruit

---

## 4. PHASE MANAGEMENT COMPONENTS

### PhaseTimeline.tsx
**Path**: `/src/features/recruiting/components/PhaseTimeline.tsx`

**Displays**:
- Overall progress bar (completed/total phases)
- Phase list with visual indicators:
  - Icon: Check (complete), Clock (in progress), Alert (blocked), Circle (not started)
  - Background color coding by status
  - Phase name and order (e.g., "1/7")
  - Description (if exists)
  - Blocked reason (if blocked)
  - Notes (if any)
  - Start and completion dates
  - Estimated days (if in progress)

### PhaseChecklist.tsx
**Path**: `/src/features/recruiting/components/PhaseChecklist.tsx`

**Item Types Supported**:
1. **Task Completion**:
   - Can be completed by: recruit, upline, or system-only
   - Recruit can check/uncheck if `can_be_completed_by = 'recruit'`
   - Upline can check if `can_be_completed_by = 'upline'`

2. **Document Upload**:
   - Recruit: Upload button
   - Upline: Approve/Reject buttons
   - Shows "Pending Approval" during review

3. **Training Module**:
   - External link provided
   - Recruit marks complete after viewing
   - Button: "View Training" (opens in new tab)

4. **Manual Approval**:
   - Upline can approve directly
   - Checkbox shows approval status

**Visual Elements**:
- Checkbox (status-aware)
- Item name with status badge
- Required indicator badge
- Description text
- Rejection reason (if rejected)
- Document metadata (if uploaded)
- Completion date and completed_by info
- Color-coded background by status

---

## 5. DOCUMENT MANAGEMENT COMPONENTS

### UploadDocumentDialog.tsx
**Path**: `/src/features/recruiting/components/UploadDocumentDialog.tsx`

**Form**:
- File selection (accepts: .pdf, .doc, .docx, .jpg, .jpeg, .png, .gif)
- Document Name (auto-filled from filename)
- Document Type dropdown:
  - Application Form
  - Background Check
  - State License
  - Carrier Contract
  - Resume
  - ID/Driver's License
  - Certification
  - Other Document

**Features**:
- File size display
- Upload progress bar
- Validation: all fields required

### DocumentManager.tsx
**Path**: `/src/features/recruiting/components/DocumentManager.tsx`

**Displays**:
- Document count header
- Document cards with:
  - File icon
  - Document name
  - Status badge (pending/received/approved/rejected/expired)
  - Type (auto-formatted)
  - File size
  - Upload date
  - Expiration date (if applicable)
  - Notes (if any)

**Actions** (Dropdown menu):
- View (DocumentViewerDialog)
- Download
- Approve (upline only, if pending)
- Reject (upline only, if pending)
- Delete (upline only)

### DocumentViewerDialog.tsx
**Path**: `/src/features/recruiting/components/DocumentViewerDialog.tsx`
(Not fully explored but component exists)

**Purpose**: Display document preview/viewer

---

## 6. COMMUNICATION COMPONENTS

### EmailManager.tsx
**Path**: `/src/features/recruiting/components/EmailManager.tsx`

**Not fully examined but appears to handle**:
- Sending messages to recruits
- Email history with recruit
- Integration with upline-recruit communication

---

## 7. ROUTING & NAVIGATION

### Routes
```
/recruiting           → RecruitingDashboard (admin/trainer view)
/recruiting/my-pipeline → MyRecruitingPipeline (recruit view)
/recruiting/admin/pipelines → PipelineAdminPage (super-admin only)
```

### Sidebar Navigation
**For Recruits**: Shows ONLY "My Progress" (`/recruiting/my-pipeline`)
**For Agents/Admins**: Shows "Recruiting" (`/recruiting`)

**Location**: `/src/components/layout/Sidebar.tsx` (lines 69-71)
```typescript
const recruitNavigationItems: NavigationItem[] = [
  { icon: ClipboardList, label: "My Progress", href: "/recruiting/my-pipeline", public: true },
];
```

---

## 8. WHAT'S IMPLEMENTED

✅ **Fully Implemented**:
1. Recruit dashboard (MyRecruitingPipeline)
2. Phase timeline visualization with progress tracking
3. Phase checklist with different item types
4. Document upload/download/management
5. Document approval workflow (upline)
6. Profile photo upload
7. Add recruit form with comprehensive fields
8. Recruit detail panel for admin/trainer
9. Navigation role-based access
10. Trainer contact card
11. Activity logging hooks exist
12. Email management component exists

---

## 9. WHAT'S PARTIALLY/NOT IMPLEMENTED

❌ **Missing or Incomplete**:

1. **"Next Steps" Section** (placeholder in MyRecruitingPipeline):
   - Currently shows hardcoded generic text
   - Should be dynamic based on current phase
   - Should pull from phase requirements

2. **Communication UI**:
   - EmailManager component exists but not integrated into MyRecruitingPipeline
   - Recruit doesn't see recent messages from trainer
   - No quick message compose UI in recruit dashboard

3. **Document Upload in MyRecruitingPipeline**:
   - "Required Documents" section is read-only
   - Recruits cannot upload documents from their dashboard
   - Document upload is only in admin detail panel
   - No way for recruits to know which documents are required per phase

4. **Phase Requirements Display**:
   - Phase checklist not shown to recruits in their dashboard
   - No visibility into what tasks need completion per phase
   - Recruits don't see checkboxes or progress items

5. **Social Media Profile Display**:
   - Instagram/LinkedIn usernames are stored but not displayed
   - No profile card integration showing social presence
   - Photo fallback from social media not implemented

6. **Notifications System**:
   - GraduateToAgentDialog tries to insert into `notifications` table
   - Table may not exist or not properly integrated
   - No notification UI for recruits about status changes

7. **Admin Communication Features**:
   - "Bulk Email" button exists but is placeholder ("Coming soon!")
   - No bulk messaging functionality
   - Individual email to recruit uses standard mailto link only

---

## 10. DATABASE TABLES INVOLVED

- `user_profiles` - Recruit/user data
- `onboarding_phases` - Phase definitions
- `recruit_phase_progress` - Recruit's phase status
- `phase_checklist_items` - Checklist items per phase
- `recruit_checklist_progress` - Recruit's checklist item status
- `user_documents` - Uploaded documents
- `recruit_emails` - Communication history
- `recruit_activity_log` - Activity tracking
- `notifications` - System notifications (questionable if exists)
- `avatars` (storage bucket) - Profile photos

---

## 11. KEY HOOKS & SERVICES

**Hooks** (in `/src/features/recruiting/hooks/`):
- `useRecruits()` - Fetch recruit list
- `useCreateRecruit()` - Create new recruit
- `useRecruitPhaseProgress()` - Fetch phase progress
- `useCurrentPhase()` - Get current phase
- `useChecklistProgress()` - Get checklist item status
- `useRecruitDocuments()` - Fetch documents
- `useUploadDocument()` - Upload document
- `useRecruitEmails()` - Fetch email history
- `useRecruitActivityLog()` - Get activity log
- `useAdvancePhase()` - Move to next phase
- `useBlockPhase()` - Block a phase
- `usePipeline()` - Get pipeline template

**Services**:
- `recruitingService` - Business logic for recruiting operations

---

## 12. MISSING UI FEATURES TO IMPLEMENT

### For Recruits:
1. **Document upload in dashboard** - Add upload button and dialog to "Required Documents" section
2. **Document requirements** - Show which documents are required for current phase
3. **Checklist visibility** - Display phase checklist items in dashboard (read-only)
4. **Next steps section** - Make dynamic based on phase instead of hardcoded
5. **Messages from trainer** - Show recent messages/notifications
6. **Social profiles** - Display Instagram/LinkedIn links if filled
7. **Progress milestones** - Show key dates/deadlines
8. **FAQ/Resources** - Link to training materials for current phase

### For Admins/Trainers:
1. **Bulk messaging** - Implement bulk email feature
2. **Progress filtering** - Filter recruits by phase/status/completion
3. **Batch operations** - Advance multiple recruits at once
4. **Templates** - Email templates for common messages
5. **Analytics** - Track recruit progress over time
6. **Export features** - More export options (PDF, detailed report)

---

## 13. FILE PATHS SUMMARY

### Core Components:
- `/src/features/recruiting/pages/MyRecruitingPipeline.tsx` - Recruit dashboard
- `/src/features/recruiting/RecruitingDashboard.tsx` - Admin/trainer dashboard
- `/src/features/recruiting/components/AddRecruitDialog.tsx` - Create recruit form
- `/src/features/recruiting/components/RecruitDetailPanel.tsx` - Recruit detail view

### UI Components:
- `/src/features/recruiting/components/PhaseTimeline.tsx` - Phase progress visualization
- `/src/features/recruiting/components/PhaseChecklist.tsx` - Checklist items display
- `/src/features/recruiting/components/DocumentManager.tsx` - Document management
- `/src/features/recruiting/components/UploadDocumentDialog.tsx` - Upload dialog
- `/src/features/recruiting/components/DocumentViewerDialog.tsx` - Document viewer
- `/src/features/recruiting/components/EmailManager.tsx` - Email communication
- `/src/features/recruiting/components/RecruitListTable.tsx` - Recruit list table

### Routes:
- `/src/router.tsx` - Route definitions (lines 238-260)

### Navigation:
- `/src/components/layout/Sidebar.tsx` - Role-based navigation (lines 68-71)

### Data/Hooks:
- `/src/features/recruiting/hooks/` - All data fetching and mutations

---

## 14. UI STYLING NOTES

- Uses shadcn UI components (Card, Badge, Button, Dialog, etc.)
- Tailwind CSS v4 for styling
- Dark mode supported (dark: variants present)
- Responsive design (mobile breakpoints in Sidebar)
- Status color coding:
  - Green: Completed/Approved
  - Yellow: In Progress/Pending
  - Red: Blocked/Rejected
  - Gray: Not Started

---

## 15. RECOMMENDATIONS FOR NEXT PHASE

1. **Enhance Recruit Dashboard**:
   - Add recruitable document upload section
   - Show phase-specific checklist to recruit
   - Make "Next Steps" dynamic
   - Add recent activity feed

2. **Improve Communication**:
   - Integrate messaging UI into recruit dashboard
   - Add notification system
   - Implement bulk admin messaging

3. **Better Phase Guidance**:
   - Show requirements for each phase
   - Display estimated timeline
   - Link to training materials

4. **Admin Enhancements**:
   - Advanced filtering and bulk operations
   - Progress analytics and reports
   - Template system for communications

5. **Mobile Optimization**:
   - Already responsive but test on mobile
   - Ensure recruit dashboard is mobile-friendly
   - Test document upload on mobile
