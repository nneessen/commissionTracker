# Email System Migration: Resend → Mailgun

## Executive Summary

**Current State:** Resend (outbound-only transactional emails)
**Target State:** Mailgun (full inbound + outbound email system)
**Effort:** ~3-4 development days
**Risk Level:** Medium (service migration, but schema mostly stays)

---

## Why Mailgun Over Resend

| Capability | Resend | Mailgun |
|------------|--------|---------|
| Outbound Email | ✅ | ✅ |
| Inbound Email | ❌ (webhooks only) | ✅ (Routes + Webhooks) |
| True Threading | ❌ | ✅ (Message-ID/In-Reply-To) |
| Attachments Inbound | ❌ | ✅ |
| Reply Detection | Manual parsing | Automatic routing |
| Deliverability | Good | Excellent |
| 1000+ Users | Limited | ✅ Built for scale |
| Price at Scale | Higher | More cost-effective |

**Bottom Line:** Resend is great for notifications. Mailgun is built for full email systems.

---

## Current Architecture Analysis

### What We Keep (No Changes)

1. **Database Schema** (95% stays)
   - `user_emails` - message storage ✅
   - `email_threads` - conversation grouping ✅
   - `user_email_attachments` - attachment refs ✅
   - `email_tracking_events` - open/click tracking ✅
   - `email_tracking_links` - link tracking ✅
   - `email_signatures` - user signatures ✅
   - `email_templates` - reusable templates ✅
   - `email_quota_tracking` - rate limiting ✅
   - `email_labels` - organization ✅

2. **Frontend** (100% stays)
   - All components in `src/features/messages/`
   - ThreadList, ThreadView, ComposeDialog
   - Labels, signatures, templates UI
   - All hooks and services (minor updates)

### What Changes

1. **Edge Functions** (replace 2, add 1)
   - `send-email/index.ts` → Update to use Mailgun API
   - NEW: `inbound-email/index.ts` → Mailgun webhook handler
   - `send-automated-email/index.ts` → Update to use Mailgun API

2. **Service Layer** (minor updates)
   - `emailService.ts` - Update provider references
   - `threadService.ts` - Fix sent folder bug + enhance threading

3. **Environment Variables**
   - Remove: `RESEND_API_KEY`
   - Add: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_WEBHOOK_SIGNING_KEY`

---

## Implementation Plan

### Phase 1: Mailgun Setup (Day 1)

#### 1.1 Mailgun Account Configuration
```
Domain: mail.thestandardhq.com (or updates.thestandardhq.com)
Region: US
```

**DNS Records to Add:**
```
TXT  mail._domainkey.thestandardhq.com  → [Mailgun DKIM key]
TXT  thestandardhq.com                  → v=spf1 include:mailgun.org ~all
MX   mail.thestandardhq.com             → mxa.mailgun.org (priority 10)
MX   mail.thestandardhq.com             → mxb.mailgun.org (priority 10)
```

#### 1.2 Mailgun Routes (Inbound Handling)
```
Route 1: Catch-all for replies
  Expression: match_recipient(".*@mail.thestandardhq.com")
  Action: forward("https://<project-id>.supabase.co/functions/v1/inbound-email")
  Action: store(notify="https://<project-id>.supabase.co/functions/v1/inbound-email")
```

#### 1.3 Environment Variables
```bash
# Supabase Secrets to set:
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mail.thestandardhq.com
MAILGUN_WEBHOOK_SIGNING_KEY=xxxxxxxxxxxxxxxx
MAILGUN_BASE_URL=https://api.mailgun.net/v3  # or EU endpoint if needed
```

---

### Phase 2: Edge Function Updates (Day 1-2)

#### 2.1 Update `send-email/index.ts`

**Current:** Resend API call
**New:** Mailgun API call with proper headers

```typescript
// Key changes:
// 1. Use Mailgun API endpoint
// 2. Add proper Message-ID and References headers for threading
// 3. Return Mailgun message ID for tracking
```

**Mailgun Send API:**
```typescript
const form = new FormData();
form.append('from', from);
form.append('to', to.join(','));
form.append('subject', subject);
form.append('html', html);
form.append('text', text);
form.append('h:Message-Id', `<${crypto.randomUUID()}@mail.thestandardhq.com>`);

