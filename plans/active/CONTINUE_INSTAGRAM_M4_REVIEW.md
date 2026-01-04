# Continue: Instagram DM Integration - Milestone 4 Code Review

## Context

Milestone 4 (Basic UI) of the Instagram DM integration was just completed. Before proceeding to Milestone 5, a comprehensive code review is needed to verify alignment with the foundation established in Milestones 1-3.

## What Was Completed

### Milestone 4 Deliverables
- **Feature Gate Integration**: Added `instagram_messaging` to subscription feature system
- **3 New UI Components**: InstagramTabContent, InstagramConnectCard, InstagramSetupGuide
- **MessagesPage Integration**: Replaced placeholder with functional Instagram tab

## Files Created in Milestone 4

| File | Purpose |
|------|---------|
| `src/features/messages/components/instagram/index.ts` | Barrel exports |
| `src/features/messages/components/instagram/InstagramTabContent.tsx` | Main entry with FeatureGate wrapper |
| `src/features/messages/components/instagram/InstagramConnectCard.tsx` | OAuth CTA card with setup guide trigger |
| `src/features/messages/components/instagram/InstagramSetupGuide.tsx` | 4-section dialog with setup instructions |

## Files Modified in Milestone 4

| File | Changes |
|------|---------|
| `src/services/subscription/SubscriptionRepository.ts` | Added `instagram_messaging: boolean` to SubscriptionFeatures interface |
| `src/hooks/subscription/useFeatureAccess.ts` | Added `instagram_messaging: "Team"` and display name |
| `src/features/messages/MessagesPage.tsx` | Added import, replaced placeholder at lines 353-365 |

---

## Review Checklist

### 1. Feature Gate Alignment
Verify the subscription feature integration:
- [ ] `instagram_messaging` in SubscriptionFeatures interface matches DB migration `20260103_009_instagram_billing_feature.sql`
- [ ] Feature requires "Team" tier (same as sms, hierarchy, recruiting)
- [ ] FeatureGate wrapper correctly blocks non-Team users

### 2. Hook Usage Alignment
Verify UI components correctly use the hooks from Milestone 3:
- [ ] `useActiveInstagramIntegration()` - Used in InstagramTabContent
- [ ] `useConnectInstagram()` - Used for OAuth flow initiation
- [ ] Query keys match `instagramKeys` factory from `instagram.types.ts`

### 3. Type Alignment
Verify components use correct types from Milestone 1/3:
- [ ] `InstagramIntegration` type used for connected account display
- [ ] Computed fields (`isConnected`, `tokenExpiringSoon`) available if needed
- [ ] No type mismatches or `any` usage

### 4. Service Layer Alignment
Verify OAuth flow connects to Milestone 2 edge functions:
- [ ] `instagramService.initiateOAuth()` calls `instagram-oauth-init` edge function
- [ ] Redirect URL defaults to `/messages`
- [ ] Error handling for feature gate and config errors

### 5. Design Pattern Alignment
Verify UI follows established patterns from Slack integration:
- [ ] Component structure mirrors `SlackTabContent.tsx` pattern
- [ ] Zinc palette used consistently (zinc-50 through zinc-950)
- [ ] Text sizes match compact design (10px, 11px, 12px)
- [ ] Dark mode support with `dark:` prefixes

### 6. State Flow Verification
- [ ] Loading → Spinner displayed
- [ ] Error → Error message displayed
- [ ] No Integration → InstagramConnectCard displayed
- [ ] Has Integration → Connected state placeholder displayed

---

## Critical Files to Review (In Order)

1. **Feature Gating**
   - `src/services/subscription/SubscriptionRepository.ts` (line 37)
   - `src/hooks/subscription/useFeatureAccess.ts` (lines 39, 60)

2. **UI Components**
   - `src/features/messages/components/instagram/InstagramTabContent.tsx`
   - `src/features/messages/components/instagram/InstagramConnectCard.tsx`
   - `src/features/messages/components/instagram/InstagramSetupGuide.tsx`

