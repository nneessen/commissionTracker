# Email Compose & Contact Picker Implementation Plan

## 1. Summary

### Purpose
Fix the broken email compose functionality in the Communications Hub and add a contact picker for easier recipient selection.

### Current Issues (Ultra-Deep Analysis)

| Issue | Severity | Impact | Location |
|-------|----------|--------|----------|
| **Signature column mismatch** | Critical | Query returns null, signatures never applied | Line 85 |
| **Scheduled email schema wrong** | Critical | Scheduled emails fail with DB error | Lines 117-136 |
| `send-email` vs `send-automated-email` | High | Different APIs, potential failure | Line 147 |
| No contact picker | High | Poor UX - must type emails manually | ComposeDialog |
| Basic textarea instead of rich editor | Medium | Inconsistent with recruiting feature | ComposeDialog |
| No category-based contact selection | Medium | Can't easily email groups | N/A |

### Architecture Assessment
- **Messages emailService** (`src/features/messages/services/emailService.ts`) - calls `send-email` edge function, has schema bugs
- **Base emailService** (`src/services/email/emailService.ts`) - calls `send-automated-email` edge function, works for recruiting
- **EmailComposer** (`src/features/email/components/EmailComposer.tsx`) - mature TipTap-based composer, not used in Messages
- **ComposeDialog** (`src/features/messages/components/compose/ComposeDialog.tsx`) - basic textarea, needs upgrade

---

## 2. Comprehensive Issue List

### 2.1 CRITICAL: Signature Column Name Mismatch

**Problem**: Code queries for `html_content` but database column is `content_html`.

**Code** (messages/services/emailService.ts:85):
```typescript
const { data: signature } = await supabase
  .from("email_signatures")
  .select("html_content")  // WRONG COLUMN NAME
  .eq("id", signatureId)
  .eq("user_id", userId)
  .single();

if (signature?.html_content) {  // Will always be undefined
  finalBodyHtml = `${bodyHtml}<br/><br/>${signature.html_content}`;
}
```

**Database Schema** (database.types.ts:752):
```typescript
email_signatures: {
  Row: {
    content_html: string;   // ACTUAL column name
    content_text: string;
    // ...
  }
}
```

**Impact**: Signatures are NEVER applied to emails. Query returns null, silently fails.

---

### 2.2 CRITICAL: Scheduled Email Schema Completely Wrong

**Problem**: Code tries to insert email content directly into `email_scheduled`, but that table is a queue reference, not content storage.

**Code Attempts to Insert** (lines 117-136):
```typescript
await supabase.from("email_scheduled").insert({
  user_id: userId,
  to_addresses: to,           // COLUMN DOESN'T EXIST
  cc_addresses: cc || [],     // COLUMN DOESN'T EXIST
  bcc_addresses: bcc || [],   // COLUMN DOESN'T EXIST
  subject,                    // COLUMN DOESN'T EXIST
  body_html: finalBodyHtml,   // COLUMN DOESN'T EXIST
  body_text: bodyText,        // COLUMN DOESN'T EXIST
  from_address: fromAddress,  // COLUMN DOESN'T EXIST
  from_name: fromName,        // COLUMN DOESN'T EXIST
  reply_to: replyTo,          // COLUMN DOESN'T EXIST
  scheduled_for: scheduledFor.toISOString(),
  thread_id: threadId,        // COLUMN DOESN'T EXIST
  reply_to_message_id: replyToMessageId,  // COLUMN DOESN'T EXIST
  tracking_id: trackingId,    // COLUMN DOESN'T EXIST
});
```

**Actual Database Schema** (database.types.ts:690-718):
```typescript
email_scheduled: {
  Row: {
    id: string;
    user_id: string;
    email_id: string | null;      // FK to user_emails - THIS IS THE KEY
    scheduled_for: string;
    status: string;
    timezone: string;
    retry_count: number | null;
    max_retries: number | null;
    error_message: string | null;
    processed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }
}
```

**Correct Flow Should Be**:
1. Insert email into `user_emails` with `status='scheduled'`, `scheduled_for` timestamp
2. Insert into `email_scheduled` with `email_id` FK reference
3. Background job processes by `scheduled_for` time

**Impact**: ALL scheduled emails fail with database error "column does not exist".

---

### 2.3 HIGH: Edge Function API Uncertainty

**Problem**: Code calls `send-email` edge function (line 147), but only `send-automated-email` has local source.

**Observation**: `send-email` IS deployed (updated 2025-12-16 02:36:48), but no local source exists. Cannot verify API compatibility.

**Current Code** (messages/services/emailService.ts:147):
```typescript
await supabase.functions.invoke("send-email", {
  body: {
    to,           // string[]
    cc,           // string[]
    bcc,          // string[]
    subject,
    html: finalBodyHtml,
    text: bodyText,
    from: `${fromName} <${fromAddress}>`,
    replyTo,
    trackingId,
    userId,
    threadId,
    replyToMessageId,
  },
});
```

