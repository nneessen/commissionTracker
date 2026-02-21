# Email System Architecture - Full Investigation

## PROBLEM STATEMENT
User expects workflow emails to go through their connected Gmail account, but `process-workflow/index.ts` is hardcoded to use Resend API directly instead of the user's Gmail connection.

## 1. GMAIL CONNECTION INFRASTRUCTURE (EXISTS & FULLY SET UP)

### Database Tables (Migration: 20260127091516_gmail_oauth_integration.sql)
- **gmail_integrations**: Stores user's Gmail OAuth connection
  - Fields: user_id, gmail_address, gmail_user_id, gmail_name, gmail_picture_url
  - Tokens: access_token_encrypted, refresh_token_encrypted (AES-256-GCM encrypted)
  - Status: connection_status (enum: connected, disconnected, expired, error)
  - Constraints: Each user can only connect ONE Gmail account (UNIQUE on user_id)
  - RLS enabled: Users can only see their own integration
  
- **gmail_sync_log**: Audit log for Gmail sync operations
  - Tracks sync_type: 'full', 'incremental', 'send'
  - Monitors messages_synced, status, error_message, duration_ms

- **user_emails table modifications**:
  - gmail_message_id: Gmail API message ID for deduplication
  - gmail_thread_id: Gmail thread ID for threading
  - gmail_label_ids: Gmail labels (INBOX, SENT, STARRED, etc.)
  - gmail_history_id: For incremental sync
  - email_provider: 'mailgun' or 'gmail'
  - is_incoming: boolean (received vs sent)

### Edge Functions for Gmail

#### 1. **gmail-send-email** (PRIMARY GMAIL SEND FUNCTION)
- File: supabase/functions/gmail-send-email/index.ts
- FULLY IMPLEMENTED to send via user's connected Gmail account
- Process:
  1. Retrieves user's active Gmail integration from database
  2. Decrypts access token
  3. Checks if token expired, auto-refreshes if needed
  4. Builds RFC 2822 MIME message with proper headers
  5. Sends via Gmail API (users/me/messages/send)
  6. Supports threading via gmailThreadId, inReplyTo, references
  7. Updates api_calls_today tracking
  8. Logs operation to gmail_sync_log

**Request Interface:**
```typescript
{
  userId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  threadId?: string;
  gmailThreadId?: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references?: string[];
}
```

**Response:**
```typescript
{
  success: true;
  messageId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  provider: "gmail";
}
```

#### 2. **gmail-oauth-init** - Initiates OAuth flow
#### 3. **gmail-oauth-callback** - Handles OAuth callback
#### 4. **gmail-refresh-token** - Refreshes expired tokens
#### 5. **gmail-sync-inbox** - Syncs inbox messages
#### 6. **process-pending-workflows** - (related, not direct Gmail)

## 2. CURRENT EMAIL SENDING IN WORKFLOWS (BROKEN)

### Path: process-workflow/index.ts (Lines 219-584)
**Function: executeSendEmail()**

Current Implementation:
- Hardcoded to use **Resend API** (lines 471-484)
- Does NOT check if user has Gmail connected
- Does NOT call gmail-send-email edge function
- Sends from: "The Standard HQ <noreply@updates.thestandardhq.com>"
- Logs to user_emails table with provider: "resend"

Key Variables Available at Send Time:
- ownerProfile (workflow creator's full profile)
- workflowId, runId
- recipientEmails[] (determined by recipientType)
- templateVariables (replaced in subject/body)
- context object

**The Fix Needed:**
Instead of directly calling Resend API, should:
1. Check if ownerProfile has an active Gmail integration
2. If yes: call gmail-send-email with userId
3. If no: fallback to current Resend behavior

## 3. OTHER EMAIL SENDING MECHANISMS

### send-email (Mailgun)
- File: supabase/functions/send-email/index.ts
- Uses Mailgun API for user-composed emails
- Supports file attachments and training documents
- Supports email threading

### send-automated-email (Mailgun)
- File: supabase/functions/send-automated-email/index.ts
- For system-generated emails when Mailgun configured
- Can simulate if no Mailgun credentials
- Used by process-email-queue

### process-email-queue
- File: supabase/functions/process-email-queue/index.ts
- Processes pending emails from email_queue table
- Calls send-automated-email for each email
- NOT currently used by workflows (workflows call Resend directly)

## 4. USER EMAIL SERVICE LAYER

### src/services/email/UserEmailService.ts
- **sendEmail()** method invokes "send-email" edge function
- Currently hardcoded to Mailgun
- Does NOT have Gmail awareness

### src/features/email/services/emailTemplateService.ts
- Gets/creates/updates email templates
- Supports block-based templates
- No provider selection logic

## 5. WORKFLOW FRONTEND

### src/features/workflows/components/ActionConfigPanel.tsx
- Allows selection of email template for send_email actions
- No UI for selecting email provider (Gmail vs Mailgun)
- Currently only selects template, not provider

## 6. ENUM: gmail_connection_status
```sql
CREATE TYPE gmail_connection_status AS ENUM (
  'connected',
  'disconnected', 
  'expired',
  'error'
);
```

## DATABASE DESIGN NOTES

### Constraints
- One Gmail per user (UNIQUE on user_id in gmail_integrations)
- Each Gmail can only connect once system-wide (UNIQUE on gmail_address)
- Both support multiple email providers at the infrastructure level (mailgun, gmail)

### Token Management
- Access tokens: ~1 hour expiry
- Refresh tokens: Long-lived
- Automatic refresh on expiry (with 1-minute buffer)

### RLS (Row Level Security)
- gmail_integrations: Users see only their own
- gmail_sync_log: Users see only logs for their own integration

## RESOLUTION PATH

To fix the workflow email system:

1. **Modify process-workflow/executeSendEmail()**:
   - After getting ownerProfile, query gmail_integrations table
   - If active Gmail found: call gmail-send-email edge function
   - If not found: fallback to current Resend behavior

2. **Optional: Add UI selector**:
   - Let users choose preferred provider when creating workflows
   - Store provider preference in action.config

3. **Add provider field to action config**:
   - track which provider was used
   - store in user_emails.email_provider for audit

4. **Update rate limiting/quota tracking**:
   - Track Gmail API calls for quota management
   - Use gmail_integrations.api_calls_today counter

## KEY FILES TO MODIFY
- supabase/functions/process-workflow/index.ts (executeSendEmail function)
- Optional: ActionConfigPanel.tsx (add provider UI)
- Optional: workflow action types (add provider field)
