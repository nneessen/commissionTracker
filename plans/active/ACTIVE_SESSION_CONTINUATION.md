# Continuation Prompt - Mailgun Email Fix

**Date:** 2025-12-16
**Priority:** CRITICAL - Database insert failing

---

## Start New Conversation With:

```
Continue from ACTIVE_SESSION_CONTINUATION.md - fix the database insert error for sent emails.

Mailgun is working (emails send successfully via API) but the record fails to save to user_emails with this error:

operator does not exist: uuid = text

The sent folder shows 0 emails because records aren't being saved to the database after successful Mailgun send.
```

---

## Current State

### What's Working
- Mailgun API integration complete (emails send via Mailgun successfully)
- Edge functions deployed and configured
- DNS records configured
- Supabase secrets set

### What's Broken
**Database insert fails when saving sent email record**

Error from browser console:
```
code: '42883'
message: 'operator does not exist: uuid = text'
hint: 'No operator matches the given name and argument types. You might need to add explicit type casts.'
```

---

## Root Cause

The insert in `emailService.ts` (around line 327-352) includes `provider_message_id: data?.mailgunId`.

Mailgun returns a string like `<20251216231856.abc123@updates.thestandardhq.com>` but the `provider_message_id` column in `user_emails` table is likely typed as UUID.

---

## Fix Required

**Option 1 - Quick fix (remove the field):**

In `src/features/messages/services/emailService.ts`, around line 348, remove:
```typescript
provider_message_id: data?.mailgunId,  // DELETE THIS LINE
```

**Option 2 - Proper fix (change column type):**

Create migration to alter column type:
```sql
ALTER TABLE user_emails ALTER COLUMN provider_message_id TYPE TEXT;
```

---

## Files Changed This Session

| File | Change |
|------|--------|
| `supabase/functions/send-email/index.ts` | Resend → Mailgun API |
| `supabase/functions/inbound-email/index.ts` | NEW - webhook handler with security |
| `supabase/functions/send-automated-email/index.ts` | Resend → Mailgun API |
| `src/features/messages/services/emailService.ts` | Threading headers, Mailgun domain |
| `src/features/messages/services/threadService.ts` | Removed `.eq("user_id")` from sent query |
| `supabase/migrations/20251216_001_mailgun_migration.sql` | Created & Applied |

---

## Supabase Secrets (Configured)

- `MAILGUN_API_KEY` = (configured in Supabase)
- `MAILGUN_DOMAIN` = `updates.thestandardhq.com`
- `MAILGUN_WEBHOOK_SIGNING_KEY` = (configured in Supabase)

---

## Verification After Fix

1. Send a test email
2. Check browser console - should NOT see "CRITICAL: Email sent but record failed to save"
3. Check Sent folder - should show the sent email
4. Reply to a received email to test threading

---

## Memory

Read memory `EMAIL_SYSTEM_MAILGUN_MIGRATION_COMPLETE` for full architecture.
