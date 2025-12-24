# Mailgun Email System Testing Checklist

**Created:** 2025-12-17
**Status:** Ready for Testing
**Related Plan:** email-system-mailgun-migration.md

---

## Pre-Testing Verification

### Environment Secrets
- [x] `MAILGUN_API_KEY` - Configured
- [x] `MAILGUN_DOMAIN` - Configured
- [x] `MAILGUN_WEBHOOK_SIGNING_KEY` - Configured
- [x] `RESEND_API_KEY` - Removed (not present)

### TypeScript Types
- [x] `database.types.ts` regenerated
- [x] `user_mailbox_settings` table in types
- [x] `email_webhook_events` table in types
- [x] Build passes with no errors

### DNS Configuration (Verify in Mailgun Dashboard)
- [ ] SPF record for `thestandardhq.com` includes `include:mailgun.org`
- [ ] DKIM record configured for sending domain
- [ ] MX records point to Mailgun (if using inbound)
- [ ] Sending domain verified in Mailgun

### Mailgun Routes (Verify in Mailgun Dashboard)
- [ ] Catch-all route matches `.*@updates.thestandardhq.com`
- [ ] Route forwards to: `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/inbound-email`

---

## Outbound Email Testing

### Basic Send
- [ ] **Compose new email** from Messages page
  - Navigate to Messages → Compose
  - Enter external recipient (your personal email)
  - Enter subject and body
  - Click Send
  - **Expected:** Email appears in Sent folder immediately

- [ ] **Verify delivery** at recipient mailbox
  - Check spam folder if not in inbox
  - **Expected:** Email arrives within 1-2 minutes

