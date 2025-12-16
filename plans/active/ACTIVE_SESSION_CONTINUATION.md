# Messages Feature - Critical Fixes Continuation

**Date:** 2025-12-16
**Priority:** HIGH - UX and Performance Issues

---

## CRITICAL ISSUES TO FIX

### 1. Folders/Labels UX Confusion (HIGH PRIORITY)

**Current Problem:**
The sidebar has TWO separate sections that overlap in functionality:
- **Folders:** All Messages, Inbox, Sent, Starred, Archived
- **Labels:** User-created labels (e.g., "Important", "Work")

This is confusing because:
- "Starred" and "Archived" are essentially label-like filters, not folders
- Gmail-style UX has labels only, not folders + labels
- Users don't understand the difference

**File:** `src/features/messages/MessagesPage.tsx` (lines 83-99 for folders, 179-223 for labels)

**Recommended Fix Options:**
1. **Gmail-style:** Remove "Folders" concept entirely. Everything is a label. "Inbox", "Sent", "Starred", "Archived" become system labels.
2. **Outlook-style:** Keep folders for system views (Inbox, Sent, Drafts, Archive) and labels as tags that can be applied to any message.
3. **Simplified:** Remove labels entirely and just use folders/filters.

**User preference:** Needs clarification, but likely wants a cleaner, less confusing UX.

---

### 2. ThreadView Styling Issues (HIGH PRIORITY)

**Current Problem:**
- Email content display has minimal styling
- No proper email-like presentation (headers, quoted text, signatures)
- Message bubbles are too basic
- No visual distinction between sent/received messages

**File:** `src/features/messages/components/thread/ThreadView.tsx`

**What needs styling:**
- Message headers (From, To, Date) - more prominent
- Email body - proper typography, line spacing
- Quoted text (replies) - indented/styled differently
- Attachments section - better visual treatment
- Sent vs received messages - different background colors or alignment

---

### 3. ThreadView Pagination/Virtualization (CRITICAL - PERFORMANCE)

**Current Problem:**
When a thread has many messages, ALL messages load at once:
```typescript
// ThreadView.tsx line 240
{messages?.map((message, index) => { ... })}
```

No pagination, no virtualization, no limit. This will cause:
- Memory issues with long threads
- Slow rendering
- Poor UX scrolling through hundreds of messages
- Potential app crashes on mobile

**Recommended Fix:**
1. **Pagination:** Load 10-20 messages at a time, "Load more" button or infinite scroll
2. **Virtualization:** Use `react-window` or `@tanstack/react-virtual` for large lists
3. **Collapse old messages:** Only show latest N messages expanded, collapse older ones

**Database consideration:**
The `getThread()` function in `threadService.ts` fetches ALL messages:
```typescript
// threadService.ts line 260-264
const { data: messages, error: messagesError } = await supabase
  .from("user_emails")
  .select("*")
  .eq("thread_id", threadId)
  .order("created_at", { ascending: true });
```

This needs pagination at the database level too.

---

## WHAT WAS COMPLETED LAST SESSION

### Working Features:
- ✅ Multi-domain email support (personal, workflow, bulk, owner)
- ✅ "Send as me" toggle (only for verified domain users)
- ✅ Edge function `send-email` deployed and working
- ✅ Star/Archive buttons update UI correctly (cache invalidation fixed)
- ✅ Tag button shows dropdown to add/remove labels
- ✅ XSS protection via sanitizeHtml

### Files Changed:
- `src/features/messages/services/emailService.ts` - Multi-domain, better logging
- `src/features/messages/hooks/useThreads.ts` - Cache invalidation for star/archive/labels
- `src/features/messages/hooks/useSendEmail.ts` - Cache invalidation after send
- `src/features/messages/components/thread/ThreadView.tsx` - Tag dropdown, useLabels
- `src/features/messages/components/compose/ComposeDialog.tsx` - Send as me toggle with domain check
- `supabase/functions/send-email/index.ts` - Redeployed working version

---

## DATABASE SCHEMA REFERENCE

### email_threads
- `id`, `user_id`, `subject`, `subject_hash`, `snippet`
- `message_count`, `unread_count`, `last_message_at`
- `participant_emails`, `is_starred`, `is_archived`, `labels` (array of label IDs)

### user_emails
- `id`, `user_id`, `thread_id`, `from_address`, `to_addresses`
- `cc_addresses`, `subject`, `body_html`, `body_text`
- `is_incoming`, `is_read`, `status`, `tracking_id`, `created_at`
- `open_count`, `click_count` (for tracking)

### email_labels
- `id`, `user_id`, `name`, `color`, `is_system`

---

## ARCHITECTURE NOTES

### Key Files:
- **Page:** `src/features/messages/MessagesPage.tsx`
- **Thread List:** `src/features/messages/components/inbox/ThreadList.tsx`
- **Thread View:** `src/features/messages/components/thread/ThreadView.tsx`
- **Compose:** `src/features/messages/components/compose/ComposeDialog.tsx`
- **Services:** `src/features/messages/services/` (threadService, emailService, labelService)
- **Hooks:** `src/features/messages/hooks/` (useThreads, useThread, useLabels, useSendEmail, useFolderCounts)

### Email Domain Configuration:
```typescript
// emailService.ts
export const EMAIL_DOMAINS: Record<EmailSource, string> = {
  personal: "mail.thestandardhq.com",      // Default compose
  workflow: "notifications.thestandardhq.com", // Automated
  bulk: "updates.thestandardhq.com",       // Campaigns
  owner: "thestandardhq.com",              // Owner's personal email
};
```

---

## USER PREFERENCES (from CLAUDE.md)

- Compact, data-dense UI
- Small text (10-11px)
- No borders on active buttons
- Primary color for active states
- No over-engineering
- Test as you build
- No placeholder UI

---

## NEXT STEPS (IN ORDER)

1. **Fix Folders/Labels UX** - Decide on Gmail-style vs Outlook-style, implement cleaner sidebar
2. **Style ThreadView emails** - Professional email display with proper headers/body/attachments
3. **Add pagination to ThreadView** - Both UI pagination and database-level limiting
4. **Consider virtualization** - For thread lists and message lists if performance becomes an issue

---

## COMMANDS

```bash
# Typecheck
npm run typecheck

# Build
npm run build

# Dev server
npm run dev

# Deploy edge function
npx supabase functions deploy send-email --no-verify-jwt
```

---

## QUESTIONS TO CLARIFY WITH USER

1. **Folders vs Labels:** Do you want Gmail-style (labels only) or Outlook-style (folders + tags)?
2. **Thread pagination:** Show "Load more" button or infinite scroll?
3. **Message collapse:** Collapse old messages by default, showing only latest 5?
