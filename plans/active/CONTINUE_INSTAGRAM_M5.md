# Continuation Prompt: Instagram DM Integration - Milestone 5

## Session Context

**Feature**: Instagram DM Integration for Messages Page
**Current Status**: Milestone 4 Complete, Ready for Milestone 5
**Last Updated**: 2026-01-04

---

## Completed Work Summary

### Milestone 1: Database Schema (Complete)
- Created 6 migrations in `supabase/migrations/`:
  - `20260103_004_instagram_enums.sql` - Enum types
  - `20260103_005_instagram_integrations.sql` - OAuth integration table
  - `20260103_006_instagram_conversations_messages.sql` - Conversations & messages
  - `20260103_007_instagram_scheduled_templates.sql` - Scheduled messages, templates
  - `20260103_008_instagram_lead_source.sql` - Lead source tracking
  - `20260103_009_instagram_billing_feature.sql` - Team tier feature flag
- Created types in `src/types/instagram.types.ts`

### Milestone 2: OAuth & Edge Functions (Complete)
- Created edge functions:
  - `supabase/functions/instagram-oauth-init/index.ts`
  - `supabase/functions/instagram-oauth-callback/index.ts`
  - `supabase/functions/instagram-refresh-token/index.ts`
- Created `src/services/instagram/instagramService.ts` (legacy flat service)
- Created `src/hooks/instagram/useInstagramIntegration.ts` with 20 hooks

### Milestone 3: Data Layer Refactoring (Complete)
- Created repository pattern under `src/services/instagram/repositories/`:
  - `InstagramIntegrationRepository.ts`
  - `InstagramConversationRepository.ts`
  - `InstagramMessageRepository.ts`
  - `InstagramScheduledMessageRepository.ts`
  - `InstagramTemplateRepository.ts`
  - `index.ts` (barrel export)
- Created `src/services/instagram/InstagramService.ts` (facade class)
- Updated `src/services/instagram/index.ts` exports

### Milestone 4: Basic UI (Complete)
- Created UI components in `src/features/messages/components/instagram/`:
  - `InstagramTabContent.tsx` - Main entry with feature gate
  - `InstagramConnectCard.tsx` - OAuth connection CTA
  - `InstagramSetupGuide.tsx` - Setup instructions dialog
  - `index.ts` - Barrel exports
- Modified subscription files:
  - `src/services/subscription/SubscriptionRepository.ts` - Added `instagram_messaging: boolean`
  - `src/hooks/subscription/useFeatureAccess.ts` - Added feature requirements
- Integrated into `src/features/messages/MessagesPage.tsx`

### Code Review Fixes Applied
1. **P0 Fix**: Added retry button to error state in `InstagramTabContent.tsx`
   - Added `refetch` from query hook
   - Added "Try Again" button with RefreshCw icon
2. **P1 Fix**: Surface connection errors in UI
   - Added `connectionError` state tracking
   - Pass error/onClearError props to `InstagramConnectCard`
   - Added red alert box UI for error display
3. **P1 Fix**: Added explicit `ReactNode` return types to all components

---

## Next Task: Milestone 5 - Conversations & Messages

### Edge Functions to Create
1. `supabase/functions/instagram-get-conversations/index.ts`
2. `supabase/functions/instagram-get-messages/index.ts`
3. `supabase/functions/instagram-send-message/index.ts`

### UI Components to Create
Location: `src/features/messages/components/instagram/`

| Component | Purpose |
|-----------|---------|
| `InstagramSidebar.tsx` | Conversation list (mirror SlackSidebar pattern) |
| `InstagramConversationItem.tsx` | Single conversation row |
| `InstagramConversationView.tsx` | Message thread + input |
| `InstagramMessageBubble.tsx` | Single message display |
| `InstagramMessageInput.tsx` | Compose with char limit (1000) |
| `InstagramWindowIndicator.tsx` | 24hr window status badge |

### State Lifting Required
In `MessagesPage.tsx`, add state variables (mirror Slack pattern):
- `selectedInstagramIntegrationId`
- `selectedInstagramConversationId`

Add Instagram sidebar rendering in the left panel when `activeTab === "instagram"`.

---

## Key Reference Files

### Patterns to Follow
- `src/features/messages/components/slack/SlackSidebar.tsx` - Sidebar structure
- `src/features/messages/components/slack/SlackChannelView.tsx` - Conversation view
- `src/features/messages/components/slack/SlackTabContent.tsx` - Tab content pattern

### Types & Hooks
- `src/types/instagram.types.ts` - All Instagram types including `getWindowStatus()`, `formatWindowTimeRemaining()`
- `src/hooks/instagram/useInstagramIntegration.ts` - Hooks: `useInstagramConversations`, `useInstagramMessages`
- `src/services/instagram/InstagramService.ts` - Service methods

### Design Standards
- Zinc palette (zinc-50 through zinc-950)
- Text sizes: 10px, 11px, 12px
- Padding: 1, 1.5, 2 (Tailwind units)
- Buttons: h-5, h-6, h-7
- Icons: h-3, h-3.5, h-4

---

## Build Verification

After any changes:
```bash
npm run build
```
Must pass with zero TypeScript errors.

---

## Plan Document Reference
Full plan: `plans/active/instagram-dm-integration.md`
