# Communications Hub - Implementation Plan

**Created:** 2025-12-16
**Status:** Planning Complete - Ready for Implementation
**Estimated Duration:** 7 weeks
**Priority:** High

---

## Executive Summary

Build a full-featured Gmail-like Communications Hub with:
- Threaded conversations with inbound reply support
- Email tracking (opens, clicks)
- Labels, signatures, and snippets
- Scheduling and bulk send capabilities
- Full notification system (in-app, push, digest)

---

## Email Configuration

| Setting | Value |
|---------|-------|
| **Resend Domain** | `updates.thestandardhq.com` |
| **System From Address** | `The Standard HQ <noreply@updates.thestandardhq.com>` |
| **Reply-To** | User's personal email (from profile) |
| **Inbound Address** | `replies@updates.thestandardhq.com` (to be configured) |

### Migration Note: Update Existing Functions
The following edge functions currently use `noreply@commissiontracker.com` and need updating:
- `send-automated-email/index.ts` (line 94)
- `process-workflow/index.ts` (lines 435, 478, 507)

Change to: `The Standard HQ <noreply@updates.thestandardhq.com>`

---

## Requirements Summary

| Feature | Decision |
|---------|----------|
| SMS | Defer - evaluate after email MVP |
| Templates | Move entirely to Messages |
| Workflow Emails | Show all in inbox with badge |
| Contacts | All (clients, team, recruits) |
| Attachments | Yes, up to 10MB/file |
| Permissions | Own messages only |
| Replies | Resend inbound webhooks, threaded |
| Sender | System domain + user reply-to |
| Tracking | Full (opens + clicks) |
| Integrations | Design for future CRM sync |
| Inbox Layout | Threaded conversations |
| Quick Replies | Snippets + full templates |
| Notifications | In-app + browser push + email digest |
| Organization | Gmail-style labels |
| Bulk Send | Yes, with rate limiting safeguards |
| Scheduling | Full send-later support |
| Signatures | Rich editor with images/social links |

---

## Database Schema

### New Tables

#### 1. email_threads
```sql
CREATE TABLE email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL,
  subject_hash text NOT NULL,
  participant_emails text[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 1,
  unread_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  labels uuid[] DEFAULT '{}',
  snippet text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX idx_email_threads_last_message ON email_threads(user_id, last_message_at DESC);
CREATE INDEX idx_email_threads_subject_hash ON email_threads(user_id, subject_hash);
CREATE INDEX idx_email_threads_labels ON email_threads USING GIN(labels);
```

#### 2. email_labels
```sql
CREATE TABLE email_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  icon text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);
```

#### 3. email_signatures
```sql
CREATE TABLE email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  include_social_links boolean DEFAULT true,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_email_signatures_default
  ON email_signatures(user_id) WHERE is_default = true;
```

#### 4. email_snippets
```sql
CREATE TABLE email_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  shortcut text,
  category text,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shortcut)
);
```

#### 5. email_tracking_events
```sql
CREATE TABLE email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES user_emails(id) ON DELETE CASCADE,
  tracking_id uuid NOT NULL,
  event_type text NOT NULL,
  link_url text,
  link_index integer,
  ip_address inet,
  user_agent text,
  device_type text,
  country text,
  city text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_tracking_events_email ON email_tracking_events(email_id);
CREATE INDEX idx_email_tracking_events_tracking ON email_tracking_events(tracking_id);
```

#### 6. email_tracking_links
```sql
CREATE TABLE email_tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES user_emails(id) ON DELETE CASCADE,
  tracking_id uuid NOT NULL,
  original_url text NOT NULL,
  link_text text,
  link_index integer NOT NULL,
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_tracking_links_tracking ON email_tracking_links(tracking_id);
```

#### 7. email_scheduled
```sql
CREATE TABLE email_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  email_id uuid REFERENCES user_emails(id),
  scheduled_for timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_scheduled_pending
  ON email_scheduled(scheduled_for)
  WHERE status = 'pending';
```

