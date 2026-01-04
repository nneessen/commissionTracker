# Instagram DM Integration Plan

## Overview

Implement Instagram Direct Messaging in Messages page with recruiting pipeline integration, full automation capabilities, and Team-tier billing gate.

## User Requirements Summary

- **Account Type**: Instagram Business/Creator accounts (official Meta API)
- **Billing Tier**: Team ($50/mo) - exclusive feature
- **Lead Storage**: Extend `recruiting_leads` table with `lead_source` field
- **Automation Level**: Full automation (auto-send when window opens, reminders)
- **Design**: Match existing zinc palette, compact layout, minimal padding

---

## Phase 1: Database Schema & Migrations

### 1.1 New Enums

```sql
-- supabase/migrations/20260103_001_instagram_enums.sql
CREATE TYPE instagram_connection_status AS ENUM ('connected', 'disconnected', 'expired', 'error');
CREATE TYPE instagram_message_type AS ENUM ('text', 'media', 'story_reply', 'story_mention');
CREATE TYPE instagram_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE scheduled_message_status AS ENUM ('pending', 'sent', 'cancelled', 'failed', 'expired');
```

### 1.2 Core Tables

**instagram_integrations** - Stores OAuth tokens per user
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| imo_id | UUID | FK to imos |
| user_id | UUID | FK to auth.users |
| instagram_user_id | TEXT | IG user ID |
| instagram_username | TEXT | @handle |
| facebook_page_id | TEXT | Required for Business API |
| access_token_encrypted | TEXT | AES-256 encrypted |
| token_expires_at | TIMESTAMPTZ | ~60 days from grant |
| connection_status | enum | connected/disconnected/expired/error |
| scopes | TEXT[] | Granted permissions |

**instagram_conversations** - DM threads with contacts
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| integration_id | UUID | FK |
| instagram_conversation_id | TEXT | From IG API |
| participant_instagram_id | TEXT | Contact's IG ID |
| participant_username | TEXT | Contact's @handle |
| participant_name | TEXT | Display name |
| last_message_at | TIMESTAMPTZ | For sorting |
| last_message_preview | TEXT | Truncated preview |
| unread_count | INT | Unread messages |
| can_reply_until | TIMESTAMPTZ | 24hr window expiry |
| last_inbound_at | TIMESTAMPTZ | Window reset tracker |
| **is_priority** | BOOLEAN | Priority contact flag |
| **recruiting_lead_id** | UUID | FK to recruiting_leads |

**instagram_messages** - Individual messages
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| conversation_id | UUID | FK |
| instagram_message_id | TEXT | From IG API |
| message_text | TEXT | Content (1000 char limit) |
| message_type | enum | text/media/story_reply |
| direction | enum | inbound/outbound |
| status | enum | pending/sent/delivered/read/failed |
| sent_at | TIMESTAMPTZ | Message timestamp |

**instagram_scheduled_messages** - Automation queue
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| conversation_id | UUID | FK |
| message_text | TEXT | Content to send |
| scheduled_for | TIMESTAMPTZ | When to send |
| messaging_window_expires_at | TIMESTAMPTZ | Must send before this |
| status | enum | pending/sent/cancelled/failed/expired |
| template_id | UUID | Optional FK to template |

**instagram_message_templates** - Reusable messages
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| imo_id | UUID | FK |
| name | TEXT | Template name |
| content | TEXT | Message content |
| category | TEXT | greeting/follow_up/scheduling |
| use_count | INT | Usage tracking |

### 1.3 Extend recruiting_leads

```sql
-- Add source tracking to existing table
ALTER TABLE recruiting_leads
ADD COLUMN lead_source TEXT DEFAULT 'manual';
-- Values: 'manual', 'website', 'instagram_dm', 'referral'

ALTER TABLE recruiting_leads
ADD COLUMN instagram_conversation_id UUID REFERENCES instagram_conversations(id);
```

### 1.4 RLS Policies

- Users can only access their own integrations
- Users can only access conversations from their integrations
- IMO-level access for templates

---

## Phase 2: Edge Functions (Supabase)

### 2.1 OAuth Flow

| Function                   | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `instagram-oauth-init`     | Generate Meta OAuth URL with scopes       |
| `instagram-oauth-callback` | Exchange code for tokens, store encrypted |
| `instagram-refresh-token`  | CRON: Refresh tokens at day 53            |

