# Recruiting Pipeline System - Complete Redesign

## Executive Summary

**Problem:** Current Kanban board design is inefficient, inflexible, and not production-ready.
- Only 3 recruits visible per column
- Hardcoded phases prevent customization
- No notification system
- No task/document workflow management
- Missing analytics and bottleneck detection

**Solution:** Build a comprehensive recruiting operations platform with:
- Master-detail table view (20+ recruits visible)
- Fully configurable pipeline phases
- Checklist system (documents, tasks, approvals, training)
- Real-time notification system
- Document approval workflow
- Analytics dashboard with funnel visualization
- Dual UX (simple recruit view, power-user upline view)

---

## 1. Core Architecture Principles

### 1.1 Database Design Philosophy
- **Single source of truth**: user_profiles table for all people (recruits are agents with `onboarding_status='lead'`)
- **Configurable everything**: Pipeline phases stored in database, not hardcoded
- **Audit trail**: Every action logged in user_activity_log
- **Version control**: Pipeline templates with versioning
- **Performance first**: Proper indexing, materialized views for analytics

### 1.2 UX Philosophy
- **Upline view**: Power-user interface - see many recruits, filter/sort, bulk actions, analytics
- **Recruit view**: Simple guided experience - "Your next steps", progress bar, upload buttons
- **Mobile-first**: Responsive design, works on phone/tablet
- **Real-time updates**: Live status changes, notification badges

---

## 2. Database Schema (Complete)

### 2.1 Existing Tables (Already Migrated)

#### user_profiles (extended with onboarding fields)
```sql
-- NEW COLUMNS ADDED:
onboarding_status TEXT DEFAULT 'active' CHECK (onboarding_status IN ('lead', 'active', 'completed', 'dropped'))
current_onboarding_phase TEXT
recruiter_id UUID REFERENCES user_profiles(id)
onboarding_started_at TIMESTAMPTZ
onboarding_completed_at TIMESTAMPTZ
referral_source TEXT
instagram_username TEXT
instagram_url TEXT
linkedin_username TEXT
linkedin_url TEXT
```

#### onboarding_phases (already exists - BUT needs redesign)
Current schema has **hardcoded phase_name enum** - this is wrong!

#### user_documents (already exists - good)
#### user_emails (already exists - good)
#### user_activity_log (already exists - good)

### 2.2 NEW Tables Needed for Full System

#### pipeline_templates
Configurable pipeline templates (e.g., "Captive Agent Onboarding", "Independent Agent", "FL State License Track")

```sql
CREATE TABLE pipeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### pipeline_phases (configurable phases per template)
```sql
CREATE TABLE pipeline_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pipeline_templates(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_description TEXT,
  phase_order INTEGER NOT NULL,
  estimated_days INTEGER, -- How long this phase typically takes
  auto_advance BOOLEAN DEFAULT false, -- Auto-complete when all required items done?
  required_approver_role TEXT, -- Who can approve this phase
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, phase_order)
);
```

#### phase_checklist_items (what needs to happen in each phase)
```sql
CREATE TABLE phase_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES pipeline_phases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'document_upload',    -- Recruit uploads document
    'task_completion',    -- Recruit marks task complete
    'training_module',    -- Link to external training
    'manual_approval',    -- Upline manually approves
    'automated_check',    -- System checks condition
    'signature_required'  -- E-signature needed
  )),
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  can_be_completed_by TEXT NOT NULL CHECK (can_be_completed_by IN ('recruit', 'upline', 'system')),
  requires_verification BOOLEAN DEFAULT false,
  verification_by TEXT CHECK (verification_by IN ('upline', 'system', NULL)),
  external_link TEXT, -- For training modules
  document_type TEXT, -- For document_upload type
  metadata JSONB, -- Additional config (e.g., accepted file types, validation rules)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phase_checklist_items_phase_id ON phase_checklist_items(phase_id);
```

#### recruit_phase_progress (track where each recruit is)
```sql
CREATE TABLE recruit_phase_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES pipeline_phases(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES pipeline_templates(id), -- Lock to template version
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed',
    'blocked',
    'skipped'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phase_id)
);