#### 8. bulk_email_campaigns
```sql
CREATE TABLE bulk_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  template_id uuid REFERENCES email_templates(id),
  subject_override text,
  recipient_source text NOT NULL,
  recipient_filter jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  send_rate integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 9. bulk_email_recipients
```sql
CREATE TABLE bulk_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid,
  contact_type text,
  email_address text NOT NULL,
  first_name text,
  last_name text,
  variables jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  email_id uuid REFERENCES user_emails(id),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bulk_recipients_campaign ON bulk_email_recipients(campaign_id, status);
```

#### 10. notification_preferences
```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  in_app_enabled boolean DEFAULT true,
  browser_push_enabled boolean DEFAULT false,
  browser_push_subscription jsonb,
  email_digest_enabled boolean DEFAULT false,
  email_digest_frequency text DEFAULT 'daily',
  email_digest_time time DEFAULT '09:00:00',
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  notify_on_reply boolean DEFAULT true,
  notify_on_open boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Modifications to user_emails
```sql
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES email_threads(id);
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS labels uuid[] DEFAULT '{}';
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS tracking_id uuid DEFAULT gen_random_uuid();
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS open_count integer DEFAULT 0;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS first_opened_at timestamptz;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS first_clicked_at timestamptz;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS has_attachments boolean DEFAULT false;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS message_id_header text;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS in_reply_to_header text;
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS references_header text[];
ALTER TABLE user_emails ADD COLUMN IF NOT EXISTS signature_id uuid;

CREATE INDEX idx_user_emails_thread ON user_emails(thread_id);
CREATE INDEX idx_user_emails_tracking ON user_emails(tracking_id);
CREATE INDEX idx_user_emails_scheduled ON user_emails(scheduled_for)
  WHERE scheduled_for IS NOT NULL AND status = 'scheduled';
```

---

## Edge Functions

### 1. send-tracked-email
- Inject tracking pixel before `</body>`
- Rewrite all links to tracking redirect URLs
- Store link mappings in email_tracking_links
- Generate unique Message-ID header
- Send via Resend API
- Create user_emails record

### 2. tracking-pixel
- Serve 1x1 transparent GIF
- Record open event in email_tracking_events
- Update user_emails.open_count
- Trigger notification if enabled

### 3. tracking-redirect
- Look up original URL from email_tracking_links
- Record click event in email_tracking_events
- Update click counts
- 302 redirect to original URL

### 4. inbound-email-webhook
- Verify Resend webhook signature
- Match to thread via In-Reply-To or subject
- Create user_emails with is_incoming=true
- Update thread metadata
- Trigger notifications

### 5. process-scheduled-emails (CRON)
- Query pending scheduled emails
- Process due emails via send-tracked-email
- Update statuses
- Handle retries on failure

### 6. process-bulk-campaign (CRON)
- Process sending campaigns at configured rate
- Track progress per recipient
- Update campaign statistics
- Handle failures and retries

---

## Feature Structure