**Required Scopes:**

- `instagram_basic`
- `instagram_manage_messages`
- `pages_manage_metadata`

### 2.2 Messaging Functions

| Function                       | Purpose                         |
| ------------------------------ | ------------------------------- |
| `instagram-get-conversations`  | Fetch conversation list         |
| `instagram-get-messages`       | Fetch messages for conversation |
| `instagram-send-message`       | Send DM (validates 24hr window) |
| `instagram-sync-conversations` | Full sync from IG API           |

### 2.3 Webhook Handler

| Function            | Purpose                            |
| ------------------- | ---------------------------------- |
| `instagram-webhook` | Receive real-time events from Meta |

**Events to handle:**

- `messages` - New message received (resets 24hr window)
- `message_reactions` - Reaction added/removed
- `messaging_seen` - Read receipt

### 2.4 Automation Functions

| Function                      | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `instagram-process-scheduled` | CRON: Send due scheduled messages                  |
| `instagram-auto-reminder`     | CRON: Create auto follow-ups for priority contacts |

---

## Phase 3: Service Layer

### 3.1 Service File

**Path:** `src/services/instagram/instagramService.ts`

```typescript
export const instagramService = {
  // OAuth
  initiateOAuth(userId, returnUrl): Promise<{ authUrl: string }>,
  disconnect(integrationId): Promise<void>,

  // Conversations
  getConversations(integrationId, filters?): Promise<InstagramConversation[]>,
  syncConversations(integrationId): Promise<void>,

  // Messages
  getMessages(conversationId, limit?, cursor?): Promise<InstagramMessage[]>,
  sendMessage(conversationId, text): Promise<InstagramMessage>,

  // Priority & Leads
  setPriority(conversationId, isPriority): Promise<void>,
  createLeadFromConversation(conversationId, additionalData): Promise<RecruitingLead>,

  // Scheduling
  scheduleMessage(conversationId, text, scheduledFor, templateId?): Promise<void>,
  cancelScheduledMessage(id): Promise<void>,
  getScheduledMessages(conversationId): Promise<ScheduledMessage[]>,

  // Templates
  getTemplates(imoId): Promise<InstagramMessageTemplate[]>,
  createTemplate(template): Promise<InstagramMessageTemplate>,
  deleteTemplate(id): Promise<void>,

  // Automation
  configureAutoReminders(conversationId, config): Promise<void>,
};
```

### 3.2 Types File

**Path:** `src/types/instagram.types.ts`

---

## Phase 4: TanStack Query Hooks

**Path:** `src/hooks/instagram/useInstagramIntegration.ts`

```typescript
// Query keys factory
export const instagramKeys = {
  all: ["instagram"],
  integrations: (userId) => [...instagramKeys.all, "integrations", userId],
  conversations: (integrationId) => [
    ...instagramKeys.all,
    "conversations",
    integrationId,
  ],
  messages: (conversationId) => [
    ...instagramKeys.all,
    "messages",
    conversationId,
  ],
  scheduled: (conversationId) => [
    ...instagramKeys.all,
    "scheduled",
    conversationId,
  ],
  templates: (imoId) => [...instagramKeys.all, "templates", imoId],
};

// Hooks
useInstagramIntegration();
useConnectInstagram();
useDisconnectInstagram();
useInstagramConversations(integrationId);
useInstagramMessages(conversationId);
useSendInstagramMessage();
useSetInstagramPriority();
useCreateLeadFromInstagram();
useScheduleInstagramMessage();
useInstagramTemplates();
```

---

## Phase 5: Frontend Components

**Directory:** `src/features/messages/components/instagram/`

### 5.1 Component Structure

```
instagram/
├── index.ts
├── InstagramTabContent.tsx      # Main container with feature gate
├── InstagramSidebar.tsx          # Conversation list (mirrors SlackSidebar)
├── InstagramConversationItem.tsx # Single conversation row
├── InstagramConversationView.tsx # Message thread + input
├── InstagramMessageBubble.tsx    # Single message display
├── InstagramMessageInput.tsx     # Compose with char limit
├── InstagramWindowIndicator.tsx  # 24hr window status badge
├── InstagramPriorityBadge.tsx    # Priority/lead indicator
├── InstagramTemplateSelector.tsx # Quick template insert dropdown
├── InstagramScheduleDialog.tsx   # Schedule future message modal
├── CreateLeadFromIGDialog.tsx    # Convert contact to recruiting lead
├── InstagramConnectCard.tsx      # OAuth setup prompt
└── InstagramSetupGuide.tsx       # Business account setup instructions
```