CREATE INDEX idx_recruit_phase_progress_user_id ON recruit_phase_progress(user_id);
CREATE INDEX idx_recruit_phase_progress_status ON recruit_phase_progress(status);
CREATE INDEX idx_recruit_phase_progress_phase_id ON recruit_phase_progress(phase_id);
```

#### recruit_checklist_progress (track completion of individual checklist items)
```sql
CREATE TABLE recruit_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES phase_checklist_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed',
    'approved',
    'rejected',
    'needs_resubmission'
  )),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES user_profiles(id),
  rejection_reason TEXT,
  document_id UUID REFERENCES user_documents(id), -- Link to uploaded document if applicable
  notes TEXT,
  metadata JSONB, -- Store item-specific data (e.g., training completion certificate URL)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checklist_item_id)
);

CREATE INDEX idx_recruit_checklist_progress_user_id ON recruit_checklist_progress(user_id);
CREATE INDEX idx_recruit_checklist_progress_status ON recruit_checklist_progress(status);
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE, -- Recipient
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'phase_completed',
    'document_uploaded',
    'document_approved',
    'document_rejected',
    'checklist_item_completed',
    'recruit_stuck',
    'recruit_assigned',
    'approval_required',
    'document_expiring_soon'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID REFERENCES user_profiles(id), -- The recruit this is about
  related_document_id UUID REFERENCES user_documents(id),
  related_phase_id UUID REFERENCES pipeline_phases(id),
  related_checklist_item_id UUID REFERENCES phase_checklist_items(id),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  link_url TEXT, -- Where to navigate when clicked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

#### notification_preferences
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily_digest', 'weekly_digest', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);
```

---

## 3. UI/UX Design

### 3.1 Upline View (Primary Interface)

#### Master-Detail Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Recruiting Pipeline                                    [+ Add Recruit]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Filters: [All Phases ▼] [All Status ▼] [Search...]         Sort: Name ▼│
├──────────────────────┬──────────────────────────────────────────────────┤
│ RECRUIT LIST         │ DETAIL VIEW: John Smith                          │
│ (Compact Table)      │                                                   │
│                      │ ┌──────────────────────────────────────────────┐ │
│ 🟢 John Smith        │ │ Phase Timeline (Progress: 3/8)               │ │
│    Initial Contact   │ │ ✅ 1. Initial Contact (2 days)               │ │
│    2 days ago        │ │ ✅ 2. Application (5 days)                   │ │
│                      │ │ 🟡 3. Background Check (in progress, 3 days) │ │
│ 🟡 Sarah Johnson     │ │ ⚪ 4. Pre-Licensing                          │ │
│    Background Check  │ │ ⚪ 5. Exam                                    │ │
│    3 days ⚠️         │ │ ⚪ 6. State License                           │ │
│                      │ │ ⚪ 7. Contracting                             │ │
│ 🔴 Mike Davis        │ │ ⚪ 8. Complete                                │ │
│    Pre-Licensing     │ └──────────────────────────────────────────────┘ │
│    BLOCKED           │                                                   │
│                      │ ┌──────────────────────────────────────────────┐ │
│ 🟢 Lisa Wong         │ │ Current Phase: Background Check              │ │
│    Application       │ │ ✅ Submit application form                   │ │
│    1 day ago         │ │ ✅ Upload resume                              │ │
│                      │ │ 🟡 Background check authorization (pending)  │ │
│ ... (20+ more)       │ │    ⏳ Waiting for upline approval            │ │
│                      │ │ ⚪ Pay background check fee                   │ │
│                      │ └──────────────────────────────────────────────┘ │
│                      │                                                   │
│                      │ Documents (3) | Emails (7) | Activity Log (24)   │
│                      │                                                   │
│                      │ [📧 Send Email] [📋 Add Note] [➡️ Advance Phase] │
└──────────────────────┴──────────────────────────────────────────────────┘
```

**Features:**
- Left panel: Compact table showing 20+ recruits
  - Color-coded status (🟢 on-track, 🟡 needs attention, 🔴 blocked)
  - Current phase badge
  - Days in phase (with warning if > expected duration)
  - Last activity timestamp