3. **Integration Point**
   - `src/features/messages/MessagesPage.tsx` (line 30, line 354)

4. **Reference Files from Previous Milestones**
   - `src/hooks/instagram/useInstagramIntegration.ts` (M3 hooks)
   - `src/services/instagram/InstagramService.ts` (M3 service)
   - `src/types/instagram.types.ts` (M1 types)
   - `supabase/migrations/20260103_009_instagram_billing_feature.sql` (M1 billing)

---

## Copy-Ready Prompt

```
# Code Review: Instagram DM Integration - Milestone 4

I just completed Milestone 4 (Basic UI) for the Instagram DM integration. Before proceeding to Milestone 5, I need you to perform a comprehensive code review to verify alignment with the foundation established in Milestones 1-3.

## Primary Task
Review the newly created UI components and verify they correctly integrate with:
1. **Milestone 1** - Database schema and billing feature flag
2. **Milestone 2** - OAuth edge functions
3. **Milestone 3** - Repository/service layer and TanStack Query hooks

## Files to Review

### New UI Components (Milestone 4)
1. `src/features/messages/components/instagram/InstagramTabContent.tsx`
2. `src/features/messages/components/instagram/InstagramConnectCard.tsx`
3. `src/features/messages/components/instagram/InstagramSetupGuide.tsx`
4. `src/features/messages/components/instagram/index.ts`

### Modified Files
5. `src/services/subscription/SubscriptionRepository.ts` - Added instagram_messaging
6. `src/hooks/subscription/useFeatureAccess.ts` - Added feature requirements
7. `src/features/messages/MessagesPage.tsx` - Integration point

### Reference Files (Milestones 1-3)
8. `src/hooks/instagram/useInstagramIntegration.ts` - Hooks being used
9. `src/services/instagram/InstagramService.ts` - Service being called
10. `src/types/instagram.types.ts` - Types being used
11. `supabase/migrations/20260103_009_instagram_billing_feature.sql` - Billing feature

## Review Focus Areas

1. **Type Safety**: Verify all types match instagram.types.ts definitions
2. **Hook Integration**: Verify correct hooks are used with proper error handling
3. **Feature Gate**: Verify subscription feature correctly gates the UI
4. **OAuth Flow**: Verify connect button triggers correct edge function
5. **Design Patterns**: Verify zinc palette and compact styling matches Slack patterns
6. **State Handling**: Verify all states (loading, error, empty, connected) are handled

## Expected Output
- List of any misalignments or issues found
- Confirmation that M4 correctly builds on M1-M3 foundation
- Any recommendations for improvements before M5

Read the plan file for full context: `plans/active/instagram-dm-integration.md`
```

---

## Previous Milestones Reference

### Milestone 1: Database Schema ✅
- 6 migrations creating enums, tables, RLS policies
- `instagram_messaging` feature added to Team tier

### Milestone 2: OAuth & Edge Functions ✅
- `instagram-oauth-init` - Generates OAuth URL
- `instagram-oauth-callback` - Handles token exchange
- `instagram-refresh-token` - CRON for token refresh

### Milestone 3: Data Layer ✅
- 5 repositories (Integration, Conversation, Message, ScheduledMessage, Template)
- InstagramService facade composing all repositories
- 20 TanStack Query hooks for React integration

### Milestone 4: Basic UI ✅ (Just Completed)
- FeatureGate integration for Team tier
- InstagramTabContent, InstagramConnectCard, InstagramSetupGuide
- MessagesPage integration

### Milestone 5: Conversations & Messages (Next)
- InstagramSidebar component
- InstagramConversationView component
- InstagramMessageInput component
- InstagramWindowIndicator component

---

## Notes

- Build passes with zero TypeScript errors
- Instagram tab is now functional in the Messages page
- Feature gate correctly shows upgrade prompt for non-Team users
- OAuth flow redirects to Meta but callback not yet tested end-to-end