### 5.2 Key Component Behaviors

**InstagramSidebar.tsx** (mirrors SlackSidebar pattern)

- Account selector (if multiple integrations)
- Search/filter conversations
- Priority filter toggle (show only priority contacts)
- Conversation list with:
  - Profile picture
  - Username
  - Last message preview
  - Unread badge
  - Priority star icon
  - Lead badge if linked
  - Window status indicator (green/yellow/red)

**InstagramConversationView.tsx**

- Message history (reverse chronological)
- Auto-scroll to bottom
- 24hr window indicator prominently displayed
- Actions bar:
  - Priority toggle button
  - "Create Lead" button (opens dialog)
  - "Schedule Message" button
  - Template dropdown
- Message input with:
  - Character counter (1000 max)
  - Disabled state when window closed
  - "Window closed" explanation when disabled

**InstagramWindowIndicator.tsx**

- Green: "Window open - X hours left"
- Yellow: "Window closing soon - X minutes"
- Red: "Window closed - waiting for reply"
- Tooltip explaining 24hr rule

**CreateLeadFromIGDialog.tsx**

- Pre-fills from IG contact:
  - First/last name parsed from display name
  - Instagram username
  - lead_source = 'instagram_dm'
- User fills:
  - Email (required)
  - Phone (required)
  - State, experience, etc.
- Creates lead and links to conversation

---

## Phase 6: Billing Integration

### 6.1 Feature Flag

Add `instagram_messaging` to Team tier in `subscription_plans.features`:

```json
{
  "instagram_messaging": true,
  "instagram_scheduled_messages": true,
  "instagram_templates": true
}
```

### 6.2 Feature Gate in UI

```typescript
// InstagramTabContent.tsx
function InstagramTabContent() {
  const { hasFeature } = useDashboardFeatures();

  if (!hasFeature('instagram_messaging')) {
    return <UpgradePrompt feature="Instagram DMs" requiredTier="team" />;
  }
  // ... render Instagram UI
}
```

---

## Phase 7: Automation System

### 7.1 Auto-Send When Window Opens

When webhook receives inbound message:

1. Update `can_reply_until` = now + 24 hours
2. Check if conversation has pending scheduled messages
3. If so, trigger send immediately (window just opened)

### 7.2 Auto-Reminder System

For priority contacts without recent outbound:

1. CRON checks priority conversations daily
2. If window open and no outbound in 12 hours, queue reminder
3. Use configured template or default

### 7.3 Scheduled Messages

- User schedules message for specific time
- Must be within current window expiry
- CRON runs every 5 minutes to send due messages
- If window expires before send time, mark as 'expired'

---

## Phase 8: Implementation Order

### Milestone 1: Foundation ✅ COMPLETE

- [x] Create migration files for enums and tables
  - `supabase/migrations/20260103_004_instagram_enums.sql`
  - `supabase/migrations/20260103_005_instagram_integrations.sql`
  - `supabase/migrations/20260103_006_instagram_conversations_messages.sql`
  - `supabase/migrations/20260103_007_instagram_scheduled_templates.sql`
- [x] Add `lead_source` to `recruiting_leads`
  - `supabase/migrations/20260103_008_instagram_lead_source.sql`
- [x] Add `instagram_messaging` feature to Team tier
  - `supabase/migrations/20260103_009_instagram_billing_feature.sql`
- [x] Create types in `src/types/instagram.types.ts`
- [x] Run migrations (all 6 applied successfully)
- [ ] Regenerate database.types.ts (needs Supabase auth - manual types work for now)

### Milestone 2: OAuth & Integration ✅ COMPLETE

- [x] Create `instagram-oauth-init` edge function
  - `supabase/functions/instagram-oauth-init/index.ts`
- [x] Create `instagram-oauth-callback` edge function
  - `supabase/functions/instagram-oauth-callback/index.ts`
