# Email System Phase 2: Complete Email Marketing Platform

**Status:** ACTIVE - ENHANCED
**Created:** 2025-11-29
**Updated:** 2025-12-07
**Phase:** 2 of 3 (Building on Phase 1 foundation)
**Estimated Duration:** 20-25 days (expanded scope)
**Complexity:** High

---

## Executive Summary

Phase 2 implements a **complete email marketing platform** with:
- Production-ready WYSIWYG block-based email composer
- Modern fonts with visual previews
- Template management with subject lines
- Variable substitution
- **Recipient selection & groups** (static + dynamic)
- **Email automation triggers with UI**
- Draft auto-save, attachments, scheduling
- Bulk sending with progress tracking
- Campaign builder (drip sequences)
- Email analytics

This phase addresses **18 original concerns** PLUS **8 additional requirements** identified on 2025-12-07.

**Key Insight:** Phase 1's database schema is comprehensive. The block builder exists but has broken formatting/font output that must be fixed.

---

## 🚨 ADDITIONAL REQUIREMENTS (Added 2025-12-07)

### Current Broken Features (MUST FIX FIRST)

| Issue | Severity | Details |
|-------|----------|---------|
| **Fonts don't work** | Critical | Old web-safe fonts (Arial, Georgia, Times) with no preview. Font selection doesn't apply to HTML output |
| **No subject line** | Critical | Template builder has no place to enter email subject |
| **Formatting broken** | Critical | Styles set in BlockStylePanel don't export to final HTML in BlockPreview.tsx |
| **Hardcoded templates** | Critical | `ComposeEmailDialog.tsx:53-66` uses hardcoded templates, ignores database |
| **No recipient selection** | High | Can only email one recruit at a time |
| **No groups** | High | Can't create "All Phase 1" or custom recipient groups |
| **No automation UI** | High | `email_triggers` table exists but has zero UI |

### New Features Required

1. **Modern Font System**
   - Replace old fonts with: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins
   - FontPicker component with visual preview (shows actual font)
   - Font weight selection (Regular, Medium, Semibold, Bold)
   - Fonts must apply to HTML output

2. **Subject Line in Template Builder**
   - Add subject field to EmailBlockBuilder
   - Support variables in subject ({{recruit_name}})
   - Preview with interpolated values
   - Character count (50 recommended, 100 max)

3. **Fix HTML Output**
   - BlockPreview.tsx must apply ALL styles as inline CSS
   - Font family, size, color, line-height must be in output
   - Test in actual email clients (Gmail, Outlook)

4. **Recipient Selection UI**
   - RecipientSelector component with multi-select
   - Search by name/email
   - Quick filters: "All recruits", "By Phase", "By Status"
   - Group selection
   - CC/BCC support
   - Recently used recipients

5. **Recipient Groups**
   - New table: `email_recipient_groups`
   - Static groups (manually add members)
   - Dynamic groups (auto-filter: phase, status, etc.)
   - GroupManager page for CRUD
   - Preview members before save

6. **Automation Trigger UI**
   - TriggerBuilder component connecting to `email_triggers` table
   - Visual trigger type selection
   - Phase picker for phase-specific triggers
   - Template selector
   - Delay configuration (immediate, minutes, hours, days)
   - Enable/disable toggle
   - Automation dashboard page

7. **Campaign Builder** (Drip Sequences)
   - Multi-step email sequences
   - Visual flow builder
   - Delay between steps
   - Stop conditions (if replied, unsubscribed)
   - A/B testing support (future)

8. **Email Analytics**
   - Opens, clicks, bounces
   - Per-template performance
   - Best send times
   - Dashboard with charts

---

## Table of Contents