- Right panel: Detailed view of selected recruit
  - Phase timeline with progress bar
  - Current phase checklist with item-level status
  - Tabs for documents, emails, activity log
  - Quick actions (send email, add note, advance phase, mark blocked)

#### Filtering & Sorting
- **Filter by phase**: "Show only recruits in Background Check"
- **Filter by status**: "Show only blocked recruits"
- **Filter by upline**: "Show only my recruits" vs "Show team's recruits"
- **Search**: By name, email, phone
- **Sort by**: Name, phase, days in phase, last activity, date added

#### Bulk Actions
- Select multiple recruits
- Send bulk email
- Bulk phase advancement (e.g., "Move all completed applications to background check")
- Export to CSV

### 3.2 Recruit View (Simple Guided Experience)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Your Onboarding Progress                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ████████████░░░░░░░░░░░░░░ 38% Complete (Phase 3 of 8)               │
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🎯 NEXT STEPS - Background Check Phase                             │ │
│ │                                                                     │ │
│ │ ✅ 1. Submit application form (completed 2 days ago)               │ │
│ │ ✅ 2. Upload resume (completed 2 days ago)                         │ │
│ │ 🟡 3. Sign background check authorization                          │ │
│ │    ⏳ Your upline needs to approve this                            │ │
│ │ ⚪ 4. Pay background check fee ($50)                               │ │
│ │    [Pay Now] or upload receipt                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ Estimated time to complete this phase: 3-5 days                         │
│ Your upline: John Recruiter (john@example.com)                          │
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📋 COMPLETED PHASES                                                 │ │
│ │ ✅ Phase 1: Initial Contact (completed in 2 days)                  │ │
│ │ ✅ Phase 2: Application (completed in 5 days)                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ Need help? [📧 Contact Your Upline] [❓ FAQ]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Clear progress bar showing % complete
- "Next steps" highlighted prominently
- Completed items grayed out with completion dates
- Pending items with clear actions (upload, pay, complete training)
- Items awaiting approval show status
- Contact upline button always visible
- Mobile-responsive design

### 3.3 Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Recruiting Analytics                         [Last 30 Days ▼] [Export] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐               │
│ │ Total Recruits │ │  Avg Time to   │ │  Completion    │               │
│ │      42        │ │   Complete     │ │     Rate       │               │
│ │   +7 this mo   │ │    28 days     │ │      73%       │               │
│ └────────────────┘ └────────────────┘ └────────────────┘               │
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ FUNNEL VISUALIZATION                                                │ │
│ │                                                                     │ │
│ │ Initial Contact    ████████████████████████████████████ 42         │ │
│ │ Application        ███████████████████████████████ 38              │ │
│ │ Background Check   ████████████████████████ 31                     │ │
│ │ Pre-Licensing      ████████████████ 24                             │ │
│ │ Exam               ███████████ 18                                  │ │
│ │ State License      ████████ 14                                     │ │
│ │ Contracting        █████ 10                                        │ │
│ │ Complete           ███ 7                                           │ │
│ │                                                                     │ │
│ │ Dropout rate by phase: Background Check (18% ⚠️ highest)           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ BOTTLENECK DETECTION                                                │ │
│ │                                                                     │ │
│ │ ⚠️ Pre-Licensing phase averaging 12 days (expected: 7 days)        │ │
│ │    - 5 recruits stuck for >14 days                                 │ │
│ │    - Common blocker: Study materials not received                  │ │
│ │                                                                     │ │
│ │ ⚠️ 8 recruits pending upline approval (avg wait: 3 days)           │ │
│ │    - Recommendation: Enable auto-approval for low-risk items       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ TIME METRICS BY PHASE                                               │ │
│ │                                                                     │ │
│ │ Phase            Expected    Actual Avg    Top Performers           │ │
│ │ Initial Contact    2 days      1.8 days    Sarah (1 day)           │ │
│ │ Application        5 days      6.2 days    Mike (3 days)           │ │
│ │ Background Check   7 days      8.5 days    Lisa (5 days)           │ │
│ │ Pre-Licensing     10 days     12.3 days ⚠️ John (8 days)           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Pipeline Builder (Admin)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pipeline Templates                                  [+ Create Template] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Template: Captive Agent Onboarding (Default)           [Edit] [⋮]  │ │
│ │ Description: Standard 8-phase onboarding for captive agents         │ │
│ │ Created: Jan 15, 2025 | Active recruits: 42                         │ │
│ │                                                                     │ │
│ │ ┌─ Phase 1: Initial Contact (Est: 2 days) ───────────────────────┐ │ │
│ │ │ Auto-advance: No | Approver: Upline                            │ │ │
│ │ │ Checklist Items:                                               │ │ │
│ │ │ • Phone screening completed (Manual Approval by Upline)        │ │ │
│ │ │ • Interest form submitted (Task Completion by Recruit)         │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                     │ │
│ │ ┌─ Phase 2: Application (Est: 5 days) ───────────────────────────┐ │ │
│ │ │ Auto-advance: Yes | Approver: N/A                              │ │ │
│ │ │ Checklist Items:                                               │ │ │
│ │ │ • Application form (Document Upload - Required)               │ │ │
│ │ │ • Resume (Document Upload - Required)                          │ │ │
│ │ │ • References (Document Upload - Optional)                      │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                     │ │
│ │ ... (6 more phases)                                                 │ │
│ │                                                                     │ │
│ │ [Add Phase] [Reorder Phases] [Clone Template]                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Template: Independent Agent Track                       [Edit] [⋮]  │ │
│ │ Active recruits: 12                                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Create multiple templates for different recruiting scenarios
- Drag-and-drop to reorder phases
- For each phase: set name, description, estimated duration, auto-advance, approver role
- For each checklist item: type, name, description, required/optional, who completes, who verifies
- Clone templates to create variations
- Set one template as default