- [x] Create `instagram-refresh-token` edge function (CRON)
  - `supabase/functions/instagram-refresh-token/index.ts`
- [x] Create instagramService OAuth methods
  - `src/services/instagram/instagramService.ts`
- [x] Create useInstagramIntegration hooks
  - `src/hooks/instagram/useInstagramIntegration.ts`

### Milestone 3: Data Layer Refactoring ✅ COMPLETE

Refactored Instagram service from flat object literal to proper BaseRepository/BaseService inheritance patterns.

- [x] Create repository directory structure
  - `src/services/instagram/repositories/`
- [x] Create InstagramIntegrationRepository extending BaseRepository
  - `src/services/instagram/repositories/InstagramIntegrationRepository.ts`
- [x] Create InstagramConversationRepository extending BaseRepository
  - `src/services/instagram/repositories/InstagramConversationRepository.ts`
- [x] Create InstagramMessageRepository extending BaseRepository
  - `src/services/instagram/repositories/InstagramMessageRepository.ts`
- [x] Create InstagramScheduledMessageRepository extending BaseRepository
  - `src/services/instagram/repositories/InstagramScheduledMessageRepository.ts`
- [x] Create InstagramTemplateRepository extending BaseRepository
  - `src/services/instagram/repositories/InstagramTemplateRepository.ts`
- [x] Create repositories barrel export
  - `src/services/instagram/repositories/index.ts`
- [x] Create InstagramService facade class (composing all repositories)
  - `src/services/instagram/InstagramService.ts`
- [x] Update main index.ts exports
  - `src/services/instagram/index.ts`
- [x] Build verification passes with zero TypeScript errors

### Milestone 4: Basic UI

- [ ] Create InstagramTabContent with feature gate
- [ ] Create InstagramConnectCard (OAuth button)
- [ ] Create InstagramSetupGuide component
- [ ] Wire into MessagesPage.tsx

### Milestone 5: Conversations & Messages

- [ ] Create `instagram-get-conversations` edge function
- [ ] Create `instagram-get-messages` edge function
- [ ] Create `instagram-send-message` edge function
- [ ] Create InstagramSidebar component
- [ ] Create InstagramConversationItem component
- [ ] Create InstagramConversationView component
- [ ] Create InstagramMessageBubble component
- [ ] Create InstagramMessageInput component
- [ ] Create InstagramWindowIndicator component

### Milestone 6: Priority & Leads

- [ ] Create InstagramPriorityBadge component
- [ ] Implement setPriority in service
- [ ] Create CreateLeadFromIGDialog component
- [ ] Implement createLeadFromConversation
- [ ] Update leadsService for instagram source

### Milestone 7: Webhooks

- [ ] Create `instagram-webhook` edge function
- [ ] Configure webhook in Meta Developer Console
- [ ] Handle message events (update window, store messages)
- [ ] Handle read receipts

### Milestone 8: Automation

- [x] Create `instagram_scheduled_messages` table (done in Milestone 1)
- [ ] Create `instagram-process-scheduled` CRON function
- [ ] Create InstagramScheduleDialog component
- [ ] Create InstagramTemplateSelector component
- [ ] Implement auto-reminder logic

### Milestone 9: Polish & Testing

- [ ] Add usage tracking
- [ ] Error handling and edge cases
- [ ] Empty states
- [ ] Loading states
- [ ] Mobile responsiveness
- [ ] Manual testing flow

---

## Critical Files to Modify

| File                                                               | Changes                                |
| ------------------------------------------------------------------ | -------------------------------------- |
| `src/features/messages/MessagesPage.tsx`                           | Add InstagramTabContent, sidebar logic |
| `src/types/database.types.ts`                                      | Regenerate after migrations            |
| `src/hooks/dashboard/useDashboardFeatures.ts`                      | Add instagram_messaging check          |
| `supabase/migrations/20251218_005_subscription_tiering_system.sql` | Update Team tier features              |
| `src/services/leads/leadsService.ts`                               | Handle instagram lead source           |

## New Files Created/To Create

### ✅ Created (Milestone 1)

