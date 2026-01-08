# LinkedIn Integration Continuation Prompt

## Status: UI Integration Pending

The LinkedIn messaging integration via Unipile API is 90% complete. All backend and component code exists, but the UI integration into MessagesPage was reverted and needs to be re-applied.

## What's Complete

### Database (Phase 1) ✅
- 6 migration files applied
- Tables: `linkedin_integrations`, `linkedin_conversations`, `linkedin_messages`, `linkedin_scheduled_messages`
- Enums: `linkedin_connection_status`, `linkedin_message_type`

### Edge Functions (Phase 2) ✅
- `linkedin-hosted-auth-init` - Generates Unipile hosted auth URL
- `linkedin-hosted-auth-callback` - Handles account connection webhook
- `linkedin-get-conversations` - Syncs conversations from Unipile
- `linkedin-get-messages` - Fetches messages for a conversation
- `linkedin-send-message` - Sends message via Unipile
- `linkedin-webhook` - Real-time inbound message handler

### Service Layer (Phase 3) ✅
- `src/services/linkedin/repositories/LinkedInIntegrationRepository.ts`
- `src/services/linkedin/repositories/LinkedInConversationRepository.ts`
- `src/services/linkedin/repositories/LinkedInMessageRepository.ts`
- `src/services/linkedin/repositories/LinkedInScheduledMessageRepository.ts`
- `src/services/linkedin/linkedinService.ts`
- `src/services/linkedin/index.ts`

### TanStack Query Hooks (Phase 4) ✅
- `src/hooks/linkedin/useLinkedInIntegration.ts` - All query/mutation hooks
- `src/hooks/linkedin/useLinkedInRealtime.ts` - Realtime subscriptions
- `src/hooks/linkedin/index.ts`

### UI Components (Phase 5) ✅
All components exist in `src/features/messages/components/linkedin/`:
- `LinkedInConnectCard.tsx` - Unipile OAuth connection CTA
- `LinkedInMessageBubble.tsx` - Message display
- `LinkedInMessageInput.tsx` - 8000 char composer
- `LinkedInPriorityBadge.tsx` - Priority indicator
- `LinkedInConversationItem.tsx` - Sidebar conversation row
- `LinkedInSidebar.tsx` - Conversation list
- `LinkedInConversationView.tsx` - Full thread view
- `LinkedInTabContent.tsx` - Main tab container
- `index.ts` - Component exports

## What Needs To Be Done

### 1. Integrate LinkedIn Tab into MessagesPage
File: `src/features/messages/MessagesPage.tsx`

Changes needed:
- Add `Linkedin` to lucide-react imports
- Import `LinkedInTabContent`, `LinkedInSidebar` from `./components/linkedin`
- Import `useActiveLinkedInIntegration`, `useLinkedInConversations` from `@/hooks/linkedin`
- Add `"linkedin"` to `TabType` union
- Add LinkedIn state: `selectedLinkedInConversationId`
- Add LinkedIn integration/conversations queries
- Add LinkedIn resizable sidebar hook
- Add LinkedIn to tabs array: `{ id: "linkedin", label: "LinkedIn", icon: Linkedin }`
- Add LinkedIn sidebar rendering (similar to Instagram)
- Add LinkedIn tab content rendering
- Add LinkedIn OAuth callback useEffect handler

### 2. Update LinkedInSettingsPanel
File: `src/features/messages/components/settings/LinkedInSettingsPanel.tsx`

Replace the "Coming Soon" placeholder with functional settings panel that:
- Shows connection status
- Displays connected account info (name, headline, profile picture)
- Has reconnect button for expired sessions
- Has disconnect button with confirmation dialog

Use `src/features/messages/components/settings/InstagramSettingsPanel.tsx` as reference pattern.

### 3. Unipile Configuration
Webhook URL configured in Unipile dashboard:
```
https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/linkedin-webhook
```

Verify Supabase secrets are set:
- `UNIPILE_API_KEY`
- `UNIPILE_DSN`

## Key Technical Details

- LinkedIn uses 8000 char message limit (vs Instagram's 1000)
- No 24-hour messaging window restriction
- Uses "credentials" status for expired sessions (not "expired")
- Connection degrees (1st, 2nd, 3rd) instead of window status
- Unipile Hosted Auth flow (not direct OAuth)

## Reference Files
- Instagram integration pattern: `src/features/messages/components/instagram/`
- Instagram settings: `src/features/messages/components/settings/InstagramSettingsPanel.tsx`
- Main plan: `/home/nneessen/.claude/plans/giggly-cooking-rossum.md`

## Task
Re-integrate LinkedIn into the MessagesPage and update LinkedInSettingsPanel to be functional. Run typecheck after changes to verify compilation.