- [ ] **Check email headers** (in recipient's email client)
  - View original/raw message
  - **Expected:** `Message-ID` header present with format `<uuid@updates.thestandardhq.com>`
  - **Expected:** `From` address uses Mailgun domain

### Reply Threading
- [ ] **Reply from external mailbox** to the sent email
  - Reply directly from your personal email
  - **Expected:** Webhook receives the reply (check Supabase logs)

### Tracking
- [ ] **Open tracking**
  - Open the email in recipient mailbox
  - Check `email_tracking_events` table for `open` event
  - **Expected:** Event recorded with timestamp

- [ ] **Click tracking**
  - Click any link in the email body
  - Check `email_tracking_events` table for `click` event
  - **Expected:** Event recorded with link URL

### Multi-Recipient
- [ ] **Send to multiple recipients** (To + CC)
  - Compose email with 2+ recipients in To field
  - Add 1+ recipients in CC field
  - **Expected:** All recipients receive the email

### Attachments
- [ ] **Send with attachment**
  - Compose email with PDF or image attachment
  - **Expected:** Attachment arrives at recipient

---

## Inbound Email Testing

### Webhook Reception
- [ ] **Reply to a sent email** from external mailbox
  - Check Supabase Edge Function logs for `inbound-email`
  - **Expected:** 200 response from webhook

- [ ] **Verify signature validation**
  - Check logs for "Webhook signature verified" message
  - **Expected:** No signature validation errors

### Thread Matching
- [ ] **In-Reply-To matching**
  - Reply references original Message-ID
  - **Expected:** Reply appears in same thread as original

- [ ] **Subject hash fallback**
  - Forward an email (breaks In-Reply-To chain)
  - **Expected:** Matches to thread by subject hash (or creates new)

### Database Updates
- [ ] **Check user_emails table**
  - Query: `SELECT * FROM user_emails WHERE is_incoming = true ORDER BY created_at DESC LIMIT 5`
  - **Expected:** Incoming email stored with:
    - `is_incoming: true`
    - `status: 'received'`
    - `message_id_header` populated
    - `in_reply_to_header` populated (if reply)

- [ ] **Check email_threads table**
  - **Expected:** Thread's `unread_count` incremented
  - **Expected:** Thread's `last_message_at` updated
  - **Expected:** Thread's `snippet` shows reply preview

### Attachment Handling
- [ ] **Reply with attachment**
  - Reply to sent email with PDF attachment
  - **Expected:** Attachment stored in Supabase Storage
  - **Expected:** `user_email_attachments` record created

### Security Validation
- [ ] **Invalid signature rejected**
  - (Advanced) Send POST to webhook without valid signature
  - **Expected:** 401 Unauthorized response

---

## Threading Tests

### New Conversation
- [ ] **Create new thread**
  - Compose and send to new recipient
  - **Expected:** New `email_threads` record created
  - **Expected:** Email linked to thread via `thread_id`

### Reply Chain
- [ ] **Multiple replies maintain thread**
  1. Send original email
  2. Receive reply (inbound)
  3. Send reply to the reply
  4. Receive another reply
  - **Expected:** All 4 messages in same thread
  - **Expected:** Thread shows correct message count

### References Header
- [ ] **References chain builds correctly**
  - After 3+ messages in thread
  - Check outgoing email's `References` header
  - **Expected:** Contains all previous Message-IDs in order

---

## Inbox/Sent Folder Tests

### Inbox View
- [ ] **Unread count accurate**
  - Receive inbound email
  - **Expected:** Thread shows unread badge
  - **Expected:** Opening thread marks as read

- [ ] **Thread list correct**
  - **Expected:** Shows threads with incoming messages
  - **Expected:** Sorted by most recent activity

### Sent Folder View
- [ ] **Shows sent threads** (Bug fix verification)
  - Navigate to Sent folder
  - **Expected:** Threads where user sent messages appear
  - **Expected:** Includes threads originally created by recipient

- [ ] **Thread details accurate**
  - Click on sent thread
  - **Expected:** Shows all messages in thread (sent + received)

---

## Automated Email Testing

### Workflow Emails
- [ ] **Trigger workflow with email action**
  - Execute workflow that sends email
  - Check `send-automated-email` function logs
  - **Expected:** Email sent via Mailgun

### Queue Processing
- [ ] **Queue processor works**
  - Add email to `email_queue` table with `status: 'pending'`
  - Trigger `process-email-queue` function
  - **Expected:** Email sent, status updated to 'sent'

### Fallback Mode
- [ ] **Simulation when credentials missing** (dev only)
  - Temporarily remove MAILGUN_API_KEY
  - Trigger automated email
  - **Expected:** Email logged to console, `simulated: true` in response

---

## Error Handling

### Send Failures
- [ ] **Invalid recipient**
  - Send to malformed email address
  - **Expected:** Graceful error message in UI

- [ ] **Mailgun API error**
  - (Simulate by using invalid API key)
  - **Expected:** Error logged, email marked as failed

### Inbound Failures
- [ ] **Duplicate email handling**
  - Same email webhook delivered twice
  - **Expected:** Second delivery ignored (idempotency)

- [ ] **Malformed payload**
  - **Expected:** Logged error, 400 response

---

## Performance

- [ ] **Email sends within 3 seconds**
- [ ] **Inbound webhook processes within 2 seconds**
- [ ] **Thread list loads within 1 second**

---

## Sign-Off

| Test Category | Passed | Failed | Notes |
|---------------|--------|--------|-------|
| Outbound Basic | | | |
| Outbound Tracking | | | |
| Inbound Webhook | | | |
| Threading | | | |
| Inbox/Sent Views | | | |
| Automated Emails | | | |
| Error Handling | | | |

**Tester:** _______________
**Date:** _______________
**Overall Status:** [ ] PASS / [ ] FAIL

---

## Useful Queries

```sql
-- Recent incoming emails
SELECT id, subject, sender_email, created_at, status
FROM user_emails
WHERE is_incoming = true
ORDER BY created_at DESC
LIMIT 10;

-- Thread message counts
SELECT t.id, t.subject, t.message_count, t.unread_count, t.last_message_at
FROM email_threads t
ORDER BY t.last_message_at DESC
LIMIT 10;

-- Tracking events
SELECT * FROM email_tracking_events
ORDER BY created_at DESC
LIMIT 20;

-- Webhook events (new table)
SELECT * FROM email_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

## Edge Function Logs

```bash
# View send-email logs
npx supabase functions logs send-email --limit 50

# View inbound-email logs
npx supabase functions logs inbound-email --limit 50

# View automated email logs
npx supabase functions logs send-automated-email --limit 50
```