```
src/features/messages/
├── index.ts
├── MessagesPage.tsx
├── components/
│   ├── layout/
│   │   ├── MessagesLayout.tsx
│   │   ├── MessagesSidebar.tsx
│   │   └── MessagesHeader.tsx
│   ├── inbox/
│   │   ├── ThreadList.tsx
│   │   ├── ThreadListItem.tsx
│   │   ├── ThreadFilters.tsx
│   │   └── EmptyInbox.tsx
│   ├── thread/
│   │   ├── ThreadView.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── QuickReply.tsx
│   │   └── ThreadActions.tsx
│   ├── compose/
│   │   ├── ComposeDialog.tsx
│   │   ├── ComposeForm.tsx
│   │   ├── RecipientInput.tsx
│   │   ├── ContactPicker.tsx
│   │   ├── AttachmentList.tsx
│   │   ├── SchedulePicker.tsx
│   │   └── SignatureSelector.tsx
│   ├── templates/
│   │   ├── TemplatesTab.tsx
│   │   ├── TemplateList.tsx
│   │   ├── TemplateEditor.tsx
│   │   └── TemplatePreview.tsx
│   ├── snippets/
│   │   ├── SnippetsManager.tsx
│   │   ├── SnippetList.tsx
│   │   ├── SnippetEditor.tsx
│   │   └── SnippetSelector.tsx
│   ├── signatures/
│   │   ├── SignaturesManager.tsx
│   │   ├── SignatureList.tsx
│   │   └── SignatureEditor.tsx
│   ├── labels/
│   │   ├── LabelsManager.tsx
│   │   ├── LabelList.tsx
│   │   ├── LabelEditor.tsx
│   │   └── LabelSelector.tsx
│   ├── bulk/
│   │   ├── BulkSendWizard.tsx
│   │   ├── RecipientSelector.tsx
│   │   ├── BulkPreview.tsx
│   │   └── CampaignProgress.tsx
│   ├── analytics/
│   │   ├── AnalyticsTab.tsx
│   │   ├── QuotaUsage.tsx
│   │   ├── TrackingStats.tsx
│   │   └── CampaignStats.tsx
│   └── settings/
│       ├── NotificationSettings.tsx
│       └── DigestSettings.tsx
├── hooks/
│   ├── useThreads.ts
│   ├── useThread.ts
│   ├── useLabels.ts
│   ├── useSnippets.ts
│   ├── useSignatures.ts
│   ├── useSendEmail.ts
│   ├── useScheduleEmail.ts
│   ├── useBulkSend.ts
│   ├── useContacts.ts
│   ├── useTrackingStats.ts
│   └── useNotificationPrefs.ts
└── services/
    ├── threadService.ts
    ├── emailService.ts
    ├── labelService.ts
    ├── snippetService.ts
    ├── signatureService.ts
    ├── trackingService.ts
    ├── bulkService.ts
    └── contactService.ts
```

---

## Week-by-Week Implementation

### Week 1: Foundation & Core Infrastructure

**Day 1-2: Database & Permissions**
- [ ] Create migration: 20251217_001_messages_hub_foundation.sql
- [ ] Create migration: 20251217_002_messages_hub_tracking.sql
- [ ] Add permission: nav.messages
- [ ] Regenerate database.types.ts
- [ ] npm run build - zero errors

**Day 3: Feature Structure & Routing**
- [ ] Create src/features/messages/ structure
- [ ] Create MessagesPage.tsx
- [ ] Add route to router.tsx
- [ ] Add to Sidebar navigation
- [ ] Create MessagesLayout (3-panel)

**Day 4-5: Thread Service & Basic Inbox**
- [ ] Implement threadService.ts
- [ ] Implement useThreads hook
- [ ] Create ThreadList component
- [ ] Create ThreadListItem component
- [ ] Virtual scrolling with react-virtual

### Week 2: Compose & Send

**Day 1-2: Email Sending Edge Function**
- [ ] Create send-tracked-email function
- [ ] Create tracking-pixel function
- [ ] Create tracking-redirect function
- [ ] Deploy and test

**Day 3-4: Compose Interface**
- [ ] Create ComposeDialog
- [ ] Create ComposeForm with TipTap
- [ ] Create RecipientInput with autocomplete
- [ ] Implement contactService.search()
- [ ] Create ContactPicker dialog
- [ ] Implement useSendEmail hook

**Day 5: Attachments**
- [ ] Create storage bucket: email-attachments
- [ ] Implement attachment upload
- [ ] Create AttachmentList component
- [ ] Test with various file types

### Week 3: Threading & Replies

**Day 1-2: Inbound Email Setup**
- [ ] Configure Resend inbound domain
- [ ] Create inbound-email-webhook function
- [ ] Set up webhook in Resend dashboard
- [ ] Test inbound flow

**Day 3-4: Thread View**
- [ ] Create ThreadView component
- [ ] Create MessageBubble component
- [ ] Implement useThread hook
- [ ] Create QuickReply composer

**Day 5: Thread Actions**
- [ ] Create ThreadActions component
- [ ] Bulk selection in ThreadList
- [ ] Keyboard shortcuts
- [ ] Mark read/unread

### Week 4: Labels & Signatures

