# Communications Hub Architecture

**Status:** Planning Complete - Ready for Implementation
**Plan File:** `/plans/active/communications-hub-implementation-plan.md`
**Duration:** 7 weeks

## Email Configuration

| Setting | Value |
|---------|-------|
| Resend Domain | `updates.thestandardhq.com` |
| System From | `The Standard HQ <noreply@updates.thestandardhq.com>` |
| Reply-To | User's personal email |
| Inbound | `replies@updates.thestandardhq.com` |

## Key Decisions

| Feature | Decision |
|---------|----------|
| SMS | Defer - research after email MVP |
| Templates | Move entirely to Messages from Training Hub |
| Workflow Emails | Show all in inbox with "Automated" badge |
| Replies | Resend inbound webhooks with threading |
| Sender | System domain + user reply-to header |
| Tracking | Full (opens + clicks) |
| Layout | Gmail-style threaded conversations |
| Organization | Labels (not folders) |
| Bulk Send | Yes, with rate limiting |
| Scheduling | Full send-later support |
| Signatures | Rich editor with social links |
| Snippets | Quick replies with /command shortcuts |
| Notifications | In-app + browser push + email digest |

## New Tables

1. `email_threads` - Conversation grouping
2. `email_labels` - User-defined labels
3. `email_signatures` - Rich signatures
4. `email_snippets` - Quick reply templates
5. `email_tracking_events` - Open/click events
6. `email_tracking_links` - Click tracking links
7. `email_scheduled` - Scheduled email queue
8. `bulk_email_campaigns` - Bulk send campaigns
9. `bulk_email_recipients` - Campaign recipients
10. `notification_preferences` - User notification settings

## Modifications to user_emails

New columns:
- thread_id, is_read, labels, scheduled_for
- tracking_id, open_count, first_opened_at
- click_count, first_clicked_at
- has_attachments, attachment_count
- message_id_header, in_reply_to_header, references_header
- signature_id

## Edge Functions

1. `send-tracked-email` - Send with pixel/link tracking
2. `tracking-pixel` - Serve 1x1 GIF, record opens
3. `tracking-redirect` - Handle click tracking
4. `inbound-email-webhook` - Process replies from Resend
5. `process-scheduled-emails` - CRON for scheduled sends
6. `process-bulk-campaign` - CRON for bulk campaigns

## Route

- Path: `/messages`
- Permission: `nav.messages`
- Position: After "Recruiting" in sidebar

## Feature Location

`src/features/messages/`

## Week Summary

- Week 1: Foundation (DB, routing, basic inbox)
- Week 2: Compose & Send (edge functions, compose UI)
- Week 3: Threading & Replies (inbound webhook, thread view)
- Week 4: Labels & Signatures
- Week 5: Scheduling & Tracking
- Week 6: Bulk Send & Notifications
- Week 7: Snippets & Polish

## Integration Notes

- Templates: Move from Training Hub, workflows reference same data
- Workflow emails: Appear in inbox with badge, can be filtered
- Existing email_queue: Enhance for scheduling, don't replace
- Quota tracking: Reuse existing email_quota_tracking table