---

## 4. Notification System Design

### 4.1 Notification Triggers

**Automated Triggers:**
1. **Recruit completes checklist item** → Notify upline
2. **Recruit uploads document** → Notify upline for review
3. **Recruit stuck in phase for X days** → Notify upline (configurable threshold)
4. **Phase auto-completes** → Notify recruit + upline
5. **Upline approves/rejects item** → Notify recruit
6. **Document expiring in 30 days** → Notify recruit + upline
7. **New recruit assigned** → Notify upline

### 4.2 Notification Delivery

**In-App:**
- Bell icon in navbar with unread count badge
- Dropdown list of recent notifications
- Click notification → navigate to relevant page (recruit detail, document, etc.)
- Mark as read/unread
- Filter by type

**Email Digest:**
- User configurable: immediate, daily digest, weekly digest, disabled
- HTML email template with action buttons
- Unsubscribe link

**Future: SMS for urgent items**

### 4.3 Database Trigger for Notifications

```sql
-- Auto-create notification when checklist item is completed
CREATE OR REPLACE FUNCTION notify_on_checklist_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_recruit_name TEXT;
  v_item_name TEXT;
  v_upline_id UUID;
BEGIN
  -- Only notify on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get recruit name and upline
    SELECT first_name || ' ' || last_name, recruiter_id
    INTO v_recruit_name, v_upline_id
    FROM user_profiles
    WHERE id = NEW.user_id;

    -- Get checklist item name
    SELECT item_name INTO v_item_name FROM phase_checklist_items WHERE id = NEW.checklist_item_id;

    -- Create notification for upline
    INSERT INTO notifications (
      user_id,
      notification_type,
      title,
      message,
      related_user_id,
      related_checklist_item_id,
      link_url
    ) VALUES (
      v_upline_id,
      'checklist_item_completed',
      'Checklist Item Completed',
      v_recruit_name || ' completed: ' || v_item_name,
      NEW.user_id,
      NEW.checklist_item_id,
      '/recruiting?recruit=' || NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_checklist_completion
  AFTER INSERT OR UPDATE ON recruit_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_checklist_completion();
```

---

## 5. Business Logic & Workflows

### 5.1 Phase Advancement Logic