if (inReplyTo) {
  form.append('h:In-Reply-To', inReplyTo);
  form.append('h:References', references.join(' '));
}

const response = await fetch(`${MAILGUN_BASE_URL}/${MAILGUN_DOMAIN}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
  },
  body: form
});
```

#### 2.2 Create NEW `inbound-email/index.ts`

**Purpose:** Handle incoming emails from Mailgun webhook

```typescript
// Webhook payload from Mailgun includes:
// - sender, recipient, subject
// - body-plain, body-html
// - Message-Id, In-Reply-To, References headers
// - attachments (as multipart form data)
// - timestamp, signature for verification

// Processing steps:
// 1. Verify webhook signature
// 2. Parse email headers
// 3. Find or create thread based on References/In-Reply-To
// 4. Identify recipient user by email address
// 5. Store message in user_emails
// 6. Update thread metadata
// 7. Handle attachments (store in Supabase Storage)
```

#### 2.3 Update `send-automated-email/index.ts`

Same changes as send-email but for workflow/automated sends.

---

### Phase 3: Service Layer Updates (Day 2)

#### 3.1 Fix `threadService.ts` Sent Folder Bug

**Current Bug (line ~191):**
```typescript
// Step 1: Gets thread IDs where sender_id = userId ✅
// Step 2: Queries email_threads with .eq("user_id", userId) ❌
//         This filters out threads the user sent TO others
```

**Fix:**
```typescript
// Remove the .eq("user_id", userId) constraint when querying
// threads for sent emails, since we already have valid thread IDs
```

#### 3.2 Enhance Threading Logic in `emailService.ts`

**Add proper header handling:**
```typescript
// When replying:
// - Set In-Reply-To to the message we're replying to
// - Set References to chain of all previous Message-IDs in thread

// When receiving (in inbound webhook):
// - Parse In-Reply-To to find parent message
// - Parse References to find thread
// - Fall back to subject matching if headers missing
```

#### 3.3 Update Provider References

```typescript
// Change from:
source: 'personal' | 'bulk' | 'workflow' | 'owner'

// Email domains mapping update:
const EMAIL_DOMAINS = {
  personal: 'mail.thestandardhq.com',
  bulk: 'mail.thestandardhq.com',
  workflow: 'mail.thestandardhq.com',
  owner: 'mail.thestandardhq.com', // or user's actual email if configured
};
```

---

### Phase 4: Database Updates (Day 2-3)

#### 4.1 Minor Schema Additions

```sql
-- Migration: 20251216_001_mailgun_migration.sql

-- Add Mailgun-specific fields (if not already present)
ALTER TABLE user_emails
  ADD COLUMN IF NOT EXISTS mailgun_message_id TEXT,
  ADD COLUMN IF NOT EXISTS mailgun_storage_url TEXT;

-- Index for faster Message-ID lookups (threading)
CREATE INDEX IF NOT EXISTS idx_user_emails_message_id_header
  ON user_emails(message_id_header);

-- Index for References header lookups
CREATE INDEX IF NOT EXISTS idx_user_emails_in_reply_to
  ON user_emails(in_reply_to_header);

-- Update provider enum values if needed
-- (No actual change needed - just documentation)
COMMENT ON COLUMN user_emails.provider IS 'Email provider: mailgun, gmail_api, manual';
```

#### 4.2 Mailbox Configuration Table (Optional Enhancement)

```sql
-- Optional: Per-user mailbox settings
CREATE TABLE IF NOT EXISTS user_mailbox_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receive_address TEXT, -- e.g., nick@mail.thestandardhq.com
  display_name TEXT,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE user_mailbox_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_mailbox_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_mailbox_settings
  FOR UPDATE USING (auth.uid() = user_id);
```

---

### Phase 5: Testing & Validation (Day 3-4)

#### 5.1 Outbound Testing
- [ ] Send email via compose dialog
- [ ] Verify email arrives at recipient
- [ ] Check Message-ID header is set
- [ ] Verify tracking pixel works
- [ ] Verify click tracking works
- [ ] Test scheduled emails
- [ ] Test bulk campaigns

#### 5.2 Inbound Testing
- [ ] Reply to a sent email
- [ ] Verify webhook receives reply
- [ ] Verify reply appears in correct thread
- [ ] Verify unread count updates
- [ ] Verify thread snippet updates
- [ ] Test with attachments
- [ ] Test thread reconstruction from References header

#### 5.3 Threading Testing
- [ ] New outbound creates thread
- [ ] Reply maintains thread
- [ ] Multiple replies chain correctly
- [ ] Inbox shows correct threads
- [ ] Sent folder shows correct threads

---

## File Changes Summary

### Edge Functions (Create/Modify)

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-email/index.ts` | MODIFY | Replace Resend → Mailgun API |
| `supabase/functions/inbound-email/index.ts` | CREATE | New webhook handler |
| `supabase/functions/send-automated-email/index.ts` | MODIFY | Replace Resend → Mailgun API |

### Frontend Services (Modify)

| File | Action | Description |
|------|--------|-------------|
| `src/features/messages/services/emailService.ts` | MODIFY | Update domain config, add headers |
| `src/features/messages/services/threadService.ts` | MODIFY | Fix sent folder bug |

### Database

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20251216_001_mailgun_migration.sql` | CREATE | Add indexes, optional columns |

### Environment

| Variable | Action |
|----------|--------|
| `RESEND_API_KEY` | REMOVE |
| `MAILGUN_API_KEY` | ADD |
| `MAILGUN_DOMAIN` | ADD |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | ADD |

---

## Email Flow After Migration

### Outbound Flow
```
User composes email in React UI
  → emailService.sendEmail()
    → Supabase Edge Function (send-email)
      → Mailgun API (with Message-ID, References headers)
        → Message-ID returned
          → Store in user_emails
          → Update email_threads
```

### Inbound Flow
```
External email arrives at mail.thestandardhq.com
  → Mailgun Route matches
    → Webhook POST to inbound-email edge function
      → Verify signature
      → Parse headers (In-Reply-To, References)
      → Find matching thread (or create new)
      → Identify recipient user
      → Store in user_emails (is_incoming: true)
      → Update email_threads (increment unread_count)
      → Store attachments in Supabase Storage
```

### Threading Logic
```
Finding thread for incoming email:
  1. Check In-Reply-To header → find parent message → use its thread_id
  2. If no match, check References header → find any matching message
  3. If still no match, check subject_hash → find thread with same subject
  4. If still no match → create new thread
```

---

## Rollback Plan

If issues arise:
1. Keep Resend API key active during transition
2. Edge functions can fall back to Resend if Mailgun fails
3. Database schema changes are additive (no destructive changes)
4. Frontend doesn't need rollback (service layer handles provider)

---

## Cost Comparison

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Resend | 100/day | $20/mo for 50k |
| Mailgun | 5,000/mo for 3 months | $15/mo for 10k, then $0.80/1k |

For 1000 users × ~10 emails/day = 10,000 emails/month
- Resend: ~$40/mo
- Mailgun: ~$15/mo (includes inbound)

---

## Next Actions

1. **Decision needed:** Confirm Mailgun as provider (vs Postmark)
2. **DNS access needed:** Add Mailgun verification records
3. **Start implementation:** Begin Phase 1 (Mailgun setup)

---

## Questions for Clarification

1. Do you have access to DNS for `thestandardhq.com`?
2. Do you want to keep `updates.thestandardhq.com` or use a new subdomain like `mail.thestandardhq.com`?
3. Should each user get their own receive address (e.g., `nick@mail.thestandardhq.com`) or use a single inbox with routing?
4. Budget constraints for Mailgun ($15-50/mo range)?