**Risk**: Unknown if deployed function expects this exact payload structure.

**Impact**: Potential runtime failure if API doesn't match.

### 2.4 HIGH: No Contact Picker

**Problem**: Users must manually type email addresses. No autocomplete or contact selection.

**Available Contact Sources**:
1. **Clients** (`clients` table): have `name`, `email`, `status`
2. **Team Members** (`user_profiles` table): have `first_name`, `last_name`, `email`, `roles`
3. **Recruits** (via `user_profiles` with specific approval_status): email-able contacts

**Impact**: Poor UX, high friction when composing emails, prone to typos.

### 2.5 MEDIUM: Basic Textarea vs Rich Editor

**Problem**: ComposeDialog uses basic `<Textarea>` while EmailComposer has TipTap rich text editor with formatting.

**Impact**: Inconsistent UX between recruiting emails and communications hub emails.

### 2.6 MEDIUM: No Category/Role Filtering

**Problem**: Can't easily select "all clients" or "all team members with role X".

**Impact**: Bulk communication is difficult.

---

## 3. Proposed Fixes

### 3.1 CRITICAL FIX: Signature Column Name

**File**: `src/features/messages/services/emailService.ts`
**Lines**: 85, 90-91

```diff
- .select("html_content")
+ .select("content_html")
  .eq("id", signatureId)
  .eq("user_id", userId)
  .single();

- if (signature?.html_content) {
-   finalBodyHtml = `${bodyHtml}<br/><br/>${signature.html_content}`;
+ if (signature?.content_html) {
+   finalBodyHtml = `${bodyHtml}<br/><br/>${signature.content_html}`;
  }
```

### 3.2 CRITICAL FIX: Scheduled Email Flow

**Problem**: The current code architecture for scheduled emails is fundamentally wrong.

**Correct Approach**:
1. Store email in `user_emails` with `scheduled_for` timestamp and `status='scheduled'`
2. Create reference in `email_scheduled` with `email_id` FK
3. Background processor picks up and sends

**Fix** (complete rewrite of scheduled section):
```typescript
// If scheduled, save to user_emails first, then queue
if (scheduledFor && scheduledFor > new Date()) {
  // Step 1: Create email record
  const { data: emailRecord, error: emailError } = await supabase
    .from("user_emails")
    .insert({
      user_id: userId,
      to_addresses: to,
      cc_addresses: cc || [],
      subject,
      body_html: finalBodyHtml,
      body_text: bodyText || stripHtml(bodyHtml),
      from_address: fromAddress,
      status: "scheduled",
      scheduled_for: scheduledFor.toISOString(),
      tracking_id: trackingId,
      thread_id: threadId,
      is_incoming: false,
    })
    .select()
    .single();

  if (emailError) {
    console.error("Error creating scheduled email:", emailError);
    return { success: false, error: "Failed to schedule email" };
  }

  // Step 2: Create schedule queue entry
  const { error: scheduleError } = await supabase
    .from("email_scheduled")
    .insert({
      user_id: userId,
      email_id: emailRecord.id,
      scheduled_for: scheduledFor.toISOString(),
      status: "pending",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

  if (scheduleError) {
    console.error("Error queuing scheduled email:", scheduleError);
    // Rollback the email record
    await supabase.from("user_emails").delete().eq("id", emailRecord.id);
    return { success: false, error: "Failed to schedule email" };
  }

  return { success: true, messageId: emailRecord.id };
}
```

### 3.3 HIGH FIX: Consolidate Email Sending

**Recommended**: Keep `send-email` edge function call but add fallback and proper error handling.

```typescript
// Send immediately via edge function with fallback
try {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      to,
      cc,
      bcc,
      subject,
      html: finalBodyHtml,
      text: bodyText || stripHtml(bodyHtml),
      from: `${fromName} <${fromAddress}>`,
      replyTo,
      trackingId,
      userId,
      threadId,
      replyToMessageId,
    },
  });

  if (error) {
    // Fallback to send-automated-email for single recipient
    if (to.length === 1) {
      const fallbackResult = await supabase.functions.invoke("send-automated-email", {
        body: { to: to[0], subject, html: finalBodyHtml, text: bodyText || stripHtml(bodyHtml) },
      });
      if (!fallbackResult.error) {
        await incrementQuota(userId);
        return { success: true, messageId: fallbackResult.data?.messageId };
      }
    }
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }

  await incrementQuota(userId);
  return { success: true, messageId: data?.messageId };
} catch (err) {
  console.error("Error in sendEmail:", err);
  return { success: false, error: "Failed to send email" };
}
```

### 3.2 Create ContactPicker Component

**New File**: `src/features/messages/components/compose/ContactPicker.tsx`

```typescript
interface Contact {
  id: string;
  name: string;
  email: string;
  type: 'client' | 'team' | 'recruit';
  role?: string;
  avatar?: string;
}

interface ContactPickerProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export function ContactPicker({ value, onChange, placeholder, allowCustom = true }: ContactPickerProps) {
  // Debounced search across all contact sources
  // Display contacts grouped by type
  // Allow filtering by role/category
  // Support multi-select with badges
}
```