**Auto-Advance Phases:**
```typescript
// Service function to check if phase can auto-advance
async function checkPhaseCompletion(userId: string, phaseId: string) {
  // 1. Get all required checklist items for this phase
  const requiredItems = await supabase
    .from('phase_checklist_items')
    .select('id')
    .eq('phase_id', phaseId)
    .eq('is_required', true);

  // 2. Check if all required items are completed/approved
  const completedItems = await supabase
    .from('recruit_checklist_progress')
    .select('id')
    .eq('user_id', userId)
    .in('checklist_item_id', requiredItems.map(i => i.id))
    .in('status', ['completed', 'approved']);

  // 3. If all required items done, advance phase
  if (completedItems.length === requiredItems.length) {
    const phase = await supabase
      .from('pipeline_phases')
      .select('auto_advance')
      .eq('id', phaseId)
      .single();

    if (phase.auto_advance) {
      await advanceToNextPhase(userId, phaseId);
    } else {
      // Notify upline that phase is ready for manual approval
      await createNotification({
        type: 'approval_required',
        userId: getUplineId(userId),
        message: `${getRecruitName(userId)} has completed all required items in ${getPhaseName(phaseId)}`
      });
    }
  }
}
```

### 5.2 Document Approval Workflow

**States:** pending → received → approved/rejected → (if rejected) needs_resubmission → pending

```typescript
async function approveDocument(documentId: string, approverId: string) {
  // 1. Update document status
  await supabase
    .from('user_documents')
    .update({ status: 'approved', verified_by: approverId, verified_at: new Date() })
    .eq('id', documentId);

  // 2. Update linked checklist item (if exists)
  await supabase
    .from('recruit_checklist_progress')
    .update({ status: 'approved', verified_by: approverId, verified_at: new Date() })
    .eq('document_id', documentId);

  // 3. Notify recruit
  const doc = await getDocument(documentId);
  await createNotification({
    type: 'document_approved',
    userId: doc.user_id,
    message: `Your ${doc.document_name} has been approved!`,
    relatedDocumentId: documentId
  });

  // 4. Check if phase can advance
  await checkPhaseCompletion(doc.user_id, getCurrentPhaseId(doc.user_id));
}
```

### 5.3 Stuck Recruit Detection (Scheduled Job)

Run daily via Supabase Edge Function + pg_cron:

```sql
-- Find recruits stuck in phase for > expected duration
SELECT
  rpp.user_id,
  rpp.phase_id,
  pp.phase_name,
  pp.estimated_days,
  EXTRACT(EPOCH FROM (NOW() - rpp.started_at)) / 86400 AS days_in_phase,
  up.recruiter_id
FROM recruit_phase_progress rpp
JOIN pipeline_phases pp ON pp.id = rpp.phase_id
JOIN user_profiles up ON up.id = rpp.user_id
WHERE rpp.status = 'in_progress'
  AND EXTRACT(EPOCH FROM (NOW() - rpp.started_at)) / 86400 > pp.estimated_days * 1.5
  AND NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE notification_type = 'recruit_stuck'
      AND related_user_id = rpp.user_id
      AND related_phase_id = rpp.phase_id
      AND created_at > NOW() - INTERVAL '7 days' -- Don't spam notifications
  );
```

Then create notifications for uplines.

---

## 6. Implementation Roadmap

### Phase 1: Core Foundation (Week 1-2)
**Goal:** Get basic system working with master-detail UI

**Database:**
- ✅ user_profiles extension (already done)
- ✅ onboarding_phases (already done - but needs redesign to remove hardcoded enum)
- ✅ user_documents (already done)
- ✅ user_emails (already done)
- ✅ user_activity_log (already done)
- ❌ Create pipeline_templates table
- ❌ Create pipeline_phases table (configurable)
- ❌ Create phase_checklist_items table
- ❌ Create recruit_phase_progress table
- ❌ Create recruit_checklist_progress table

**Backend Services:**
- Create recruitingService with new queries (use user_profiles)
- Create pipelineService for template/phase management
- Create notificationService (in-app only for now)