1. [Background & Context](#background--context)
2. [18 Critical Concerns Addressed](#18-critical-concerns-addressed)
3. [Architecture Overview](#architecture-overview)
4. [Sub-Phases Breakdown](#sub-phases-breakdown)
5. [Database Changes](#database-changes)
6. [Package Dependencies](#package-dependencies)
7. [Testing Strategy](#testing-strategy)
8. [Acceptance Criteria](#acceptance-criteria)
9. [Risk Mitigation](#risk-mitigation)
10. [Future Considerations](#future-considerations)

---

## Background & Context

### Phase 1 Accomplishments (COMPLETED)

**Database Schema:**

- ✅ `user_email_oauth_tokens` - Encrypted OAuth storage
- ✅ `email_templates` - Template storage with RLS policies
- ✅ `email_triggers` - Automatic trigger rules
- ✅ `email_queue` - Queue with status tracking (includes 'draft' status!)
- ✅ `email_quota_tracking` - Daily send limits
- ✅ `email_watch_subscriptions` - Gmail Watch API
- ✅ Extended `user_emails` with threading fields (reply_to_id, thread_id, is_incoming, etc.)

**Edge Functions:**

- ✅ `oauth-callback` - Gmail OAuth handler
- ✅ `send-email` - Gmail API integration
- ✅ `_shared/encryption.ts` - AES-256-GCM utilities
- ✅ `_shared/supabase-client.ts` - Shared client

**Frontend:**

- ✅ `src/features/email/` - Feature folder structure
- ✅ `EmailConnectionManager` component
- ✅ `src/types/email.types.ts` - Comprehensive types

### Current State

**Existing:** Basic `ComposeEmailDialog` in `src/features/recruiting/components/ComposeEmailDialog.tsx`

- Plain textarea (no formatting)
- Hardcoded templates (3 static templates)
- Tied to recruiting feature only
- No draft saving, attachments, or scheduling

**Gap:** Need rich text editor with full email composition capabilities that can be used across the application, not just recruiting.

---

## 18 Critical Concerns Addressed

During comprehensive analysis, 18 critical issues were identified with the original Phase 2 plan. This revised plan addresses ALL of them:

### 🚨 CRITICAL (Concerns 1-4)

**1. Architecture Conflict - ComposeEmailDialog Location**

- ✅ **Solution:** Create new generic `EmailComposer` in `src/features/email/`
- ✅ Refactor recruiting's `ComposeEmailDialog` to use the new composer
- ✅ Maintains backward compatibility while centralizing logic

**2. Image Storage Strategy**

- ✅ **Solution:** Use Supabase Storage with `email-images` bucket
- ✅ Upload images → Get public URL → Insert URL into HTML (NOT base64)
- ✅ Create `imageUploadService.ts` with cleanup for orphaned images

**3. Variable Substitution Logic**

- ✅ **Solution:** Create `variableSubstitutionService.ts`
- ✅ Client-side: Preview substitution (show user what email will look like)
- ✅ Server-side: Edge Function substitution before actual send
- ✅ Data sources: `recruits`, `recruit_phases`, `user_profiles` tables
- ✅ Security: Parameterized queries + DOMPurify sanitization

**4. XSS/HTML Sanitization**

- ✅ **Solution:** Add `dompurify` package
- ✅ Sanitize HTML before preview → Before DB storage → Before email send
- ✅ Prevent script injection in templates and user content

### ⚠️ HIGH PRIORITY (Concerns 5-10)

**5. Plain Text Email Fallback**

- ✅ **Solution:** Add `html-to-text` package
- ✅ Generate plain text from HTML for `body_text` field
- ✅ Gmail API sends multipart email (HTML + plain text)

**6. Template RLS Policies**

- ✅ **Already exists in Phase 1 migration!**
- ✅ Verify policies work correctly in UI
- ✅ Handle permission errors gracefully

**7. Draft Auto-Save**

- ✅ **Solution:** Leverage `email_queue` table with `status='draft'`
- ✅ Debounced auto-save every 3 seconds
- ✅ Draft recovery on composer open
- ✅ Multi-tab conflict resolution with optimistic locking

**8. File Attachments**

- ✅ **Solution:** Create `email-attachments` Storage bucket
- ✅ Drag-drop + file picker UI
- ✅ Store metadata in `user_email_attachments` table (CREATE TABLE needed)
- ✅ 25MB Gmail limit validation
- ✅ Edge Function retrieves from Storage, base64-encodes for Gmail API

**9. Email Threading/Replies**

- ✅ **Database fields already exist!** (reply_to_id, thread_id)
- ✅ Create Reply/Reply All functionality
- ✅ Quote original text with TipTap blockquote
- ✅ Edge Function adds In-Reply-To and References headers

**10. Queue Integration & Scheduling**

- ✅ **email_queue table already exists!**
- ✅ "Send Now" → Insert with `status='pending'`, `scheduled_for=NOW()`
- ✅ "Schedule" → Insert with future `scheduled_for` timestamp
- ✅ Create `process-email-queue` Edge Function (cron every 1 min)

### 📋 MEDIUM PRIORITY (Concerns 11-15)

**11. Variable Context Passing**

- ✅ **Solution:** Create `EmailComposerContext` React Context
- ✅ Pass `recruitId`, `phaseId` to composer for variable resolution
- ✅ UI shows available variables based on context
- ✅ Preview mode renders variables with real data

**12. Error Handling**

- ✅ **Solution:** Leverage `email_queue.attempts`, `max_attempts`, `error_message`
- ✅ Retry with exponential backoff (1min, 5min, 15min)
- ✅ Toast notifications for success/failure
- ✅ OAuth token refresh on 401 errors
- ✅ Create `EmailQueueMonitor` component for pending/failed emails

**13. Mobile Responsiveness**

- ✅ **Solution:** Use TipTap `BubbleMenu` for mobile
- ✅ Floating toolbar on text selection (not fixed)
- ✅ Collapsible sections for less-used formatting
- ✅ 44px minimum touch targets
- ✅ Test on 320px, 768px, 1024px viewports

**14. Bulk Email Sending**

- ✅ **Solution:** Create `BulkEmailDialog` component
- ✅ Multi-recipient selector (checkboxes)
- ✅ Creates N `email_queue` items (one per recipient)
- ✅ Batch processing (max 50/hour to avoid spam flags)
- ✅ Progress bar: "X of Y sent"
- ✅ Individual failures don't stop batch

**15. Testing Strategy**

- ✅ **Solution:** Add `VITE_EMAIL_TEST_MODE` env var
- ✅ Test mode → emails go to `test_emails` table (no actual send)
- ✅ Create `EmailTestInbox` component to view test emails
- ✅ "Send Test Email to Self" button in composer
- ✅ E2E tests use Playwright with test mode

### 🔧 LOWER PRIORITY (Concerns 16-18)

**16. Bundle Size Optimization**

- ✅ **Solution:** Lazy load EmailComposer with `React.lazy()`
- ✅ Only import needed TipTap extensions (tree-shaking)
- ✅ Skip unused extensions (color, text-align)
- ✅ Code split with dynamic imports
- ✅ Target: Keep increase under 300KB

**17. Email Signatures**

- ✅ **Solution:** Create `user_email_signatures` table (migration needed)
- ✅ Settings page section for managing signatures
- ✅ Checkbox "Include signature" in composer
- ✅ Dropdown to select which signature
- ✅ Auto-insert at end of body_html/body_text

**18. Accessibility (a11y)**

- ✅ **Solution:** Add ARIA labels to all toolbar buttons
- ✅ Ensure keyboard navigation (Tab, Arrow keys, Enter)
- ✅ Add `role="textbox"` to editor
- ✅ Screen reader announces formatting changes
- ✅ Proper focus management in dialogs
- ✅ Test with axe-core + VoiceOver/NVDA

---

## Architecture Overview

### Component Hierarchy

```
src/features/email/
├── components/
│   ├── EmailComposer.tsx           # Main WYSIWYG composer (NEW)
│   ├── TipTapEditor.tsx            # TipTap wrapper (NEW)
│   ├── TipTapMenuBar.tsx           # Desktop toolbar (NEW)
│   ├── TipTapBubbleMenu.tsx        # Mobile floating toolbar (NEW)
│   ├── TemplateEditor.tsx          # Create/edit templates (NEW)
│   ├── TemplateList.tsx            # Browse/manage templates (NEW)
│   ├── TemplatePicker.tsx          # Select template in composer (NEW)
│   ├── VariableInserter.tsx        # Insert {{variables}} (NEW)
│   ├── ImageUploader.tsx           # Image upload UI (NEW)
│   ├── AttachmentManager.tsx       # File attachments UI (NEW)
│   ├── ScheduleEmailPicker.tsx     # Date/time picker (NEW)
│   ├── BulkEmailDialog.tsx         # Multi-recipient selector (NEW)
│   ├── QuotaIndicator.tsx          # Email quota display (NEW)
│   ├── EmailQueueMonitor.tsx       # Pending/failed emails (NEW)
│   ├── SignatureManager.tsx        # Signature CRUD (NEW)
│   ├── EmailTestInbox.tsx          # View test emails (NEW)
│   └── EmailConnectionManager.tsx  # OAuth (EXISTING from Phase 1)
├── services/
│   ├── templateService.ts          # Template CRUD (NEW)
│   ├── variableSubstitutionService.ts # Variable logic (NEW)
│   ├── sanitizationService.ts      # DOMPurify wrapper (NEW)
│   ├── imageUploadService.ts       # Image storage (NEW)
│   ├── attachmentService.ts        # Attachment storage (NEW)
│   ├── draftService.ts             # Draft auto-save (NEW)
│   ├── queueService.ts             # Queue management (NEW)
│   └── emailConnectionService.ts   # OAuth (EXISTING from Phase 1)
├── hooks/
│   ├── useTemplates.ts             # React Query hooks (NEW)
│   ├── useEmailQueue.ts            # Queue hooks (NEW)
│   ├── useEmailQuota.ts            # Quota hooks (NEW)
│   ├── useDrafts.ts                # Draft hooks (NEW)
│   └── useEmailConnection.ts       # OAuth hooks (EXISTING from Phase 1)
└── index.ts                        # Feature exports

src/features/recruiting/components/
└── ComposeEmailDialog.tsx          # REFACTOR to use EmailComposer
```

### Data Flow

```
User Interaction
     ↓
EmailComposer Component
     ↓
TipTapEditor (rich text editing)
     ↓
Auto-save Draft (debounced 3s) → email_queue (status='draft')
     ↓
User clicks "Send Now" or "Schedule"
     ↓
Sanitization Service (DOMPurify)
     ↓
HTML-to-Text Conversion
     ↓
Variable Substitution (client-side preview)
     ↓
Insert to email_queue (status='pending', scheduled_for)
     ↓
Edge Function: process-email-queue (cron)
     ↓
Fetch pending items where scheduled_for <= NOW()
     ↓
Variable Substitution (server-side with real data)
     ↓
Edge Function: send-email (Gmail API)
     ↓
Update email_queue (status='sent' or 'failed')
     ↓
Update email_quota_tracking
     ↓
Insert to user_emails
```

---

## Sub-Phases Breakdown

### Phase 2A: Foundation - Core Composer (Days 1-3)

**Goal:** Working WYSIWYG email composer with basic send functionality

**Tasks:**

1. **Install Packages**

   ```bash
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-underline dompurify html-to-text
   npm install --save-dev @types/dompurify
   ```

2. **Create Core Services**
   - `sanitizationService.ts` - DOMPurify wrapper
     - `sanitizeHtml(html: string): string`
     - `sanitizeForEmail(html: string): string` (stricter rules)
   - `htmlToTextService.ts` - html-to-text wrapper
     - `convertHtmlToText(html: string): string`

3. **Create TipTap Components**
   - `TipTapEditor.tsx` - Main editor component
     - Extensions: StarterKit, Link, Underline, Placeholder
     - Props: `value`, `onChange`, `placeholder`, `editable`
   - `TipTapMenuBar.tsx` - Desktop toolbar
     - Buttons: Bold, Italic, Underline, Link, Lists (ordered/unordered)
     - ARIA labels on all buttons
   - `TipTapBubbleMenu.tsx` - Mobile floating toolbar
     - Appears on text selection
     - Touch-friendly 44px buttons

4. **Create EmailComposer Component**

   ```tsx
   interface EmailComposerProps {
     to?: string[];
     cc?: string[];
     subject?: string;
     body?: string;
     context?: EmailComposerContext;
     onSend?: (email: SendEmailRequest) => void;
     onCancel?: () => void;
   }
   ```

   - Fields: To, CC, Subject, Body (TipTap)
   - Send/Cancel buttons
   - Character count display
   - Integrates with existing `useSendEmail` hook

5. **Refactor ComposeEmailDialog**
   - Import `EmailComposer`
   - Pass recruit context
   - Remove old textarea code
   - Keep recruit-specific logic (recipient auto-fill)

6. **Testing**
   - Unit tests for sanitization service
   - Unit tests for HTML-to-text conversion
   - Component tests for TipTapEditor
   - E2E test: Compose and send basic email

**Acceptance Criteria:**

- ✅ Can compose email with bold, italic, underline, links
- ✅ HTML is sanitized (no script tags)
- ✅ Plain text version is generated automatically
- ✅ Email sends successfully via Gmail API
- ✅ Recruiting's ComposeEmailDialog uses new EmailComposer
- ✅ All existing recruiting email functionality still works

---

### Phase 2B: Templates & Variables (Days 4-7)

**Goal:** Template management with variable substitution

**Tasks:**

1. **Create Template Service**
   - `templateService.ts`
     - `getTemplates(category?, isGlobal?): Promise<EmailTemplate[]>`
     - `getTemplateById(id): Promise<EmailTemplate>`
     - `createTemplate(data): Promise<EmailTemplate>`
     - `updateTemplate(id, data): Promise<EmailTemplate>`
     - `deleteTemplate(id): Promise<void>`
     - `incrementUsageCount(id): Promise<void>`

2. **Create Variable Substitution Service**
   - `variableSubstitutionService.ts`
     - `getAvailableVariables(context): TemplateVariable[]`
     - `substituteVariables(text, context, data): string`
     - `extractVariables(text): string[]` (find all {{var}} in text)
     - `fetchVariableData(context): Promise<Record<string, string>>`
       - Queries: `recruits`, `recruit_phases`, `user_profiles`
       - Returns: `{ recruit_name, recruit_email, phase_name, ... }`

3. **Create Template Components**
   - `TemplateEditor.tsx`
     - TipTap editor for template body
     - Subject field
     - Category dropdown
     - "Is Global" checkbox (admin only)
     - Variable inserter button
     - Save/Cancel buttons
   - `TemplateList.tsx`
     - Table: Name, Category, Usage Count, Actions
     - Filter by category
     - Edit/Delete/Duplicate actions
     - "Create Template" button
   - `TemplatePicker.tsx`
     - Dropdown/Modal to select template
     - Preview on hover
     - Insert template into composer
   - `VariableInserter.tsx`
     - Dropdown showing available variables
     - Click to insert `{{variable_name}}`
     - Shows variable description on hover

4. **Create React Query Hooks**
   - `useTemplates.ts`
     - `useTemplates(filters)`
     - `useTemplate(id)`
     - `useCreateTemplate()`
     - `useUpdateTemplate()`
     - `useDeleteTemplate()`

5. **Integrate with EmailComposer**
   - Add TemplatePicker button
   - Add VariableInserter button
   - Add preview mode (substitutes variables)
   - Show warning if variables missing in context

6. **Add Templates Management to Settings**
   - New "Email Templates" tab in Settings page
   - Shows TemplateList component
   - Admin can create global templates
   - All users can create personal templates

7. **Testing**
   - Unit tests for variable substitution
   - Unit tests for template service
   - Integration tests for template CRUD
   - E2E test: Create template, use in email, send

**Acceptance Criteria:**

- ✅ Can create/edit/delete email templates
- ✅ Template picker shows available templates
- ✅ Variables substitute correctly in preview
- ✅ Variables substitute correctly in sent email
- ✅ RLS policies prevent unauthorized template access
- ✅ Admin can create global templates
- ✅ Regular users can only create personal templates
- ✅ Template usage count increments on use

---

### Phase 2C: Advanced Features (Days 8-13)

**Goal:** Drafts, attachments, scheduling, replies

**Tasks:**

1. **Image Upload Implementation**
   - Create Supabase Storage bucket: `email-images`
     ```sql
     -- In Supabase dashboard or migration
     INSERT INTO storage.buckets (id, name, public) VALUES ('email-images', 'email-images', true);
     ```
   - `imageUploadService.ts`
     - `uploadImage(file: File): Promise<string>` (returns public URL)
     - `deleteImage(url: string): Promise<void>`
     - `cleanupOrphanedImages(): Promise<void>` (cron job)
   - `ImageUploader.tsx` component
     - Drag-drop or file picker
     - Progress indicator
     - Image preview
   - Integrate TipTap Image extension
     - Custom upload handler uses imageUploadService

2. **File Attachments Implementation**
   - Create database table:
     ```sql
     CREATE TABLE user_email_attachments (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email_id UUID REFERENCES user_emails(id) ON DELETE CASCADE,
       file_name TEXT NOT NULL,
       file_size INTEGER NOT NULL,
       mime_type TEXT NOT NULL,
       storage_path TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```
   - Create Storage bucket: `email-attachments`
   - `attachmentService.ts`
     - `uploadAttachment(file: File): Promise<Attachment>`
     - `deleteAttachment(id: string): Promise<void>`
     - `getAttachments(emailId): Promise<Attachment[]>`
   - `AttachmentManager.tsx` component
     - Drag-drop or file picker
     - List of attached files (name, size, remove button)
     - 25MB total limit validation
   - Update Edge Function `send-email`
     - Fetch attachments from Storage
     - Base64-encode for Gmail API

3. **Draft Auto-Save Implementation**
   - `draftService.ts`
     - `saveDraft(email): Promise<void>`
     - `getDrafts(): Promise<EmailQueueItem[]>`
     - `getDraft(id): Promise<EmailQueueItem>`
     - `deleteDraft(id): Promise<void>`
   - `useDrafts.ts` hook
     - `useSaveDraft()` - debounced mutation (3s)
     - `useDrafts()` - query for user's drafts
   - Update EmailComposer
     - Auto-save on subject/body change (debounced)
     - Show "Draft saved" indicator
     - Load draft on open (if draftId provided)
     - "Discard draft" button

4. **Email Scheduling Implementation**
   - `ScheduleEmailPicker.tsx`
     - Date picker (react-datepicker or shadcn calendar)
     - Time picker
     - Quick options: "Tomorrow 9am", "Next week"
     - Timezone display
   - Update EmailComposer
     - "Send Now" vs "Schedule" toggle
     - Show ScheduleEmailPicker when scheduling
   - Create Edge Function: `process-email-queue`
     ```typescript
     // supabase/functions/process-email-queue/index.ts
     // Runs every 1 minute via cron
     // Fetches pending emails where scheduled_for <= NOW()
     // Calls send-email for each
     // Updates status to 'sent' or 'failed'
     ```
   - Set up Supabase cron job

5. **Reply/Reply All Implementation**
   - Update EmailComposer to accept `replyToEmailId` prop
   - When replying:
     - Pre-fill To (from original sender)
     - Pre-fill CC (for Reply All)
     - Pre-fill Subject with "Re: ..."
     - Insert quoted original text in TipTap blockquote
   - Update send-email Edge Function
     - Add In-Reply-To header
     - Add References header
     - Set thread_id

6. **Email Queue Management**
   - `queueService.ts`
     - `getQueueItems(filters): Promise<EmailQueueItem[]>`
     - `cancelQueueItem(id): Promise<void>`
     - `retryQueueItem(id): Promise<void>`
   - `useEmailQueue.ts` hook
     - `useEmailQueue(filters)`
     - `useCancelEmail()`
     - `useRetryEmail()`
   - `EmailQueueMonitor.tsx` component
     - Table: Subject, Recipient, Scheduled, Status
     - Filter: Pending, Failed
     - Actions: Cancel, Retry, View Details

7. **Error Handling & Retry Logic**
   - Update process-email-queue Edge Function
     - Try/catch around send
     - On failure:
       - Increment `attempts`
       - Store error in `error_message`
       - If attempts < max_attempts:
         - Calculate retry time (exponential backoff)
         - Update `scheduled_for`
       - If attempts >= max_attempts:
         - Set status='failed'
   - Add toast notifications to UI
     - Success: "Email sent successfully"
     - Failed: "Email failed to send. View details"

8. **Testing**
   - Unit tests for draft service
   - Unit tests for attachment service
   - Integration test: Auto-save draft
   - Integration test: Schedule email
   - Integration test: Reply to email
   - E2E test: Full email flow with attachments

**Acceptance Criteria:**

- ✅ Images upload to Storage and display in email
- ✅ Attachments upload and send with email (under 25MB)
- ✅ Drafts auto-save every 3 seconds
- ✅ Draft recovery works on browser crash/refresh
- ✅ Can schedule emails for future date/time
- ✅ Scheduled emails send at correct time
- ✅ Reply includes quoted original text
- ✅ Reply sets correct threading headers
- ✅ Failed emails retry with exponential backoff
- ✅ Can view/cancel/retry pending/failed emails

---

### Phase 2D: Bulk Sending & Polish (Days 14-18)

**Goal:** Production-ready polish and advanced features

**Tasks:**

1. **Email Signatures Implementation**
   - Create database table:

     ```sql
     CREATE TABLE user_email_signatures (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       signature_html TEXT NOT NULL,
       signature_text TEXT NOT NULL,
       is_default BOOLEAN DEFAULT false,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
     );

     -- Only one default signature per user
     CREATE UNIQUE INDEX idx_user_default_signature
       ON user_email_signatures(user_id)
       WHERE is_default = true;
     ```

   - `SignatureManager.tsx` in Settings
     - List of user's signatures
     - Create/Edit/Delete
     - Set as default
     - Preview
   - Update EmailComposer
     - Checkbox: "Include signature"
     - Dropdown: Select signature (if multiple)
     - Auto-insert default signature on compose
     - Signature appears in preview

2. **Bulk Email Implementation**
   - `BulkEmailDialog.tsx`
     - Recipient selector (checkboxes from recruits list)
     - Shows count: "Send to X recruits"
     - Template picker (required for bulk)
     - Preview with first recruit's data
     - Send button
   - Bulk send logic:
     - Loop through recipients
     - Create one email_queue item per recipient
     - Each item has personalized variables
     - Status indicator: "Creating emails... X of Y"
   - Update process-email-queue
     - Batch processing: Max 50/hour
     - Track bulk_send_id to group related emails
     - Individual failures don't stop batch
   - `BulkSendProgress.tsx` component
     - Shows progress: "Sent X of Y"
     - List of failures with retry button

3. **Email Quota Implementation**
   - `QuotaIndicator.tsx` component
     - Displays: "X / 500 emails sent today"
     - Color-coded:
       - Green: < 80% (< 400)
       - Yellow: 80-95% (400-475)
       - Red: > 95% (> 475)
     - Shows next reset time
   - `useEmailQuota.ts` hook
     - `useEmailQuota()` - query current quota
     - Fetches from `email_quota_tracking`
     - Calls `check_email_quota()` function
   - Update EmailComposer
     - Show QuotaIndicator
     - Disable send if quota exceeded
     - Warning message when near limit

4. **Mobile Responsive Design**
   - Update TipTapEditor
     - Desktop (>768px): Fixed MenuBar
     - Mobile (<768px): BubbleMenu on selection
   - Update EmailComposer dialog
     - Mobile: Full-screen dialog
     - Desktop: Max-w-2xl centered dialog
   - Touch targets: Min 44px
   - Test on:
     - iPhone 12 (390x844)
     - iPhone SE (375x667)
     - iPad (768x1024)
     - Android (360x640)

5. **Accessibility Audit & Fixes**
   - Install axe-core for automated testing
   - Add ARIA labels:
     - All toolbar buttons
     - Form fields
     - Dialogs
   - Keyboard navigation:
     - Tab through all controls
     - Enter to submit
     - Escape to cancel
   - Focus management:
     - Focus trap in dialogs
     - Return focus on close
   - Screen reader testing:
     - VoiceOver (Mac)
     - NVDA (Windows)
   - Fix any issues found

6. **Bundle Size Optimization**
   - Lazy load EmailComposer:
     ```tsx
     const EmailComposer = lazy(() => import("./components/EmailComposer"));
     ```
   - Review TipTap extensions:
     - Remove unused: Color, TextAlign (if not needed)
     - Only import what's used
   - Check bundle:
     ```bash
     npm run build
     npx vite-bundle-visualizer
     ```
   - Target: TipTap adds < 300KB gzipped

7. **Test Mode Implementation**
   - Add env var: `VITE_EMAIL_TEST_MODE=true`
   - Create table:
     ```sql
     CREATE TABLE test_emails (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES user_profiles(id),
       to_addresses TEXT[],
       subject TEXT,
       body_html TEXT,
       body_text TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```
   - `EmailTestInbox.tsx` component
     - List of test emails
     - View email in modal
     - Clear test inbox button
   - Update send flow:
     - If test mode → Insert to test_emails, don't actually send
     - Show "TEST MODE" badge in composer

8. **Final Polish**
   - Add loading states everywhere
   - Add error boundaries
   - Add empty states (no templates, no drafts, etc.)
   - Add confirmation dialogs (delete template, discard draft)
   - Add tooltips for all buttons
   - Consistent spacing/styling
   - Responsive images in emails

9. **Comprehensive Testing**
   - Unit test coverage > 80%
   - E2E tests for all flows
   - Visual regression tests (Storybook)
   - Cross-browser testing
   - Mobile testing
   - Accessibility testing
   - Performance testing (Lighthouse)

**Acceptance Criteria:**

- ✅ Can create and manage email signatures
- ✅ Signatures auto-insert in emails
- ✅ Can send bulk emails to 10+ recruits
- ✅ Bulk send shows progress and handles failures
- ✅ Quota indicator shows correct count and colors
- ✅ Cannot send when quota exceeded
- ✅ Mobile UI is fully functional and touch-friendly
- ✅ All interactive elements are keyboard accessible
- ✅ Screen readers can navigate and use composer
- ✅ Bundle size increase is acceptable (< 300KB)
- ✅ Test mode works for development/testing
- ✅ All tests pass
- ✅ Lighthouse score > 90

---

## Database Changes

### New Tables (Migrations Needed)

**1. user_email_attachments**

```sql
-- File: supabase/migrations/20251129_003_create_user_email_attachments.sql

CREATE TABLE IF NOT EXISTS user_email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES user_emails(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_email ON user_email_attachments(email_id);

-- RLS
ALTER TABLE user_email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email attachments" ON user_email_attachments
  FOR SELECT USING (
    email_id IN (SELECT id FROM user_emails WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own email attachments" ON user_email_attachments
  FOR INSERT WITH CHECK (
    email_id IN (SELECT id FROM user_emails WHERE user_id = auth.uid())
  );
```

**2. user_email_signatures**

```sql
-- File: supabase/migrations/20251129_004_create_user_email_signatures.sql

CREATE TABLE IF NOT EXISTS user_email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  signature_html TEXT NOT NULL,
  signature_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default signature per user
CREATE UNIQUE INDEX idx_user_default_signature
  ON user_email_signatures(user_id)
  WHERE is_default = true;

CREATE INDEX idx_signatures_user ON user_email_signatures(user_id);

-- RLS
ALTER TABLE user_email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own signatures" ON user_email_signatures
  FOR ALL USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER trigger_signatures_updated_at
  BEFORE UPDATE ON user_email_signatures
  FOR EACH ROW EXECUTE FUNCTION update_email_tables_updated_at();
```

**3. test_emails (for test mode)**

```sql
-- File: supabase/migrations/20251129_005_create_test_emails.sql

CREATE TABLE IF NOT EXISTS test_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  to_addresses TEXT[],
  cc_addresses TEXT[],
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_emails_user ON test_emails(user_id);

-- RLS
ALTER TABLE test_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own test emails" ON test_emails
  FOR ALL USING (user_id = auth.uid());
```

### Storage Buckets

Create via Supabase Dashboard or SQL:

```sql
-- email-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-images', 'email-images', true);

-- email-attachments bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false);
```

### Edge Functions

**New Edge Function: process-email-queue**

File: `supabase/functions/process-email-queue/index.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch pending emails where scheduled_for <= NOW()
  const { data: queueItems, error } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .limit(50); // Process max 50 per run

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  const results = [];

  for (const item of queueItems) {
    // Update to processing
    await supabase
      .from("email_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    try {
      // Call send-email Edge Function
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            userId: item.sender_user_id,
            to: [item.recipient_user_id], // Or get email from user_profiles
            subject: item.subject,
            bodyHtml: item.body_html,
            // ... other fields
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        // Update to sent
        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            email_id: result.emailId,
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "sent" });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Increment attempts
      const newAttempts = item.attempts + 1;
      const maxAttempts = item.max_attempts || 3;

      if (newAttempts >= maxAttempts) {
        // Max attempts reached, mark as failed
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            attempts: newAttempts,
            error_message: error.message,
          })
          .eq("id", item.id);
      } else {
        // Retry with exponential backoff
        const retryMinutes = Math.pow(2, newAttempts) * 5; // 5min, 10min, 20min
        const retryTime = new Date(Date.now() + retryMinutes * 60 * 1000);

        await supabase
          .from("email_queue")
          .update({
            status: "pending",
            attempts: newAttempts,
            error_message: error.message,
            scheduled_for: retryTime.toISOString(),
          })
          .eq("id", item.id);
      }

      results.push({ id: item.id, status: "failed", error: error.message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }));
});
```

**Deploy and set up cron:**

```bash
supabase functions deploy process-email-queue
supabase functions invoke process-email-queue --method POST

# Set up cron in Supabase Dashboard:
# Go to Database > Cron Jobs
# Schedule: */1 * * * * (every minute)
# Function: process-email-queue
```

---

## Package Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "@tiptap/react": "^2.1.13",
    "@tiptap/starter-kit": "^2.1.13",
    "@tiptap/extension-link": "^2.1.13",
    "@tiptap/extension-image": "^2.1.13",
    "@tiptap/extension-placeholder": "^2.1.13",
    "@tiptap/extension-underline": "^2.1.13",
    "dompurify": "^3.0.6",
    "html-to-text": "^9.0.5"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5"
  }
}
```

**NOT including** (to reduce bundle size):

- `@tiptap/extension-color` - Not needed for emails
- `@tiptap/extension-text-align` - Basic left-align is fine
- `@tiptap/extension-text-style` - Covered by StarterKit

### Optional (Phase 3)

For future enhancements:

- `@tiptap/extension-table` - Tables in emails
- `@tiptap/extension-collaboration` - Real-time collaboration

---

## Testing Strategy

### Unit Tests

**Services:**

- `sanitizationService.test.ts`
  - Removes `<script>` tags
  - Removes `onclick` handlers
  - Allows safe HTML (bold, links, etc.)
- `htmlToTextService.test.ts`
  - Converts `<p>` to paragraphs
  - Converts `<a>` to [text](url)
  - Handles lists properly
- `variableSubstitutionService.test.ts`
  - Substitutes `{{recruit_name}}` correctly
  - Handles missing variables gracefully
  - Escapes HTML in variable values

**Hooks:**

- `useTemplates.test.ts`
  - Fetches templates correctly
  - Filters by category
  - Handles errors

### Integration Tests

**Template CRUD:**

- Create template → Appears in list
- Update template → Changes saved
- Delete template → Removed from list
- RLS: Can't edit others' templates

**Draft Auto-Save:**

- Type in composer → Draft saves after 3s
- Refresh page → Draft loads
- Send email → Draft deleted

**Queue Processing:**

- Schedule email → Appears in queue
- Wait for scheduled time → Email sends
- Failed email → Retries with backoff

### Component Tests (React Testing Library)

**EmailComposer:**

- Renders all fields
- Typing updates state
- Send button disabled when invalid
- Template picker inserts template
- Variable inserter adds variable

**TemplateList:**

- Displays templates
- Filter works
- Edit button opens editor
- Delete shows confirmation

### E2E Tests (Playwright)

**Flow 1: Compose and Send**

1. Open composer
2. Type subject and body
3. Add formatting (bold, link)
4. Click send
5. Verify email in queue
6. Verify sent successfully

**Flow 2: Use Template**

1. Open Settings → Templates
2. Create new template with variables
3. Open composer
4. Select template
5. Preview shows substituted variables
6. Send email
7. Verify received email has correct content

**Flow 3: Schedule Email**

1. Open composer
2. Write email
3. Click "Schedule"
4. Pick future date/time
5. Verify in queue with correct scheduled_for
6. (Mock cron) Process queue
7. Verify email sent at correct time

**Flow 4: Bulk Send**

1. Open recruiting page
2. Click "Bulk Email"
3. Select 5 recruits
4. Pick template
5. Preview shows personalized content for first recruit
6. Click "Send to 5 recruits"
7. Verify 5 queue items created
8. Process queue
9. Verify all 5 sent with personalized content

### Visual Regression Tests (Storybook)

Stories for:

- TipTapEditor (empty, with content)
- EmailComposer (desktop, mobile)
- TemplateList (empty, with items)
- TemplatePicker (few templates, many templates)

Use Chromatic or Percy for visual diffs.

### Accessibility Tests

**Automated (axe-core):**

```typescript
import { axe } from 'jest-axe'

test('EmailComposer has no a11y violations', async () => {
  const { container } = render(<EmailComposer />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

**Manual:**

- VoiceOver (Mac): Navigate composer, announce formatting
- NVDA (Windows): Same as VoiceOver
- Keyboard only: Tab through, Enter to send, Escape to cancel

### Performance Tests

**Lighthouse:**

- Performance score > 90
- Accessibility score > 95
- Best Practices score > 90

**Bundle size:**

```bash
npm run build
ls -lh dist/assets/*.js
```

Target: Main bundle < 500KB gzipped

### Cross-Browser Testing

**Desktop:**

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Mobile:**

- iOS Safari (iPhone 12, iPhone SE)
- Android Chrome (Pixel 5)

---

## Acceptance Criteria

### Phase 2A: Foundation ✅

- [ ] Can compose email with bold, italic, underline, links
- [ ] HTML is sanitized (no script tags, no event handlers)
- [ ] Plain text version is generated automatically
- [ ] Email sends successfully via Gmail API
- [ ] Recruiting's ComposeEmailDialog uses new EmailComposer
- [ ] All existing recruiting email functionality still works
- [ ] Unit tests pass for sanitization and HTML-to-text
- [ ] E2E test passes for basic email send

### Phase 2B: Templates & Variables ✅

- [ ] Can create/edit/delete email templates
- [ ] Template picker shows available templates (global + personal)
- [ ] Variables substitute correctly in preview (client-side)
- [ ] Variables substitute correctly in sent email (server-side)
- [ ] RLS policies prevent unauthorized template access
- [ ] Admin can create global templates
- [ ] Regular users can only create personal templates
- [ ] Template usage count increments on use
- [ ] Variable inserter shows available variables based on context
- [ ] Missing variables show warning (don't break email)
- [ ] Templates stored with both HTML and plain text
- [ ] Integration tests pass for template CRUD

### Phase 2C: Advanced Features ✅

- [ ] Images upload to Supabase Storage
- [ ] Images display correctly in email preview
- [ ] Images render in sent emails
- [ ] Attachments upload to Storage (max 25MB)
- [ ] Attachments send with email via Gmail API
- [ ] Attachments display correctly in sent emails
- [ ] Drafts auto-save every 3 seconds
- [ ] Draft recovery works on browser crash/refresh
- [ ] Can schedule emails for future date/time
- [ ] Scheduled emails send at correct time (via cron)
- [ ] Reply button pre-fills with original sender
- [ ] Reply includes quoted original text
- [ ] Reply sets correct threading headers (In-Reply-To, References)
- [ ] Reply All includes all CC recipients
- [ ] Failed emails retry with exponential backoff (5min, 10min, 20min)
- [ ] Max retry attempts respected (default 3)
- [ ] Can view pending/failed emails in queue monitor
- [ ] Can cancel scheduled emails
- [ ] Can retry failed emails
- [ ] Toast notifications show success/failure
- [ ] OAuth token refresh works on 401 errors
- [ ] Integration tests pass for all advanced features

### Phase 2D: Bulk Sending & Polish ✅

- [ ] Can create and manage email signatures
- [ ] Signatures auto-insert in emails (if enabled)
- [ ] Can have multiple signatures, select which to use
- [ ] One default signature per user enforced
- [ ] Can send bulk emails to 10+ recruits
- [ ] Bulk send shows progress: "Sent X of Y"
- [ ] Bulk send handles individual failures (doesn't stop batch)
- [ ] Each bulk email is personalized with correct variables
- [ ] Quota indicator shows correct count
- [ ] Quota indicator color-coded (green/yellow/red)
- [ ] Cannot send when quota exceeded
- [ ] Warning shown when approaching quota limit
- [ ] Mobile UI is fully functional (TipTap works on touch)
- [ ] Mobile toolbar uses BubbleMenu (floating on selection)
- [ ] All touch targets are 44px minimum
- [ ] All interactive elements are keyboard accessible
- [ ] Screen readers can navigate and use composer
- [ ] ARIA labels on all buttons
- [ ] Focus management in dialogs (trap focus, return on close)
- [ ] axe-core reports no violations
- [ ] Bundle size increase is acceptable (< 300KB gzipped)
- [ ] Test mode works (emails go to test_emails table)
- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Visual regression tests pass (Storybook)
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing complete (iOS, Android)
- [ ] Lighthouse score: Performance > 90, Accessibility > 95

---

## Risk Mitigation

### Technical Risks

**Risk 1: TipTap bundle size too large**

- **Impact:** High (slow page loads)
- **Likelihood:** Medium
- **Mitigation:**
  - Lazy load EmailComposer
  - Only import needed extensions
  - Monitor with vite-bundle-visualizer
  - Target: < 300KB gzipped
- **Fallback:** If still too large, consider simpler editor (react-quill)

**Risk 2: Email sending failures due to OAuth token expiry**

- **Impact:** High (emails don't send)
- **Likelihood:** Medium
- **Mitigation:**
  - Implement token refresh on 401 errors
  - Queue system retries automatically
  - Monitor token expiry, refresh proactively
- **Fallback:** User re-authorizes OAuth in Settings

**Risk 3: Gmail API rate limits exceeded**

- **Impact:** Medium (temporary send failures)
- **Likelihood:** Low (quota tracking should prevent)
- **Mitigation:**
  - Quota tracking table
  - Disable send button when near limit
  - Batch bulk sends at 50/hour
  - Monitor quota in real-time
- **Fallback:** Show error message, retry next day

**Risk 4: Variable substitution errors (missing data)**

- **Impact:** Medium (emails have blank variables)
- **Likelihood:** Medium
- **Mitigation:**
  - Validate context before send
  - Show warnings for missing variables
  - Fallback values (e.g., "Recruit" if name missing)
  - Preview mode shows what will be sent
- **Fallback:** User manually edits before sending

**Risk 5: XSS vulnerabilities in rich text**

- **Impact:** Critical (security breach)
- **Likelihood:** Low (if DOMPurify used correctly)
- **Mitigation:**
  - Use DOMPurify on all HTML input
  - Sanitize before DB storage
  - Sanitize again before email send
  - Security code review
- **Fallback:** Revert to plain text if vulnerability found

### Schedule Risks

**Risk 1: Phase takes longer than estimated (14-18 days)**

- **Impact:** Medium (delayed feature launch)
- **Likelihood:** Medium
- **Mitigation:**
  - Break into sub-phases (can ship 2A, 2B first)
  - Prioritize critical features (2A, 2B)
  - Defer polish (2D) if needed
- **Fallback:** Ship MVP (2A + 2B only), do 2C/2D in Phase 3

**Risk 2: Blocked by Supabase limitations**

- **Impact:** High (can't proceed)
- **Likelihood:** Low
- **Mitigation:**
  - Verify Supabase Storage limits early
  - Check Edge Function timeout limits (10 min max)
  - Test cron job reliability
- **Fallback:** Use alternative (AWS S3 for storage, separate server for cron)

### UX Risks

**Risk 1: TipTap too complex for non-technical users**

- **Impact:** Medium (low adoption)
- **Likelihood:** Low
- **Mitigation:**
  - User testing with target users
  - Simplified toolbar (only essential buttons)
  - Tooltips and help text
  - Template library for quick start
- **Fallback:** Add "Simple Mode" (plain text) toggle

**Risk 2: Mobile UX is poor**

- **Impact:** Medium (mobile users frustrated)
- **Likelihood:** Medium
- **Mitigation:**
  - Use BubbleMenu for mobile
  - Test on real devices early
  - Touch-friendly 44px targets
  - Responsive layout
- **Fallback:** Disable composer on mobile, show "Use desktop" message

---

## Future Considerations (Phase 3)

Features deferred to Phase 3:

**1. Incoming Email Sync**
- Sync emails from Gmail to `user_emails` table
- Gmail Watch API (infrastructure exists from Phase 1)
- Email inbox UI
- Unread count badge

**2. Advanced Templates**
- Conditional content (if/else logic)
- Loops (repeat sections)
- Template inheritance (base template + variations)

**3. Email Collaboration**
- Shared drafts
- Comments on emails
- Approval workflow

**4. Email Search**
- Full-text search across `user_emails`
- Filters: Date range, sender, status
- Saved searches

**5. Email Rules/Filters**
- Auto-label incoming emails
- Auto-forward to team members
- Auto-archive after X days

---

## NEW: Recipient Groups Database Schema

```sql
-- Migration: YYYYMMDD_001_email_recipient_groups.sql

-- Recipient groups (static or dynamic)
CREATE TABLE email_recipient_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'static', -- 'static' | 'dynamic'
  filter_config JSONB, -- For dynamic: {"phase_id": "...", "status": "active", "state": "NY"}
  color TEXT, -- For UI display
  icon TEXT,  -- Lucide icon name
  member_count INTEGER DEFAULT 0, -- Cached count for static groups
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Static group members
CREATE TABLE email_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES email_recipient_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX idx_email_recipient_groups_active ON email_recipient_groups(is_active) WHERE is_active = true;
CREATE INDEX idx_email_recipient_groups_type ON email_recipient_groups(group_type);
CREATE INDEX idx_email_group_members_group ON email_group_members(group_id);
CREATE INDEX idx_email_group_members_user ON email_group_members(user_id);

-- RLS Policies
ALTER TABLE email_recipient_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage groups"
  ON email_recipient_groups FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage group members"
  ON email_group_members FOR ALL
  USING (auth.role() = 'authenticated');
```

---

## NEW: Campaign Builder Database Schema

```sql
-- Migration: YYYYMMDD_002_email_campaigns.sql

CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- 'recruit_created', 'phase_started', 'manual'
  trigger_config JSONB, -- {"phase_id": "..."} for phase-specific
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE email_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  template_id UUID NOT NULL REFERENCES email_templates(id),
  delay_value INTEGER NOT NULL DEFAULT 0,
  delay_unit TEXT NOT NULL DEFAULT 'days', -- minutes, hours, days
  send_conditions JSONB, -- {"only_if_opened_previous": true}
  stop_conditions JSONB, -- {"if_replied": true, "if_unsubscribed": true}
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, step_order)
);

CREATE TABLE email_campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, stopped, unsubscribed
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stopped_reason TEXT,
  UNIQUE(campaign_id, user_id)
);

-- Indexes
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaign_steps_campaign ON email_campaign_steps(campaign_id);
CREATE INDEX idx_email_campaign_enrollments_active ON email_campaign_enrollments(status) WHERE status = 'active';

-- RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage campaigns"
  ON email_campaigns FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage campaign steps"
  ON email_campaign_steps FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage enrollments"
  ON email_campaign_enrollments FOR ALL USING (auth.role() = 'authenticated');
```

---

## NEW: Modern Font System

Replace old fonts in `src/types/email.types.ts`:

```typescript
// Modern email-safe fonts with Google Fonts + fallbacks
export type EmailFontFamily =
  | "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  | "'Roboto', Arial, sans-serif"
  | "'Open Sans', Helvetica, sans-serif"
  | "'Lato', 'Helvetica Neue', sans-serif"
  | "'Montserrat', Arial, sans-serif"
  | "'Poppins', sans-serif"
  | "'Source Sans Pro', Arial, sans-serif"
  | "'Nunito', sans-serif"
  | "'Playfair Display', Georgia, serif"
  | "'Merriweather', Georgia, serif"
  | "Georgia, serif"  // Keep one classic serif
  | "Arial, sans-serif"  // Keep one classic sans

export type EmailFontWeight = 400 | 500 | 600 | 700

export interface FontOption {
  value: EmailFontFamily
  label: string
  weights: EmailFontWeight[]
  preview: string // Sample text to show
}

export const MODERN_EMAIL_FONTS: FontOption[] = [
  { value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", label: 'Inter', weights: [400, 500, 600, 700], preview: 'The quick brown fox' },
  { value: "'Roboto', Arial, sans-serif", label: 'Roboto', weights: [400, 500, 700], preview: 'The quick brown fox' },
  { value: "'Open Sans', Helvetica, sans-serif", label: 'Open Sans', weights: [400, 600, 700], preview: 'The quick brown fox' },
  { value: "'Lato', 'Helvetica Neue', sans-serif", label: 'Lato', weights: [400, 700], preview: 'The quick brown fox' },
  { value: "'Montserrat', Arial, sans-serif", label: 'Montserrat', weights: [400, 500, 600, 700], preview: 'The quick brown fox' },
  { value: "'Poppins', sans-serif", label: 'Poppins', weights: [400, 500, 600, 700], preview: 'The quick brown fox' },
  { value: "'Source Sans Pro', Arial, sans-serif", label: 'Source Sans Pro', weights: [400, 600, 700], preview: 'The quick brown fox' },
  { value: "'Nunito', sans-serif", label: 'Nunito', weights: [400, 600, 700], preview: 'The quick brown fox' },
  { value: "'Playfair Display', Georgia, serif", label: 'Playfair Display', weights: [400, 700], preview: 'The quick brown fox' },
  { value: "'Merriweather', Georgia, serif", label: 'Merriweather', weights: [400, 700], preview: 'The quick brown fox' },
]
```

---

## REVISED Sub-Phases (Including New Requirements)

### Phase 2A-FIX: Fix Broken Features (Days 1-3) ⚡ PRIORITY

**Goal:** Fix critical broken functionality before adding new features

**Tasks:**

1. **Fix Font System**
   - Update `src/types/email.types.ts` with modern fonts
   - Create `FontPicker.tsx` with visual preview
   - Update `BlockStylePanel.tsx` to use FontPicker
   - Add Google Fonts import to email HTML output

2. **Add Subject Line to Template Builder**
   - Create `SubjectEditor.tsx` component
   - Add to `EmailBlockBuilder.tsx` header area
   - Support variable insertion in subject
   - Add to template save/load

3. **Fix HTML Output**
   - Update `BlockPreview.tsx` → `blocksToHtml()` function
   - Apply ALL styles as inline CSS:
     - font-family, font-size, font-weight
     - color, background-color
     - line-height, letter-spacing
     - text-align, padding
     - border styles
   - Test output in Gmail/Outlook

4. **Connect DB Templates to ComposeEmailDialog**
   - Remove hardcoded templates from `ComposeEmailDialog.tsx`
   - Use `useEmailTemplates()` hook
   - Add TemplatePicker component
   - Integrate with EmailBlockBuilder

**Acceptance Criteria:**
- ✅ Fonts show preview and apply to HTML output
- ✅ Subject line saves with template
- ✅ All block styles appear in sent emails
- ✅ ComposeEmailDialog uses database templates

---

### Phase 2A: Foundation (Days 4-6) - ORIGINAL SCOPE

*Keep existing Phase 2A content - TipTap, sanitization, etc.*

---

### Phase 2B: Templates & Variables (Days 7-10) - ORIGINAL SCOPE

*Keep existing Phase 2B content*

---

### Phase 2C: Advanced Features (Days 11-15) - ORIGINAL SCOPE

*Keep existing Phase 2C content - drafts, attachments, scheduling*

---

### Phase 2D: Bulk Sending & Polish (Days 16-18) - ORIGINAL SCOPE

*Keep existing Phase 2D content*

---

### Phase 2E: Recipients & Groups (Days 19-21) 🆕

**Goal:** Multi-recipient selection and group management

**Tasks:**

1. **Database Migration**
   - Create `email_recipient_groups` table
   - Create `email_group_members` table
   - Add RLS policies

2. **Recipient Group Service**
   - `recipientGroupService.ts`
     - `getGroups()`, `createGroup()`, `updateGroup()`, `deleteGroup()`
     - `getGroupMembers()`, `addMember()`, `removeMember()`
     - `getDynamicGroupMembers(filterConfig)` - resolve dynamic groups
   - `useRecipientGroups.ts` hook

3. **RecipientSelector Component**
   - Multi-select with search
   - Quick filters (All, By Phase, By Status)
   - Group selection dropdown
   - Recent recipients
   - CC/BCC toggle
   - Selected count badge

4. **GroupManager Page**
   - `/settings/email-groups` route
   - List all groups with member count
   - Create/Edit group dialog
   - Static: manually add/remove members
   - Dynamic: configure filter rules
   - Preview members before save

5. **Integration**
   - Add RecipientSelector to EmailComposer
   - Add RecipientSelector to BulkEmailDialog
   - Update send logic to handle multiple recipients

**Acceptance Criteria:**
- ✅ Can create static groups and add members
- ✅ Can create dynamic groups with filters
- ✅ RecipientSelector shows groups and individuals
- ✅ Can send to multiple recipients at once
- ✅ CC/BCC works correctly

---

### Phase 2F: Automation & Triggers (Days 22-25) 🆕

**Goal:** Visual automation builder for email triggers

**Tasks:**

1. **Automation Service**
   - `emailTriggerService.ts`
     - `getTriggers()`, `createTrigger()`, `updateTrigger()`, `deleteTrigger()`
     - `toggleTrigger(id, isActive)`
     - `testTrigger(id)` - send test email
   - `useEmailTriggers.ts` hook

2. **TriggerBuilder Component**
   - Trigger type selector:
     - Phase started/completed/blocked
     - Checklist item completed/approved/rejected
     - Recruit graduated
     - Days in phase (delayed)
     - Days inactive
   - Phase/checklist picker (optional)
   - Template selector with preview
   - Delay configuration (immediate, or after X min/hr/day)
   - Enable/disable toggle

3. **Automation Dashboard Page**
   - `/email/automation` route
   - List all triggers with stats
   - Quick enable/disable
   - Edit/Duplicate/Delete actions
   - "Test Trigger" button

4. **Backend Processing**
   - Edge Function: `process-email-triggers`
   - Listens to database webhooks
   - Matches events to active triggers
   - Queues emails with delays
   - Handles variable substitution

**Acceptance Criteria:**
- ✅ Can create triggers for phase changes
- ✅ Can configure delay before sending
- ✅ Triggers fire automatically when events occur
- ✅ Can test triggers before enabling
- ✅ Can view trigger statistics

---

### Phase 2G: Campaigns & Analytics (Days 26-30) 🆕

**Goal:** Drip campaigns and email performance tracking

**Tasks:**

1. **Campaign Database Migration**
   - Create `email_campaigns` table
   - Create `email_campaign_steps` table
   - Create `email_campaign_enrollments` table

2. **Campaign Builder**
   - Visual step-by-step builder
   - Drag to reorder steps
   - Template selector per step
   - Delay configuration per step
   - Stop conditions (if replied, etc.)

3. **Campaign Dashboard**
   - `/email/campaigns` route
   - List campaigns with status
   - Enrollment counts
   - Activate/Pause controls

4. **Email Analytics**
   - Add tracking pixel for opens (optional, privacy toggle)
   - Click tracking via link wrapping
   - Analytics dashboard:
     - Sends/Opens/Clicks over time
     - Per-template performance
     - Best performing subject lines
     - Optimal send times

**Acceptance Criteria:**
- ✅ Can create multi-step campaigns
- ✅ Campaigns auto-enroll recruits on trigger
- ✅ Steps execute with configured delays
- ✅ Analytics show email performance
- ✅ Can see which templates perform best

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review this plan with stakeholders
- [ ] Verify Phase 1 is fully deployed and working
- [ ] Confirm OAuth is working (test send email)
- [ ] Backup production database
- [ ] Create feature branch: `feature/email-phase-2`

### Phase 2A (Days 1-3)

- [ ] Install TipTap packages
- [ ] Install DOMPurify and html-to-text
- [ ] Create sanitizationService.ts
- [ ] Create htmlToTextService.ts
- [ ] Create TipTapEditor.tsx
- [ ] Create TipTapMenuBar.tsx
- [ ] Create TipTapBubbleMenu.tsx
- [ ] Create EmailComposer.tsx
- [ ] Refactor ComposeEmailDialog.tsx
- [ ] Write unit tests
- [ ] Write component tests
- [ ] Write E2E test
- [ ] Manual testing
- [ ] Code review
- [ ] Merge to main

### Phase 2B (Days 4-7)

- [ ] Create templateService.ts
- [ ] Create variableSubstitutionService.ts
- [ ] Create useTemplates.ts hook
- [ ] Create TemplateEditor.tsx
- [ ] Create TemplateList.tsx
- [ ] Create TemplatePicker.tsx
- [ ] Create VariableInserter.tsx
- [ ] Add Templates tab to Settings
- [ ] Integrate with EmailComposer
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E test
- [ ] Manual testing
- [ ] Code review
- [ ] Merge to main

### Phase 2C (Days 8-13)

- [ ] Create email-images Storage bucket
- [ ] Create imageUploadService.ts
- [ ] Create ImageUploader.tsx
- [ ] Integrate TipTap Image extension
- [ ] Create migration: user_email_attachments
- [ ] Create email-attachments Storage bucket
- [ ] Create attachmentService.ts
- [ ] Create AttachmentManager.tsx
- [ ] Update send-email Edge Function for attachments
- [ ] Create draftService.ts
- [ ] Create useDrafts.ts hook
- [ ] Add auto-save to EmailComposer
- [ ] Create ScheduleEmailPicker.tsx
- [ ] Add scheduling to EmailComposer
- [ ] Create process-email-queue Edge Function
- [ ] Set up Supabase cron job
- [ ] Add Reply/Reply All functionality
- [ ] Update send-email for threading headers
- [ ] Create queueService.ts
- [ ] Create useEmailQueue.ts hook
- [ ] Create EmailQueueMonitor.tsx
- [ ] Add error handling and retry logic
- [ ] Add toast notifications
- [ ] Write all tests
- [ ] Manual testing
- [ ] Code review
- [ ] Merge to main

### Phase 2D (Days 14-18)

- [ ] Create migration: user_email_signatures
- [ ] Create SignatureManager.tsx in Settings
- [ ] Add signature insertion to EmailComposer
- [ ] Create BulkEmailDialog.tsx
- [ ] Implement bulk send logic
- [ ] Create BulkSendProgress.tsx
- [ ] Update queue processor for batching
- [ ] Create QuotaIndicator.tsx
- [ ] Create useEmailQuota.ts hook
- [ ] Add quota checks to EmailComposer
- [ ] Implement mobile responsive design
- [ ] Test on multiple mobile devices
- [ ] Run accessibility audit (axe-core)
- [ ] Fix all a11y issues
- [ ] Add ARIA labels
- [ ] Test with screen readers
- [ ] Optimize bundle size (lazy loading)
- [ ] Create migration: test_emails
- [ ] Implement test mode
- [ ] Create EmailTestInbox.tsx
- [ ] Write all remaining tests
- [ ] Cross-browser testing
- [ ] Performance testing (Lighthouse)
- [ ] Final polish (loading states, empty states, etc.)
- [ ] Code review
- [ ] Merge to main

### Post-Implementation

- [ ] Deploy to staging
- [ ] Smoke testing on staging
- [ ] Deploy to production
- [ ] Monitor for errors (Sentry)
- [ ] Monitor email send success rate
- [ ] Monitor performance metrics
- [ ] User acceptance testing
- [ ] Gather feedback
- [ ] Update documentation
- [ ] Update memory file: email_system_implementation_phase2
- [ ] Move this plan to COMPLETED/
- [ ] Create Phase 3 plan (if needed)

---

## Success Metrics

**Technical:**

- ✅ All 70+ acceptance criteria met
- ✅ Test coverage > 80%
- ✅ Zero critical bugs in production
- ✅ Email send success rate > 95%
- ✅ Page load time < 3s (with lazy loading)
- ✅ Lighthouse scores > 90
- ✅ No accessibility violations

**User:**

- ✅ Users can compose rich emails in < 2 minutes
- ✅ Template usage > 50% of emails (saves time)
- ✅ Draft recovery prevents lost work
- ✅ Bulk send saves hours on recruiting communications
- ✅ Zero user-reported XSS or security issues
- ✅ Mobile users can compose emails (even if desktop preferred)

**Business:**

- ✅ Email system replaces manual Gmail compose
- ✅ Recruiting team uses for all recruit communications
- ✅ Templates standardize messaging
- ✅ Scheduled emails improve follow-up consistency
- ✅ Quota tracking prevents hitting Gmail limits

---

## Notes

**Why 4 sub-phases?**
Each sub-phase is independently testable and shippable. If we run into time constraints, we can ship 2A+2B (core functionality) and defer 2C+2D to Phase 3.

**Why not use a simpler editor?**
TipTap was chosen because:

- Modern (React 19 compatible)
- Extensible (can add custom features later)
- Good a11y support
- Active maintenance
- Headless (full control over UI)

Alternatives considered:

- react-quill: Older, less flexible
- Draft.js: Deprecated by Meta
- Slate: Too low-level, more complex

**Why use email_queue for drafts?**
Reusing existing infrastructure is simpler than creating a separate `drafts` table. The `email_queue` table already has all needed fields, and `status='draft'` differentiates drafts from pending sends.

**Why client-side AND server-side variable substitution?**

- Client-side: For preview (show user what email will look like)
- Server-side: For actual send (ensures variables use fresh data from DB at send time, not at draft time)

**Why exponential backoff for retries?**
Prevents hammering Gmail API if there's a temporary issue. Also gives time for OAuth token refresh or transient network issues to resolve.

**Why test mode?**
Development and testing should NOT spam real email inboxes. Test mode allows full E2E testing without actually sending emails.

---

## Conclusion

This comprehensive Phase 2 plan addresses all 18 critical concerns identified during the initial review and provides a clear, detailed roadmap for implementing a production-ready WYSIWYG email composer.

**Key Strengths:**

- ✅ Builds on excellent Phase 1 foundation
- ✅ Addresses security (XSS, sanitization)
- ✅ Addresses UX (mobile, a11y, drafts)
- ✅ Addresses scalability (bulk send, quota tracking)
- ✅ Broken into shippable sub-phases
- ✅ Comprehensive testing strategy
- ✅ Clear acceptance criteria

**Estimated Timeline:** 14-18 days for complete implementation

**Next Steps:**

1. Review and approve this plan
2. Create feature branch
3. Begin Phase 2A implementation
4. Ship incrementally (2A → 2B → 2C → 2D)

---

**Plan Status:** READY FOR IMPLEMENTATION
**Created By:** Claude Code
**Last Updated:** 2025-11-29