| File                                                                    | Purpose                              |
| ----------------------------------------------------------------------- | ------------------------------------ |
| `supabase/migrations/20260103_004_instagram_enums.sql`                  | Enum types                           |
| `supabase/migrations/20260103_005_instagram_integrations.sql`           | OAuth integration table              |
| `supabase/migrations/20260103_006_instagram_conversations_messages.sql` | Conversations & messages             |
| `supabase/migrations/20260103_007_instagram_scheduled_templates.sql`    | Scheduled messages, templates, usage |
| `supabase/migrations/20260103_008_instagram_lead_source.sql`            | Lead source tracking                 |
| `supabase/migrations/20260103_009_instagram_billing_feature.sql`        | Team tier feature flag               |
| `src/types/instagram.types.ts`                                          | TypeScript types & query keys        |

### ✅ Created (Milestone 2)

| File                                                   | Purpose                |
| ------------------------------------------------------ | ---------------------- |
| `supabase/functions/instagram-oauth-init/index.ts`     | OAuth initiation       |
| `supabase/functions/instagram-oauth-callback/index.ts` | OAuth callback handler |
| `supabase/functions/instagram-refresh-token/index.ts`  | Token refresh CRON     |
| `src/services/instagram/instagramService.ts`           | Service layer (legacy) |
| `src/services/instagram/index.ts`                      | Service exports        |
| `src/hooks/instagram/useInstagramIntegration.ts`       | TanStack Query hooks   |
| `src/hooks/instagram/index.ts`                         | Hook exports           |

### ✅ Created (Milestone 3 - Data Layer Refactoring)

| File                                                                         | Purpose                               |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| `src/services/instagram/repositories/InstagramIntegrationRepository.ts`      | Integration CRUD + OAuth methods      |
| `src/services/instagram/repositories/InstagramConversationRepository.ts`     | Conversation CRUD + priority          |
| `src/services/instagram/repositories/InstagramMessageRepository.ts`          | Message queries                       |
| `src/services/instagram/repositories/InstagramScheduledMessageRepository.ts` | Scheduled message CRUD                |
| `src/services/instagram/repositories/InstagramTemplateRepository.ts`         | Template CRUD + soft delete           |
| `src/services/instagram/repositories/index.ts`                               | Repository exports                    |
| `src/services/instagram/InstagramService.ts`                                 | Facade service composing repositories |

### ⏳ To Create (Milestones 4-9)

| File                                               | Purpose                |
| -------------------------------------------------- | ---------------------- |
| `supabase/functions/instagram-get-conversations/*` | Fetch conversations    |
| `supabase/functions/instagram-get-messages/*`      | Fetch messages         |
| `supabase/functions/instagram-send-message/*`      | Send DM                |
| `supabase/functions/instagram-webhook/*`           | Webhook handler        |
| `supabase/functions/instagram-process-scheduled/*` | Scheduled message CRON |
| `src/features/messages/components/instagram/*.tsx` | 12 UI components       |

---

## Environment Variables Required

```
INSTAGRAM_APP_ID=<from Meta Developer Console>
INSTAGRAM_APP_SECRET=<from Meta Developer Console>
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<random string>
```

---

## Risks & Mitigations

| Risk                     | Mitigation                                        |
| ------------------------ | ------------------------------------------------- |
| API rate limits (200/hr) | Aggressive caching, batch operations              |
| 24hr window complexity   | Clear UI indicators, prevent sends when closed    |
| Token expiration         | CRON refresh at day 53, clear error states        |
| Meta app review delay    | Submit early, have feature toggle for soft launch |
| User confusion on setup  | Step-by-step guide, video walkthrough link        |

---

## Design Patterns to Follow

Reference these existing files for consistency:

- `SlackSidebar.tsx` - Sidebar structure, styling
- `SlackChannelView.tsx` - Conversation view pattern
- `MessagesPage.tsx` - Tab integration, resizable panels
- `slackService.ts` - Service layer pattern
- `useSlackIntegration.ts` - Hook patterns, query keys

**Styling:**

- Zinc palette (zinc-50 through zinc-950)
- Text sizes: 10px, 11px, 12px
- Padding: 1, 1.5, 2 (Tailwind units)
- Buttons: h-5, h-6, h-7
- Icons: h-3, h-3.5, h-4
- Borders: border-zinc-200/800
- Rounded corners: rounded, rounded-md, rounded-lg