**Frontend - Upline View:**
- Master-detail layout component
- Recruit list table (compact, sortable, filterable)
- Recruit detail panel with phase timeline
- Current phase checklist display
- Manual phase advancement

**Frontend - Recruit View:**
- Simple progress view with next steps
- Upload document UI
- Mark task complete UI

**Testing:**
- Seed one default template with 8 phases
- Test recruit creation → phase tracking → manual advancement
- Test document upload → approval

### Phase 2: Automation & Notifications (Week 3)
**Goal:** Make system intelligent with auto-advancement and notifications

**Database:**
- Create notifications table
- Create notification_preferences table
- Add database triggers for auto-notifications

**Backend:**
- Implement auto-phase advancement logic
- Implement document approval workflow
- Create notification triggers (checklist completion, document upload, etc.)

**Frontend:**
- Notification bell with dropdown
- Mark as read/unread
- Navigate to relevant pages from notifications
- Email notification templates (basic)

**Testing:**
- Test auto-advancement when all required items complete
- Test notification creation on various events
- Test notification delivery (in-app)

### Phase 3: Pipeline Builder & Analytics (Week 4)
**Goal:** Admin tools for pipeline customization + analytics dashboard

**Frontend - Admin:**
- Pipeline template list view
- Create/edit template UI
- Add/edit phases within template
- Add/edit checklist items within phases
- Drag-and-drop phase reordering

**Frontend - Analytics:**
- Funnel visualization
- Time metrics by phase
- Bottleneck detection
- Recruit list with filters (by phase, stuck recruits, etc.)
- Export to CSV

**Testing:**
- Create second template, assign recruits to different templates
- Test analytics calculations
- Test filtering/sorting

### Phase 4: Polish & Advanced Features (Week 5+)
**Goal:** Production-ready with all bells and whistles

**Features:**
- Email digest functionality (daily/weekly)
- Bulk actions (bulk email, bulk phase change)
- Document expiration tracking + reminders
- Mobile-responsive improvements
- Recruit portal improvements (FAQ, help resources)
- Performance optimization (pagination, virtualization)
- Advanced RLS policies
- Comprehensive error handling

---

## 7. Migration from Current System

### 7.1 What to Keep
✅ Database migrations: user_profiles extension, user_documents, user_emails, user_activity_log
✅ TypeScript types structure (update field names)
✅ Route structure (`/recruiting`)
✅ TanStack Query/Form patterns

### 7.2 What to Delete
❌ Current Kanban components (RecruitingDashboard.tsx, RecruitCard.tsx)
❌ @dnd-kit drag-and-drop dependency (not needed)
❌ Hardcoded phase enum in onboarding_phases migration (redesign to configurable)

### 7.3 What to Rebuild
🔄 Master-detail layout (new component)
🔄 Recruit list table (new component)
🔄 Phase timeline display (new component)
🔄 Checklist UI (new component)
🔄 Services layer (update queries for new schema)
🔄 Hooks (update for new data structures)

---

## 8. Key Differentiators from Kanban Approach

| Aspect | Old (Kanban) | New (Master-Detail) |
|--------|-------------|---------------------|
| **Scalability** | 3 recruits visible per column | 20+ recruits visible at once |
| **Phases** | Hardcoded 8 phases | Fully configurable templates |
| **Tasks** | None - just drag cards | Full checklist system with types |
| **Documents** | Basic upload | Approval workflow with expiration |
| **Notifications** | None | Real-time + email digests |
| **Analytics** | None | Funnel, bottlenecks, time metrics |
| **Automation** | Manual everything | Auto-advancement + alerts |
| **Customization** | Zero | Pipeline builder for admins |
| **Recruit UX** | N/A (upline only) | Dedicated simple portal |

---

## 9. Technical Decisions

### 9.1 Why Master-Detail over Kanban?
- **Information density**: See 10x more recruits at once
- **Better for task tracking**: Checklist items don't fit in cards
- **Document management**: Need space for upload/review UI
- **Mobile-friendly**: Table collapses to list, detail panel becomes modal
- **Industry standard**: CRMs (Salesforce, HubSpot) use this pattern for pipelines