**Day 1-2: Labels System**
- [ ] Implement labelService.ts
- [ ] Create useLabels hook
- [ ] Create LabelsManager component
- [ ] Create LabelEditor (color picker)
- [ ] Create LabelSelector
- [ ] Filter threads by label

**Day 3-4: Signatures**
- [ ] Implement signatureService.ts
- [ ] Create useSignatures hook
- [ ] Create SignaturesManager
- [ ] Create SignatureEditor (rich text)
- [ ] Auto-append default signature

**Day 5: Templates Migration**
- [ ] Move EmailTemplatesTab from Training Hub
- [ ] Create TemplatesTab in messages
- [ ] Add template picker to compose
- [ ] Verify workflows still work

### Week 5: Scheduling & Tracking

**Day 1-2: Scheduling**
- [ ] Create email_scheduled migration
- [ ] Implement schedulingService.ts
- [ ] Create SchedulePicker component
- [ ] Create process-scheduled-emails cron
- [ ] Cancel scheduled email functionality

**Day 3-4: Tracking Analytics**
- [ ] Implement trackingService.ts
- [ ] Create TrackingStats component
- [ ] Create AnalyticsTab
- [ ] Open/click rate charts
- [ ] Device breakdown

**Day 5: Quota & Usage**
- [ ] Create QuotaUsage component
- [ ] Show usage vs limits
- [ ] Warning when approaching limit

### Week 6: Bulk Send & Notifications

**Day 1-2: Bulk Send Infrastructure**
- [ ] Create bulk migrations
- [ ] Implement bulkService.ts
- [ ] Create process-bulk-campaign cron
- [ ] Rate limiting

**Day 3: Bulk Send UI**
- [ ] Create BulkSendWizard
- [ ] Create RecipientSelector
- [ ] Create BulkPreview
- [ ] Create CampaignProgress

**Day 4-5: Notifications**
- [ ] Create notification_preferences migration
- [ ] Browser push notification setup
- [ ] Create NotificationSettings
- [ ] In-app badge on Messages nav
- [ ] Email digest cron

### Week 7: Snippets, Polish & Testing

**Day 1-2: Snippets**
- [ ] Implement snippetService.ts
- [ ] Create SnippetsManager
- [ ] Create SnippetSelector
- [ ] Slash command insertion
- [ ] Track usage

**Day 3-4: Polish**
- [ ] Empty states
- [ ] Error handling
- [ ] Loading states/skeletons
- [ ] Mobile responsive
- [ ] Performance optimization
- [ ] Search within messages

**Day 5: Testing**
- [ ] Unit tests for services
- [ ] Integration tests for hooks
- [ ] E2E test full flow
- [ ] Final build verification

---

## Technical Considerations

### Performance
- Virtual scrolling for large thread lists (react-virtual)
- Debounced search
- Optimistic updates for star/archive/label
- Pagination with cursor-based queries
- Index optimization for common queries

### Security
- RLS policies on all new tables
- Tracking pixel/redirect validation
- Webhook signature verification
- File upload validation (type, size)
- Rate limiting on send operations

### Edge Cases
- Very long threads (100+ messages)
- Large attachments
- Bounce handling
- Unsubscribe compliance
- Duplicate detection
- Thread merging (same subject, different threads)

---

## Dependencies

### External Services
- Resend (email sending, inbound, tracking) - requires Pro plan for inbound
- Supabase Storage (attachments)
- Web Push API (browser notifications)

### NPM Packages (likely needed)
- react-virtual (virtual scrolling)
- date-fns-tz (timezone handling for scheduling)
- web-push (push notifications)

---

## Success Metrics

- Email deliverability rate > 95%
- Average compose-to-send time < 60 seconds
- Thread load time < 500ms
- Zero data loss on scheduled/bulk sends
- User adoption: 80% of active users using Messages within 30 days

---

## Future Enhancements (Post-MVP)

1. SMS via Twilio
2. Slack integration
3. AI-powered suggestions (reply suggestions, send time optimization)
4. A/B testing for templates
5. Advanced segmentation for bulk sends
6. Calendar integration for scheduling
7. CRM sync (Salesforce, HubSpot)