### 3.3 Create useContacts Hook

**New File**: `src/features/messages/hooks/useContacts.ts`

```typescript
export interface ContactSearchOptions {
  types?: ('client' | 'team' | 'recruit')[];
  roles?: string[];
  limit?: number;
}

export function useContactSearch(query: string, options?: ContactSearchOptions) {
  return useQuery({
    queryKey: ['contacts', 'search', query, options],
    queryFn: () => searchContacts(query, options),
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

export function useContactsByType(type: 'client' | 'team' | 'recruit') {
  return useQuery({
    queryKey: ['contacts', type],
    queryFn: () => getContactsByType(type),
    staleTime: 60000,
  });
}
```

### 3.4 Upgrade ComposeDialog

Replace basic textarea with TipTapEditor and add ContactPicker:

```typescript
// Key changes to ComposeDialog:
import { TipTapEditor } from "@/features/email/components/TipTapEditor";
import { ContactPicker } from "./ContactPicker";

// Replace <Textarea> with <TipTapEditor>
// Replace manual email input with <ContactPicker>
// Add template selection (optional)
```

---

## 4. Test Plan

### 4.1 Email Sending Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Send single email | Compose → Add recipient → Send | Email delivered, appears in Sent |
| Send with CC | Add CC recipient | All recipients receive |
| Quota check | Send when quota exhausted | Error shown, email blocked |
| Draft save | Save as draft | Draft appears in Drafts list |

### 4.2 Contact Picker Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Search clients | Type client name | Matching clients shown |
| Search team | Type team member name | Team members shown |
| Multi-select | Click multiple contacts | All added as recipients |
| Custom email | Type new email | Added to recipients |
| Clear selection | Click X on badge | Recipient removed |

### 4.3 Edge Cases

- Empty search returns recent contacts
- Special characters in names handled
- Duplicate emails prevented
- Invalid emails rejected
- Quota reached mid-compose shows warning

---

## 5. Validation Steps

### Pre-Implementation
- [x] Verified `clients` table has `email` column
- [x] Verified `user_profiles` has `email`, `first_name`, `last_name`
- [x] Verified base `emailService` works (used by recruiting)
- [x] Verified `send-automated-email` edge function deployed

### Post-Implementation
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Test email sends successfully
- [ ] Contact search returns results
- [ ] No console errors
- [ ] RLS policies allow contact queries

---

## 6. Implementation Checklist

### Phase 0: Fix Critical Bugs (MUST DO FIRST)
1. [ ] Fix signature column: `html_content` → `content_html` (line 85, 90-91)
2. [ ] Rewrite scheduled email flow to use correct schema
3. [ ] Add fallback for email sending
4. [ ] Run `npm run typecheck` - must pass
5. [ ] Test immediate email send

### Phase 1: Contact Picker (Priority: High)
1. [ ] Create `contactService.ts` in messages/services
2. [ ] Create `useContacts.ts` hook with debounced search
3. [ ] Create `ContactPicker.tsx` component
4. [ ] Add contact type icons/badges (client vs team)
5. [ ] Test autocomplete performance (<100ms)
6. [ ] Verify RLS allows contact queries

### Phase 2: Upgrade ComposeDialog (Priority: Medium)
1. [ ] Replace Textarea with TipTapEditor from features/email
2. [ ] Integrate ContactPicker for To/CC/BCC fields
3. [ ] Add template picker (reuse from recruiting)
4. [ ] Style to match app design system
5. [ ] Test full compose flow end-to-end

### Phase 3: Category Selection (Priority: Medium)
1. [ ] Add "All Clients" quick select button
2. [ ] Add "Team Members" with role filter dropdown
3. [ ] Add bulk recipient limits (max 50 per send)
4. [ ] Show warning when approaching limits
5. [ ] Test bulk selection UX

---

## 7. Database Dependencies

### Tables Used
- `clients` - Client contact info (RLS: user_id filter)
- `user_profiles` - Team member info (RLS: org-based)
- `user_emails` - Email history tracking
- `email_quota_tracking` - Quota enforcement
- `email_threads` - Thread grouping

### RLS Considerations
- Clients query filtered by `user_id` (single-user app)
- Team members visible to all org members
- Email records scoped to sender's `user_id`

---

## 8. Files to Create/Modify

### New Files
- `src/features/messages/services/contactService.ts`
- `src/features/messages/hooks/useContacts.ts`
- `src/features/messages/components/compose/ContactPicker.tsx`

### Modified Files
- `src/features/messages/services/emailService.ts` - Use base service
- `src/features/messages/components/compose/ComposeDialog.tsx` - Upgrade UI
- `src/features/messages/hooks/useSendEmail.ts` - May need updates

---

## Approval Required

Before implementation:
- [ ] Confirm email sending approach (Option A or B)
- [ ] Confirm contact source priority (clients first vs team first)
- [ ] Confirm bulk email limits (how many max?)
