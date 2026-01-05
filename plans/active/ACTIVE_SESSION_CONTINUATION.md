# Instagram DM Integration - Continuation Prompt

## Session Context

Instagram OAuth is now working. User can successfully connect their Instagram Business account. The integration is stored in `instagram_integrations` table.

## What Was Just Completed

1. **Fixed OAuth Flow** - Switched from Facebook OAuth to Instagram OAuth endpoint
   - Uses Instagram App ID: `858157193486561`
   - Uses `instagram.com/oauth/authorize` instead of `facebook.com/dialog/oauth`
   - Scopes: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`, `instagram_business_content_publish`

2. **Database Fix** - Made `facebook_page_id` and `facebook_page_name` columns nullable (no longer using Facebook Pages)

3. **Vercel Redirect** - Added `/api/instagram-oauth-callback` redirect in `vercel.json` to proxy to Supabase

## Current State

- **OAuth**: Working ✅
- **Integration stored in DB**: Working ✅
- **UI shows connected state**: Working ✅ (shows @username with "Connected" badge)
- **Conversations list**: NOT WORKING - sidebar doesn't show conversations
- **Send/Receive DMs**: NOT IMPLEMENTED
- **Webhooks**: NOT CONFIGURED (needed for real-time messages)

## What Needs To Be Done

### Priority 1: Wire Up Instagram Sidebar in Messages Page

The `InstagramSidebar.tsx` component exists but needs to be properly integrated into `MessagesPage.tsx`. Currently the Instagram tab shows the connected state but no conversation list.

**Files to check:**
- `src/features/messages/MessagesPage.tsx` - Main page, needs to render InstagramSidebar
- `src/features/messages/components/instagram/InstagramSidebar.tsx` - Sidebar component
- `src/features/messages/components/instagram/InstagramTabContent.tsx` - Tab content

### Priority 2: Implement Conversation Sync from Instagram API

Need edge functions to fetch conversations from Instagram Graph API:
- `instagram-sync-conversations` - Fetch all conversations from IG API and store in DB
- `instagram-get-conversations` - Read from local DB (already have hooks for this)

**Instagram Graph API endpoint:**
```
GET https://graph.instagram.com/v21.0/me/conversations
?access_token={token}
&fields=participants,messages{message,from,created_time}
```

### Priority 3: Implement Send Message

Need edge function:
- `instagram-send-message` - Send DM via Instagram API (validates 24hr window)

**Instagram Graph API endpoint:**
```
POST https://graph.instagram.com/v21.0/me/messages
{
  "recipient": {"id": "<instagram_user_id>"},
  "message": {"text": "Hello!"}
}
```

### Priority 4: Set Up Webhooks for Real-Time Messages

The `instagram-webhook` edge function exists and is deployed. Need to:
1. Configure webhook in Meta Developer Console
2. Subscribe to `messages` event
3. Handle inbound messages (store in DB, update conversation window)

**Webhook URL:** `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-webhook`
**Verify Token:** `thestandardhq_ig_webhook_2026`

### Priority 5: Lead Integration

- `CreateLeadFromIGDialog.tsx` exists
- Need to wire up to recruiting pipeline
- Create lead from Instagram conversation with `lead_source = 'instagram_dm'`

## Key Files Reference

### Existing Components (all in `src/features/messages/components/instagram/`)
- `InstagramTabContent.tsx` - Main entry point ✅
- `InstagramConnectCard.tsx` - OAuth button ✅
- `InstagramSidebar.tsx` - Conversation list (needs wiring)
- `InstagramConversationItem.tsx` - Single conversation row
- `InstagramConversationView.tsx` - Message thread
- `InstagramMessageBubble.tsx` - Message display
- `InstagramMessageInput.tsx` - Compose input
- `InstagramWindowIndicator.tsx` - 24hr window status
- `InstagramPriorityBadge.tsx` - Priority indicator
- `InstagramTemplateSelector.tsx` - Quick templates
- `InstagramScheduleDialog.tsx` - Schedule messages
- `CreateLeadFromIGDialog.tsx` - Convert to lead

### Services & Hooks
- `src/services/instagram/InstagramService.ts` - Main service facade
- `src/services/instagram/repositories/` - 5 repository classes
- `src/hooks/instagram/useInstagramIntegration.ts` - TanStack Query hooks

### Edge Functions
- `supabase/functions/instagram-oauth-init/` - OAuth start ✅
- `supabase/functions/instagram-oauth-callback/` - OAuth callback ✅
- `supabase/functions/instagram-webhook/` - Webhook handler (needs Meta config)
- `supabase/functions/instagram-refresh-token/` - Token refresh CRON

### Database Tables
- `instagram_integrations` - OAuth tokens & connection status
- `instagram_conversations` - DM threads
- `instagram_messages` - Individual messages
- `instagram_scheduled_messages` - Automation queue
- `instagram_message_templates` - Reusable templates

## Original Plan Location

See full implementation plan: `plans/active/instagram-dm-integration.md`

## Meta App Configuration

- **App ID:** `1168926578343790` (Facebook App)
- **Instagram App ID:** `858157193486561`
- **Redirect URI:** `https://www.thestandardhq.com/api/instagram-oauth-callback`
- **Webhook URL:** `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-webhook`
- **Webhook Verify Token:** `thestandardhq_ig_webhook_2026`

## Supabase Secrets Set

```
INSTAGRAM_APP_ID=858157193486561
INSTAGRAM_APP_SECRET=e4dfc03f8febf898ba192eef430ee5de
META_APP_SECRET=864d8545e0157369e5cbd6ec31294f4d
META_WEBHOOK_VERIFY_TOKEN=thestandardhq_ig_webhook_2026
```

## Instructions for Next Session

1. Read this file first
2. Read `plans/active/instagram-dm-integration.md` for full context
3. Start with Priority 1: Wire up InstagramSidebar in MessagesPage
4. Then implement conversation sync (Priority 2)
5. Then implement send message (Priority 3)
6. User's goal: Full Instagram DM functionality for recruiting - send/receive messages, search users, add to recruiting pipeline