### 9.2 Why Configurable Phases?
- Different recruiting scenarios (captive vs independent, state-specific licensing)
- Business processes change → no code deployment needed
- A/B test different onboarding flows
- Template versioning → lock recruits to template version when they start

### 9.3 Why Checklist Items as First-Class Entities?
- Documents are not the only requirement (training, tasks, approvals, signatures)
- Different item types have different workflows
- Granular progress tracking (not just "phase complete" but "4 of 7 items done")
- Better analytics (which items cause most delays?)

### 9.4 Why Notification System?
- Recruiting is time-sensitive → uplines need alerts on stuck recruits
- Reduces "Where's my recruit in the process?" questions
- Email digests keep uplines informed without overwhelming
- Creates audit trail of system events

---

## 10. Success Metrics

**Efficiency Metrics:**
- Avg time to complete full onboarding (target: <30 days)
- % recruits completing onboarding (target: >75%)
- Avg upline response time to approvals (target: <24 hours)

**User Experience:**
- Uplines can see 20+ recruits at once ✅
- Recruits always know "what's next" ✅
- Zero "Where are they in the process?" questions ✅

**System Health:**
- Notification delivery rate (target: >99%)
- Auto-phase advancement accuracy (target: 100%)
- Document approval workflow < 2 days avg

---

## 11. Future Enhancements (Post-MVP)

1. **SMS notifications** for urgent items
2. **E-signature integration** (DocuSign API)
3. **Background check API integration** (Checkr)
4. **Training module integration** (LMS embed)
5. **Recruiter performance leaderboard**
6. **Recruiter commission tracking** (tie to completed recruits)
7. **Interview scheduling** (Calendly integration)
8. **Video onboarding** (Loom embeds for training)
9. **Mobile app** (React Native)
10. **AI-powered insights** ("Your recruits are 20% slower in pre-licensing phase than team average")

---

## 12. Questions for User

Before implementation, clarify:

1. **Default pipeline**: What are the 8 phases? (I see: initial_contact, application, background_check, pre_licensing, exam, state_license, contracting, complete) - confirm this is correct

2. **Checklist items**: For each phase, what are the typical tasks/documents? (I can infer some, but want to confirm)

3. **Notification preferences**: Start with in-app only, or build email digests in Phase 2?

4. **Auto-advancement**: Which phases should auto-advance vs require manual approval?

5. **Document types**: I see application, background_check, license, contract, resume, identification, certification, other - any others needed?

6. **Stuck threshold**: How many days in a phase before "stuck" notification? (I suggest 1.5x expected duration)

7. **Analytics priority**: Which metrics are most important? (funnel, time-to-complete, bottlenecks, dropout rate)

8. **Mobile priority**: Is mobile view critical for Phase 1, or can we optimize in Phase 4?

---

## 13. Next Steps

**Immediate Actions:**
1. **Get user feedback** on this design document
2. **Clarify questions** in section 12
3. **Create detailed task breakdown** for Phase 1
4. **Set up project tracking** (GitHub project board or Linear)
5. **Begin implementation** starting with database schema

**Decision Needed:**
- Scrap current Kanban UI entirely and start fresh? OR
- Incrementally migrate (keep Kanban, build master-detail alongside, swap when ready)?

I recommend **scrap and rebuild** because:
- Kanban and master-detail are fundamentally different UX patterns
- Configurable phases require complete schema redesign anyway
- Faster to build from scratch than refactor
- Current UI has minimal user data (can easily migrate)

---

## Conclusion

This redesign transforms the recruiting pipeline from a simple Kanban board into a **production-grade recruiting operations platform** that:
- ✅ Handles hundreds of recruits efficiently
- ✅ Adapts to different recruiting scenarios via templates
- ✅ Automates repetitive tasks (notifications, phase advancement)
- ✅ Provides actionable analytics to identify bottlenecks
- ✅ Delivers great UX for both uplines (power users) and recruits (simplicity)

**The goal:** Make onboarding new agents so smooth that they never ask "What do I do next?" and uplines never ask "Where is this recruit in the process?"
