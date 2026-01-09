# LinkedIn Integration - Comprehensive Knowledge Document

## Table of Contents
1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Supabase Edge Functions](#4-supabase-edge-functions)
5. [Service Layer](#5-service-layer)
6. [TanStack Query Hooks](#6-tanstack-query-hooks)
7. [UI Components](#7-ui-components)
8. [Data Flows](#8-data-flows)
9. [Integration Points](#9-integration-points)
10. [Security & RLS](#10-security--rls)
11. [Configuration & Environment](#11-configuration--environment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

### What It Is
A complete LinkedIn Direct Messaging integration that enables users to:
- Connect their LinkedIn account via OAuth
- Sync and view DM conversations
- Send/receive messages in real-time
- Schedule messages for later
- Convert conversations to recruiting leads
- Track usage and API limits

### Key Differentiators from Instagram Integration
| Feature | LinkedIn | Instagram |
|---------|----------|-----------|
| Message Length | 8000 chars | 1000 chars |
| Messaging Window | None | 24-hour restriction |
| Connection Degrees | 1st/2nd/3rd tracked | N/A |
| InMail Support | Yes | N/A |
| Recruiter/Sales Nav | Supported | N/A |

### Technology Stack
- **API Gateway**: Unipile (unified messaging platform)
- **Auth**: Unipile Hosted Auth (OAuth handled by Unipile, not direct LinkedIn tokens)
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with RLS
- **Frontend**: React 19 + TanStack Query + Tailwind CSS
- **Real-time**: Supabase Realtime + Unipile Webhooks

### Billing
- ~$5.50/account/month via Unipile
- Tracked in `billing_started_at` field
- Usage metrics in `linkedin_usage_tracking` table

---

## 2. Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │ Components  │──│ TanStack     │──│ Services                    │ │
│  │ (LinkedIn*) │  │ Query Hooks  │  │ (linkedinService)           │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────────┘ │
│         │                │                        │                  │
└─────────┼────────────────┼────────────────────────┼──────────────────┘
          │                │                        │
          ▼                ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Edge Functions  │  │ PostgreSQL      │  │ Realtime            │  │
│  │ (6 functions)   │  │ (4 tables)      │  │ (subscriptions)     │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────┘  │
│           │                    │                                     │
└───────────┼────────────────────┼─────────────────────────────────────┘
            │                    │
            ▼                    │
┌───────────────────┐            │
│    UNIPILE API    │◄───────────┘
│  (Messaging Hub)  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│    LINKEDIN       │
│    (Platform)     │
└───────────────────┘
```

### File Structure
```
src/
├── features/messages/components/linkedin/
│   ├── index.ts                      # Exports
│   ├── LinkedInConnectCard.tsx       # Connection CTA
│   ├── LinkedInTabContent.tsx        # Main tab container
│   ├── LinkedInSidebar.tsx           # Conversation list
│   ├── LinkedInConversationItem.tsx  # Sidebar row
│   ├── LinkedInConversationView.tsx  # Thread view
│   ├── LinkedInMessageBubble.tsx     # Message display
│   ├── LinkedInMessageInput.tsx      # Composer
│   └── LinkedInPriorityBadge.tsx     # Priority indicator
├── features/messages/components/settings/
│   └── LinkedInSettingsPanel.tsx     # Account settings
├── hooks/linkedin/
│   ├── index.ts                      # Exports
│   ├── useLinkedInIntegration.ts     # Query hooks
│   └── useLinkedInRealtime.ts        # Realtime hooks
├── services/linkedin/
│   ├── index.ts                      # Exports singleton
│   ├── linkedinService.ts            # Facade service
│   └── repositories/
│       ├── LinkedInIntegrationRepository.ts
│       ├── LinkedInConversationRepository.ts
│       ├── LinkedInMessageRepository.ts
│       └── LinkedInScheduledMessageRepository.ts
└── types/
    └── linkedin.types.ts             # All types

supabase/
├── functions/
│   ├── linkedin-hosted-auth-init/    # Start OAuth
│   ├── linkedin-hosted-auth-callback/# Handle OAuth callback
│   ├── linkedin-get-conversations/   # Sync conversations
│   ├── linkedin-get-messages/        # Sync messages
│   ├── linkedin-send-message/        # Send message
│   └── linkedin-webhook/             # Real-time events
└── migrations/
    ├── 20260108_001_linkedin_enums.sql
    ├── 20260108_002_linkedin_integrations.sql
    ├── 20260108_003_linkedin_conversations_messages.sql
    └── 20260108_004_linkedin_scheduled.sql
```

---

## 3. Database Schema

### Enums

```sql
-- Connection states
CREATE TYPE linkedin_connection_status AS ENUM (
  'connected',      -- Active and functional
  'disconnected',   -- User disconnected voluntarily
  'credentials',    -- Token expired, needs reconnection
  'error'           -- API error state
);

-- Message types
CREATE TYPE linkedin_message_type AS ENUM (
  'text',               -- Plain text message
  'media',              -- Has attachments
  'inmail',             -- Sponsored InMail
  'invitation_message'  -- Sent with connection request
);
```

### Tables

#### linkedin_integrations
Stores LinkedIn account connections managed by Unipile.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `imo_id` | UUID | Agency/IMO reference |
| `user_id` | UUID | Owner user |
| `unipile_account_id` | TEXT | Unipile's account reference |
| `account_type` | TEXT | LINKEDIN, LINKEDIN_RECRUITER, LINKEDIN_SALES_NAV |
| `linkedin_profile_id` | TEXT | LinkedIn member ID |
| `linkedin_username` | TEXT | Profile username |
| `linkedin_display_name` | TEXT | Display name |
| `linkedin_headline` | TEXT | Profile headline |
| `linkedin_profile_url` | TEXT | Profile URL |
| `linkedin_profile_picture_url` | TEXT | Avatar URL |
| `connection_status` | ENUM | Current status |
| `is_active` | BOOLEAN | Active flag |
| `last_connected_at` | TIMESTAMPTZ | Last successful connection |
| `last_sync_at` | TIMESTAMPTZ | Last conversation sync |
| `last_error` | TEXT | Error message |
| `last_error_at` | TIMESTAMPTZ | Error timestamp |
| `api_calls_this_hour` | INTEGER | Rate limit counter |
| `api_calls_reset_at` | TIMESTAMPTZ | Counter reset time |
| `billing_started_at` | TIMESTAMPTZ | Billing start date |

**Constraints:**
- `UNIQUE(user_id, imo_id)` - One integration per user per IMO
- `UNIQUE(unipile_account_id)` - Unipile account is unique

#### linkedin_conversations
Stores DM conversation threads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `integration_id` | UUID | Parent integration |
| `unipile_chat_id` | TEXT | Unipile's chat reference |
| `participant_linkedin_id` | TEXT | Other person's LinkedIn ID |
| `participant_username` | TEXT | Their username |
| `participant_name` | TEXT | Their display name |
| `participant_headline` | TEXT | Their headline |
| `participant_profile_picture_url` | TEXT | Their avatar |
| `participant_profile_url` | TEXT | Their profile URL |
| `participant_email` | TEXT | Manually entered email |
| `participant_phone` | TEXT | Manually entered phone |
| `contact_notes` | TEXT | CRM notes |
| `last_message_at` | TIMESTAMPTZ | Last message time |
| `last_message_preview` | TEXT | Truncated preview (100 chars) |
| `last_message_direction` | ENUM | inbound/outbound |
| `unread_count` | INTEGER | Unread message count |
| `is_connection` | BOOLEAN | Are they connected? |
| `connection_degree` | INTEGER | 1, 2, or 3 |
| `is_priority` | BOOLEAN | Priority flag |
| `priority_set_at` | TIMESTAMPTZ | When flagged |
| `priority_set_by` | UUID | Who flagged |
| `priority_notes` | TEXT | Priority notes |
| `recruiting_lead_id` | UUID | Linked recruiting lead |
| `auto_reminder_enabled` | BOOLEAN | Auto-reminder on? |
| `auto_reminder_template_id` | UUID | Template to use |
| `auto_reminder_hours` | INTEGER | Hours until reminder |

**Constraint:** `UNIQUE(integration_id, unipile_chat_id)`

#### linkedin_messages
Stores individual messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | Parent conversation |
| `unipile_message_id` | TEXT | Unipile's message reference (UNIQUE) |
| `message_text` | TEXT | Content (up to 8000 chars) |
| `message_type` | ENUM | text, media, inmail, invitation_message |
| `media_url` | TEXT | Attachment URL |
| `media_type` | TEXT | image, video, document, file |
| `direction` | ENUM | inbound/outbound |
| `status` | ENUM | pending, sent, delivered, read, failed |
| `sender_linkedin_id` | TEXT | Sender's LinkedIn ID |
| `sender_name` | TEXT | Sender's name |
| `sent_at` | TIMESTAMPTZ | When sent |
| `delivered_at` | TIMESTAMPTZ | When delivered |
| `read_at` | TIMESTAMPTZ | When read |
| `template_id` | UUID | If from template |
| `scheduled_message_id` | UUID | If from scheduled |

#### linkedin_scheduled_messages
Queue for scheduled messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | Target conversation |
| `message_text` | TEXT | Content (max 8000 chars) |
| `template_id` | UUID | Source template |
| `scheduled_for` | TIMESTAMPTZ | When to send |
| `scheduled_by` | UUID | Who scheduled |
| `valid_until` | TIMESTAMPTZ | Expiration time |
| `status` | ENUM | pending, sent, cancelled, failed, expired |
| `sent_at` | TIMESTAMPTZ | When actually sent |
| `sent_message_id` | UUID | Resulting message |
| `error_message` | TEXT | Error if failed |
| `retry_count` | INTEGER | Retry attempts |
| `is_auto_reminder` | BOOLEAN | Auto-reminder context |

#### linkedin_usage_tracking
Monthly usage statistics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `imo_id` | UUID | Agency reference |
| `user_id` | UUID | User reference |
| `period_start` | DATE | Month start |
| `period_end` | DATE | Month end |
| `messages_sent` | INTEGER | Outbound count |
| `messages_received` | INTEGER | Inbound count |
| `api_calls_made` | INTEGER | API call count |
| `scheduled_messages_sent` | INTEGER | Scheduled sent |
| `templates_used` | INTEGER | Template usage |
| `inmails_sent` | INTEGER | InMail count |
| `connection_requests_sent` | INTEGER | Connection requests |

---

## 4. Supabase Edge Functions

### linkedin-hosted-auth-init
**Purpose:** Starts OAuth flow by generating Unipile Hosted Auth URL.

**Endpoint:** POST `/functions/v1/linkedin-hosted-auth-init`

**Request:**
```json
{
  "imoId": "uuid",
  "userId": "uuid",
  "returnUrl": "/messages?tab=linkedin",
  "accountType": "LINKEDIN"
}
```

**Response:**
```json
{
  "ok": true,
  "url": "https://hosted.unipile.com/..."
}
```

**Flow:**
1. Validates user has LinkedIn access via RPC `user_has_linkedin_access()`
2. Checks account limit via RPC `can_add_linkedin_account()`
3. Creates HMAC-signed state with imoId, userId, timestamp, accountType
4. Calls Unipile API to generate hosted auth URL
5. Returns URL for user redirect

**Error Codes:**
- 400: Missing required parameters
- 403: No LinkedIn access or account limit reached
- 500: Configuration or API error

### linkedin-hosted-auth-callback
**Purpose:** Webhook handler for OAuth completion.

**Endpoint:** POST `/functions/v1/linkedin-hosted-auth-callback`

**Webhook Payload (from Unipile):**
```json
{
  "account_id": "unipile-account-id",
  "type": "LINKEDIN",
  "status": "CONNECTED",
  "name": "base64(state).signature",
  "provider_account_id": "linkedin-member-id",
  "provider_account_name": "John Doe"
}
```

**Flow:**
1. Parses and verifies HMAC-signed state
2. Validates timestamp (60-minute window)
3. Fetches account details from Unipile API
4. Upserts `linkedin_integrations` record
5. Triggers `linkedin-get-conversations` (fire-and-forget)

### linkedin-get-conversations
**Purpose:** Syncs conversations from Unipile to database.

**Endpoint:** POST `/functions/v1/linkedin-get-conversations`

**Request:**
```json
{
  "integrationId": "uuid",
  "limit": 50,
  "cursor": "pagination-token",
  "syncToDb": true
}
```

**Response:**
```json
{
  "ok": true,
  "conversations": [...],
  "cursor": "next-page-token",
  "count": 50
}
```

**Flow:**
1. Looks up integration to get Unipile account ID
2. Calls Unipile `/api/v1/chats` endpoint
3. Extracts participant info from attendees
4. Upserts each conversation to database
5. Updates `last_sync_at` on integration

### linkedin-get-messages
**Purpose:** Syncs message history for a conversation.

**Endpoint:** POST `/functions/v1/linkedin-get-messages`

**Request:**
```json
{
  "conversationId": "uuid",
  "limit": 50,
  "cursor": "pagination-token",
  "syncToDb": true
}
```

**Response:**
```json
{
  "ok": true,
  "messages": [...],
  "cursor": "next-page-token",
  "count": 50
}
```

**Flow:**
1. Looks up conversation to get Unipile chat ID
2. Calls Unipile `/api/v1/chats/{id}/messages`
3. Upserts messages with deduplication
4. Resets unread count on conversation

### linkedin-send-message
**Purpose:** Sends a message via LinkedIn.

**Endpoint:** POST `/functions/v1/linkedin-send-message`

**Request:**
```json
{
  "conversationId": "uuid",
  "messageText": "Hello!",
  "templateId": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "message_text": "Hello!",
    "sent_at": "timestamp"
  }
}
```

**Flow:**
1. Validates message length (max 8000 chars)
2. Checks rate limit (200 calls/hour per integration)
3. Calls Unipile `/api/v1/chats/{id}/messages` POST
4. Creates local message record with status: pending
5. Updates usage tracking
6. Handles token expiry (sets status to "credentials")

**Error Codes:**
- 400: Missing params or message too long
- 404: Conversation not found
- 429: Rate limited
- 500: API or configuration error

### linkedin-webhook
**Purpose:** Receives real-time events from Unipile.

**Endpoint:** POST `/functions/v1/linkedin-webhook`

**Always returns 200** to prevent retry loops.

**Event Types:**

| Event | Description | Action |
|-------|-------------|--------|
| `message` | New message received/sent | Upsert message, create conversation if needed |
| `message_read` | Message was read | Update status to "read" |
| `message_sent` | Confirmation of send | Log only |
| `account_status` | Account state changed | Update integration status |

**Account Status Mapping:**
- CONNECTED → "connected", is_active=true
- CREDENTIALS → "credentials", is_active=false
- ERROR → "error", is_active=false

---

## 5. Service Layer

### LinkedInServiceClass
**Location:** `src/services/linkedin/linkedinService.ts`

Facade pattern composing all repositories.

#### OAuth & Integration Methods
```typescript
// Start OAuth flow
initiateOAuth(params: {
  imoId: string;
  userId: string;
  returnUrl?: string;
  accountType?: LinkedInAccountType;
}): Promise<{ url: string }>

// Get user's active integration
getActiveIntegration(userId: string): Promise<LinkedInIntegration | null>

// Check if user has integration
hasActiveIntegration(userId: string): Promise<boolean>

// Disconnect integration
disconnect(integrationId: string): Promise<void>

// Delete integration completely
deleteIntegration(integrationId: string): Promise<void>
```

#### Conversation Methods
```typescript
// Sync from Unipile
syncConversations(integrationId: string, options?: {
  limit?: number;
  cursor?: string;
}): Promise<{ conversations: LinkedInConversation[]; cursor?: string }>

// Get from local DB
getConversations(integrationId: string, filters?: LinkedInConversationFilters): Promise<LinkedInConversation[]>

// Get single conversation
getConversationById(conversationId: string): Promise<LinkedInConversation | null>

// Set priority flag
setPriority(conversationId: string, isPriority: boolean, notes?: string): Promise<void>

// Update contact info
updateContactInfo(conversationId: string, info: UpdateLinkedInContactInfoInput): Promise<void>

// Convert to recruiting lead
createLeadFromConversation(input: CreateLeadFromLinkedInInput): Promise<string>
```

#### Message Methods
```typescript
// Sync messages from Unipile
syncMessages(conversationId: string, options?: {
  limit?: number;
  cursor?: string;
}): Promise<{ messages: LinkedInMessage[]; cursor?: string }>

// Get from local DB
getMessages(conversationId: string, options?: {
  limit?: number;
  offset?: number;
}): Promise<LinkedInMessage[]>

// Send message
sendMessage(conversationId: string, text: string, templateId?: string): Promise<LinkedInMessage>
```

#### Scheduled Message Methods
```typescript
// Schedule a message
scheduleMessage(input: ScheduleLinkedInMessageInput): Promise<LinkedInScheduledMessage>

// Get scheduled messages
getScheduledMessages(conversationId: string): Promise<LinkedInScheduledMessage[]>

// Cancel scheduled message
cancelScheduledMessage(messageId: string): Promise<void>
```

### Repository Classes

Each repository follows the same pattern:
- `findBy*()` methods for queries
- `transformFromDB()` / `transformToDB()` for conversions
- Consistent error handling

| Repository | Purpose |
|------------|---------|
| `LinkedInIntegrationRepository` | Integration CRUD |
| `LinkedInConversationRepository` | Conversation CRUD + filtering |
| `LinkedInMessageRepository` | Message CRUD |
| `LinkedInScheduledMessageRepository` | Scheduled message CRUD |

---

## 6. TanStack Query Hooks

**Location:** `src/hooks/linkedin/`

### Integration Hooks
```typescript
// Fetch all integrations for user's IMO
useLinkedInIntegrations()

// Fetch single integration
useLinkedInIntegrationById(id: string)

// Get user's active integration
useActiveLinkedInIntegration()

// Boolean check
useHasLinkedInIntegration(): { hasIntegration: boolean; isLoading: boolean }

// Connect (start OAuth)
useConnectLinkedIn()

// Disconnect
useDisconnectLinkedIn()

// Delete
useDeleteLinkedInIntegration()
```

### Conversation Hooks
```typescript
// List conversations with filters
useLinkedInConversations(integrationId: string, filters?: LinkedInConversationFilters)

// Get single conversation
useLinkedInConversation(conversationId: string)

// Priority conversations only
usePriorityLinkedInConversations(integrationId: string)

// Sync from Unipile
useSyncLinkedInConversations()

// Set priority
useSetLinkedInPriority()

// Update contact info
useUpdateLinkedInContactInfo()

// Create lead from conversation
useCreateLeadFromLinkedIn()
```

### Message Hooks
```typescript
// Get messages with pagination
useLinkedInMessages(conversationId: string, options?: { limit?: number })

// Send message (with optimistic updates)
useSendLinkedInMessage()

// Sync from Unipile
useSyncLinkedInMessages()
```

### Scheduled Message Hooks
```typescript
// Schedule message
useScheduleLinkedInMessage()

// Cancel scheduled
useCancelLinkedInScheduledMessage()

// List scheduled
useLinkedInScheduledMessages(conversationId: string)
```

### Realtime Hooks
**Location:** `src/hooks/linkedin/useLinkedInRealtime.ts`

```typescript
// Subscribe to new messages
useLinkedInMessagesRealtime(conversationId: string)

// Subscribe to conversation updates
useLinkedInConversationsRealtime(integrationId: string)

// Generic subscription
useLinkedInRealtime(table: string, filter?: object)

// Unread count tracker
useLinkedInUnreadCount(integrationId: string): number
```

### Query Key Factory
```typescript
linkedinKeys = {
  all: ["linkedin"],
  integrations: (imoId) => ["linkedin", "integrations", imoId],
  integration: (id) => ["linkedin", "integration", id],
  conversations: (integrationId, filters?) => ["linkedin", "conversations", integrationId, filters],
  conversation: (id) => ["linkedin", "conversation", id],
  priorityConversations: (integrationId) => ["linkedin", "priority", integrationId],
  messages: (conversationId) => ["linkedin", "messages", conversationId],
  scheduled: (conversationId) => ["linkedin", "scheduled", conversationId],
  allScheduled: (integrationId) => ["linkedin", "allScheduled", integrationId],
  usage: (userId, period?) => ["linkedin", "usage", userId, period],
}
```

---

## 7. UI Components

### LinkedInConnectCard
**Purpose:** CTA shown when no integration exists.

**Features:**
- LinkedIn icon and branding
- Benefits list (sync, DMs, recruiting)
- Connect button (triggers OAuth)
- Error display with clear button

### LinkedInTabContent
**Purpose:** Main tab container orchestrating the view.

**States:**
1. No integration → Shows `LinkedInConnectCard`
2. Has integration → Shows sidebar + conversation view
3. Session expired → Shows reconnect banner

### LinkedInSidebar
**Purpose:** Conversation list with search and filters.

**Features:**
- Search input
- Filter by priority/unread
- Auto-sync on mount
- Unread count badges
- Hover actions (priority toggle)

### LinkedInConversationItem
**Purpose:** Sidebar row for each conversation.

**Displays:**
- Avatar
- Name + headline
- Last message preview
- Unread badge
- Priority indicator
- Time ago

### LinkedInConversationView
**Purpose:** Full thread view.

**Sections:**
- Header with participant info
- Message list (grouped by sender)
- Message input
- Session expiration detection

### LinkedInMessageBubble
**Purpose:** Individual message display.

**Features:**
- Sender alignment (left/right)
- Timestamp
- Delivery status icon (pending/sent/delivered/read)
- Media attachment support
- Message grouping utility

### LinkedInMessageInput
**Purpose:** Message composer.

**Features:**
- Textarea with auto-resize
- 8000 char limit with counter
- Send button
- Schedule button (optional)
- Template support
- Prevents over-limit submissions

### LinkedInPriorityBadge
**Purpose:** Small indicator for priority status.

### LinkedInSettingsPanel
**Purpose:** Account settings in settings tab.

**Features:**
- Connected account info (name, headline, picture)
- Connection status badge
- Reconnect button
- Disconnect button with confirmation

---

## 8. Data Flows

### OAuth Connection Flow
```
1. User clicks "Connect LinkedIn"
2. useConnectLinkedIn.mutate({ returnUrl })
3. linkedinService.initiateOAuth()
4. Edge Function: linkedin-hosted-auth-init
   - Validates access
   - Creates HMAC-signed state
   - Calls Unipile for hosted auth URL
5. User redirects to Unipile → LinkedIn OAuth
6. User completes OAuth, redirects back
7. Unipile calls webhook: linkedin-hosted-auth-callback
   - Verifies state signature
   - Fetches profile from Unipile
   - Creates linkedin_integrations record
   - Triggers conversation sync
8. App detects ?linkedin=success
   - Invalidates query cache
   - Switches to LinkedIn tab
```

### Message Sync Flow
```
1. LinkedInSidebar mounts
2. useLinkedInConversations() fires
3. Auto-triggers useSyncLinkedInConversations.mutate()
4. linkedinService.syncConversations()
5. Edge Function: linkedin-get-conversations
   - Calls Unipile API
   - Upserts conversations
6. Cache updated, UI re-renders
7. User selects conversation
8. useLinkedInMessages() fires
9. Edge Function: linkedin-get-messages
   - Fetches from Unipile
   - Upserts messages
10. Realtime subscription handles new messages
```

### Message Send Flow
```
1. User types message, clicks Send
2. useSendLinkedInMessage.mutate()
3. Optimistic update (message appears immediately)
4. linkedinService.sendMessage()
5. Edge Function: linkedin-send-message
   - Validates length
   - Checks rate limit
   - Calls Unipile API
   - Creates message record (status: pending)
6. Webhook: message_sent → status: sent
7. Webhook: message_read → status: read
8. Realtime subscription updates cache
```

### Real-time Updates Flow
```
1. Unipile receives LinkedIn event
2. Unipile calls linkedin-webhook
3. Webhook processes event:
   - message → upserts message
   - message_read → updates status
   - account_status → updates integration
4. Supabase Realtime triggers
5. useLinkedInMessagesRealtime() receives update
6. Cache updated with new data
7. UI re-renders instantly
```

---

## 9. Integration Points

### Recruiting Pipeline
- Conversations can link to `recruiting_leads` via `recruiting_lead_id`
- `createLeadFromConversation()` creates lead with participant info
- Priority flag used for prospect nurturing
- Connection degree tracked for relationship management

### Message Templates
- Templates shared with Instagram via `message_templates` table
- `template_id` tracked on messages for analytics
- Content length validated per platform (8000 for LinkedIn)
- Template usage incremented via RPC

### Usage Analytics
- `linkedin_usage_tracking` table stores monthly stats
- Tracks: messages sent/received, API calls, templates used
- InMails and connection requests tracked separately
- Used for billing and quota management

### MessagesPage Integration
- LinkedIn tab added to Messages Hub
- OAuth callback handling via query params
- Integration with resizable sidebar
- Tab state management

---

## 10. Security & RLS

### RLS Strategy

All tables require user to own the related `linkedin_integrations` row:

```sql
-- Integration owner check
CREATE POLICY "users_own_integrations" ON linkedin_integrations
  FOR ALL USING (user_id = auth.uid());

-- Conversation access via integration
CREATE POLICY "users_access_conversations" ON linkedin_conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM linkedin_integrations
      WHERE id = integration_id
      AND user_id = auth.uid()
    )
  );

-- Message access via conversation chain
CREATE POLICY "users_access_messages" ON linkedin_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM linkedin_conversations c
      JOIN linkedin_integrations i ON i.id = c.integration_id
      WHERE c.id = conversation_id
      AND i.user_id = auth.uid()
    )
  );
```

### Team Visibility
- Integrations viewable by IMO team members (SELECT)
- But only modifiable by owner (INSERT/UPDATE/DELETE)

### OAuth Security
- HMAC-SHA256 signed state prevents CSRF
- 60-minute window for OAuth completion
- State includes timestamp for expiry check
- Tokens never stored locally (managed by Unipile)

### Webhook Security
- Always returns 200 (prevents Unipile retries)
- Validates integration exists before processing
- Logs errors but doesn't expose details

---

## 11. Configuration & Environment

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Unipile
UNIPILE_API_KEY=your-api-key
UNIPILE_DSN=api.unipile.com

# Security
SLACK_SIGNING_SECRET=your-hmac-secret  # Used for state signing

# App
APP_URL=https://your-app.com  # For OAuth redirects
```

### Unipile Dashboard Setup
1. Create Unipile account
2. Add application
3. Configure webhook URL: `https://your-supabase-url/functions/v1/linkedin-webhook`
4. Enable LinkedIn provider
5. Copy API key and DSN

### Rate Limits
- Per-integration: 200 API calls/hour
- Hourly reset window (not sliding)
- Counter stored in `api_calls_this_hour`
- Reset time in `api_calls_reset_at`

---

## 12. Troubleshooting

### Common Issues

#### "Session Expired" Banner
**Cause:** Unipile session expired or LinkedIn token revoked.
**Solution:** User clicks "Reconnect" to re-authenticate.
**Technical:** Integration status set to "credentials".

#### Messages Not Syncing
**Check:**
1. Integration `is_active` = true
2. Integration `connection_status` = 'connected'
3. Unipile dashboard shows account connected
4. Webhook endpoint configured correctly

#### Rate Limited (429)
**Cause:** Exceeded 200 calls/hour limit.
**Solution:** Wait for hourly reset.
**Technical:** Check `api_calls_reset_at` timestamp.

#### Duplicate Messages
**Prevention:** `unipile_message_id` UNIQUE constraint.
**Realtime:** Hooks check for existing ID before insert.

#### Conversation Not Found
**Check:**
1. Conversation exists in database
2. User owns the integration
3. RLS policies not blocking access

### Debug Queries

```sql
-- Check integration status
SELECT id, connection_status, is_active, last_error, api_calls_this_hour
FROM linkedin_integrations
WHERE user_id = 'uuid';

-- Check conversation sync
SELECT id, unipile_chat_id, last_message_at, unread_count
FROM linkedin_conversations
WHERE integration_id = 'uuid'
ORDER BY last_message_at DESC;

-- Check recent messages
SELECT id, direction, status, sent_at
FROM linkedin_messages
WHERE conversation_id = 'uuid'
ORDER BY sent_at DESC
LIMIT 20;

-- Check webhook processing
SELECT *
FROM linkedin_messages
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

### Logs Locations
- Edge function logs: Supabase Dashboard → Edge Functions → Logs
- Webhook events: Filter by `linkedin-webhook` function
- OAuth errors: Filter by `linkedin-hosted-auth-*` functions

---

## File Reference

### Types
- `/src/types/linkedin.types.ts`

### Services
- `/src/services/linkedin/linkedinService.ts`
- `/src/services/linkedin/repositories/*.ts`

### Hooks
- `/src/hooks/linkedin/useLinkedInIntegration.ts`
- `/src/hooks/linkedin/useLinkedInRealtime.ts`

### Components
- `/src/features/messages/components/linkedin/*.tsx`
- `/src/features/messages/components/settings/LinkedInSettingsPanel.tsx`
- `/src/features/messages/MessagesPage.tsx`

### Edge Functions
- `/supabase/functions/linkedin-hosted-auth-init/index.ts`
- `/supabase/functions/linkedin-hosted-auth-callback/index.ts`
- `/supabase/functions/linkedin-get-conversations/index.ts`
- `/supabase/functions/linkedin-get-messages/index.ts`
- `/supabase/functions/linkedin-send-message/index.ts`
- `/supabase/functions/linkedin-webhook/index.ts`

### Migrations
- `/supabase/migrations/20260108_001_linkedin_enums.sql`
- `/supabase/migrations/20260108_002_linkedin_integrations.sql`
- `/supabase/migrations/20260108_003_linkedin_conversations_messages.sql`
- `/supabase/migrations/20260108_004_linkedin_scheduled.sql`

---

## Implementation Status

**Complete** - All layers fully implemented:
- Database schema (4 migrations)
- Edge functions (6 functions)
- Service layer with repositories
- TanStack Query hooks
- UI components (9 components)
- MessagesPage integration with OAuth callback
- Settings panel with connect/disconnect/reconnect
