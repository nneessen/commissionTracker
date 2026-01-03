# Instagram DM Integration - Milestone 3 Continuation

## Context
We're implementing Instagram DM integration for the Messages page. Milestones 1 (Foundation) and 2 (OAuth) are complete.

## What's Done

### Milestone 1: Foundation ✅
- 6 Database migrations applied (enums, integrations, conversations, messages, scheduled, templates, billing)
- TypeScript types in `src/types/instagram.types.ts`
- Team tier billing gate for `instagram_messaging` feature

### Milestone 2: OAuth & Integration ✅
- `supabase/functions/instagram-oauth-init/index.ts` - Generates Meta OAuth URL with required scopes
- `supabase/functions/instagram-oauth-callback/index.ts` - Token exchange, long-lived token, IG account discovery
- `supabase/functions/instagram-refresh-token/index.ts` - CRON to refresh tokens expiring within 7 days
- `src/services/instagram/instagramService.ts` - Service layer with OAuth and CRUD methods
- `src/hooks/instagram/useInstagramIntegration.ts` - TanStack Query hooks

## Current Task: Milestone 3 - Basic UI

Create the foundational UI components for Instagram DM integration:

### 1. `InstagramTabContent.tsx`
- Main container component with feature gate
- Uses `useDashboardFeatures` to check `instagram_messaging`
- Shows `UpgradePrompt` if user doesn't have Team tier
- Otherwise renders the Instagram integration UI

### 2. `InstagramConnectCard.tsx`
- OAuth connection button for users without integration
- Shows setup instructions
- Uses `useConnectInstagram` hook to initiate OAuth
- Displays loading state during OAuth redirect

### 3. `InstagramSetupGuide.tsx`
- Step-by-step instructions for connecting Instagram Business account
- Requirements: FB Page linked to IG Business account
- Common troubleshooting tips

### 4. Wire into MessagesPage.tsx
- Add "Instagram" tab alongside existing Email/Slack tabs
- Import and render `InstagramTabContent`

## Reference Files
- **Slack patterns:** `src/features/messages/components/slack/`
- **Messages page:** `src/features/messages/MessagesPage.tsx`
- **Feature gate:** `src/hooks/dashboard/useDashboardFeatures.ts`
- **Instagram hooks:** `src/hooks/instagram/useInstagramIntegration.ts`
- **Instagram service:** `src/services/instagram/instagramService.ts`

## Directory Structure
```
src/features/messages/components/instagram/
├── index.ts
├── InstagramTabContent.tsx
├── InstagramConnectCard.tsx
└── InstagramSetupGuide.tsx
```

## Styling Guidelines
- Zinc palette (zinc-50 through zinc-950)
- Text sizes: 10px, 11px, 12px
- Padding: 1, 1.5, 2 (Tailwind units)
- Buttons: h-5, h-6, h-7
- Icons: h-3, h-3.5, h-4
- Borders: border-zinc-200/800
- Rounded corners: rounded, rounded-md, rounded-lg

## Plan Location
Full plan with all milestones: `plans/active/instagram-dm-integration.md`

## Instructions
1. Read the MessagesPage.tsx to understand tab structure
2. Check useDashboardFeatures for feature gate pattern
3. Create the directory and components
4. Wire InstagramTabContent into MessagesPage
5. Run typecheck before committing
