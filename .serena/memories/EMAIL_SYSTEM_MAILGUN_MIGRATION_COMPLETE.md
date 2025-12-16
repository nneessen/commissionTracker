# Email System Migration to Mailgun - COMPLETE

**Date:** 2025-12-16
**Status:** Implementation Complete - Pending Mailgun Setup

## Summary

Migrated email system from Resend (outbound-only) to Mailgun (full inbound + outbound).

## Key Changes

### Edge Functions
1. `supabase/functions/send-email/index.ts` - Updated to use Mailgun API
2. `supabase/functions/inbound-email/index.ts` - NEW webhook handler for receiving emails
3. `supabase/functions/send-automated-email/index.ts` - Updated to use Mailgun API

### Frontend Services
1. `src/features/messages/services/emailService.ts`
   - Updated domain config to use single Mailgun domain
   - Added Message-ID, In-Reply-To, References header handling
   - Stores threading headers in database
   - Updated provider reference to "mailgun"

2. `src/features/messages/services/threadService.ts`
   - Fixed sent folder bug (removed erroneous user_id filter)

### Database
Migration: `supabase/migrations/20251216_001_mailgun_migration.sql`
- Added indexes for message_id_header and in_reply_to_header (threading)
- Added email_webhook_events table (idempotency)
- Added user_mailbox_settings table (future enhancements)

## Security Measures Implemented

1. **Webhook Signature Verification** - Required (not optional)
2. **Replay Attack Prevention** - Timestamp freshness check (5 min window)
3. **HTML Sanitization** - XSS protection for inbound emails
4. **Idempotent Processing** - Duplicate webhook detection via message_id_header
5. **Email Validation** - Format validation before processing
6. **MIME Type Whitelist** - Only safe attachment types allowed
7. **File Size Limits** - 10MB max per attachment
8. **Path Traversal Prevention** - Filename sanitization
9. **PII Protection** - Sensitive data removed from logs

## Required Environment Variables

```
MAILGUN_API_KEY=key-xxxxxxxx
MAILGUN_DOMAIN=updates.thestandardhq.com
MAILGUN_WEBHOOK_SIGNING_KEY=xxxxxxxx
```

## Next Steps for Full Activation

1. Create Mailgun account and verify domain
2. Add DNS records (MX, TXT for DKIM/SPF)
3. Set Supabase secrets via dashboard
4. Create Mailgun Route: `match_recipient(".*@updates.thestandardhq.com")` → webhook URL
5. Deploy edge functions
6. Test inbound/outbound flow

## Email Flow

**Outbound:**
```
User → emailService.sendEmail() → Edge Function → Mailgun API → Store in DB
```

**Inbound:**
```
External Email → Mailgun Route → Webhook → inbound-email function → Store in DB → Update thread
```

## Threading Logic

1. Check In-Reply-To header → find parent message
2. Check References header → find any thread message
3. Fallback: Match by subject_hash
4. Create new thread if no match
