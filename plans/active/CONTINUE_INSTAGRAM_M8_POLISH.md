# Instagram DM Integration - Phase 8: Polish & Testing

## Context

Phases 1-7 are complete. The Instagram DM integration is now fully functional with:
- ✅ Database schema and migrations (Phase 1)
- ✅ OAuth flow and token management (Phase 2)
- ✅ Repository/Service architecture (Phase 3)
- ✅ Basic UI with feature gate (Phase 4)
- ✅ Conversations and messaging (Phase 5)
- ✅ Priority contacts and lead creation (Phase 6)
- ✅ Webhooks and automation system (Phase 7)

Phase 8 is the final polish and testing phase before production readiness.

## Phase 8 Objectives

### 8.1 Usage Tracking & Analytics

Track Instagram DM usage for billing and analytics:

1. **Message Usage Table** (already exists: `instagram_usage_tracking`)
   - Track messages sent per integration per month
   - Enforce any tier-based limits if needed

2. **Dashboard Integration**
   - Add Instagram metrics to user dashboard
   - Show: messages sent/received, active conversations, leads created

### 8.2 Error Handling Improvements

Review and enhance error handling across all components:

1. **Edge Function Error Handling**
   - Ensure all edge functions return consistent error formats
   - Add retry logic where appropriate
   - Log errors with sufficient context for debugging

2. **UI Error States**
   - User-friendly error messages for all failure modes
   - Retry buttons where appropriate
   - Network error handling with offline detection

3. **Token Expiration Handling**
   - Clear notification when token expires
   - One-click reconnect flow
   - Auto-disconnect stale integrations

### 8.3 Empty States

Design and implement empty states for:

1. **No Integration Connected**
   - `InstagramConnectCard` with setup guide

2. **No Conversations**
   - Friendly message explaining how to get started
   - Link to Instagram Business account requirements

3. **No Messages in Conversation**
   - "Start the conversation" prompt

4. **No Templates**
   - Create first template CTA

5. **No Scheduled Messages**
   - Explain scheduling feature

### 8.4 Loading States

Add skeleton loaders and loading indicators:

1. **Conversation List Loading**
   - Skeleton rows while fetching

2. **Message History Loading**
   - Skeleton bubbles while fetching

3. **Sending Message**
   - Disable input, show spinner on send button

4. **OAuth Flow**
   - Loading overlay during redirect

### 8.5 Mobile Responsiveness

Ensure mobile-friendly experience:

1. **Responsive Sidebar**
   - Collapsible on mobile
   - Full-width conversation view when conversation selected

2. **Touch-Friendly Controls**
   - Larger tap targets on mobile
   - Swipe gestures for common actions

3. **Message Input**
   - Proper keyboard handling on mobile
   - Viewport adjustments when keyboard opens

### 8.6 Performance Optimization

1. **Message Virtualization**
   - Virtualize long message lists (react-window)
   - Lazy load older messages

2. **Image Optimization**
   - Lazy load profile pictures
   - Placeholder avatars during load

3. **Query Optimization**
   - Ensure proper staleTime/cacheTime settings
   - Prefetch likely-needed data

### 8.7 Testing Checklist

#### Manual Testing Flow

1. **OAuth Flow**
   - [ ] Connect new Instagram Business account
   - [ ] Verify token stored encrypted
   - [ ] Verify integration shows as connected
   - [ ] Disconnect and reconnect

2. **Conversations**
   - [ ] Load conversation list
   - [ ] Filter by priority
   - [ ] Search conversations
   - [ ] Select conversation and view messages

3. **Messaging**
   - [ ] Send message within window
   - [ ] Verify message appears in conversation
   - [ ] Receive inbound message (webhook)
   - [ ] Verify window resets on inbound

4. **Scheduling**
   - [ ] Schedule message for future
   - [ ] Verify scheduled message in pending list
   - [ ] Cancel scheduled message
   - [ ] Verify scheduled message sends (wait for CRON)

5. **Templates**
   - [ ] Create new template
   - [ ] Insert template into message
   - [ ] Edit template
   - [ ] Delete template

6. **Priority & Leads**
   - [ ] Mark conversation as priority
   - [ ] Create lead from conversation
   - [ ] Verify lead linked in recruiting pipeline

7. **Edge Cases**
   - [ ] Window expired - verify send disabled
   - [ ] Token expired - verify reconnect prompt
   - [ ] Network offline - verify error handling
   - [ ] Rate limit hit - verify graceful degradation

## Files to Review/Modify

### Components Needing Polish
```
src/features/messages/components/instagram/InstagramTabContent.tsx
src/features/messages/components/instagram/InstagramSidebar.tsx
src/features/messages/components/instagram/InstagramConversationView.tsx
src/features/messages/components/instagram/InstagramMessageInput.tsx
src/features/messages/components/instagram/InstagramConnectCard.tsx
```

### Services Needing Error Handling Review
```
src/services/instagram/instagramService.ts
src/services/instagram/repositories/*.ts
```

### Edge Functions Needing Error Handling Review
```
supabase/functions/instagram-oauth-init/index.ts
supabase/functions/instagram-oauth-callback/index.ts
supabase/functions/instagram-send-message/index.ts
supabase/functions/instagram-webhook/index.ts
supabase/functions/instagram-process-scheduled/index.ts
```

## Implementation Order

| Step | Task | Priority |
|------|------|----------|
| 1 | Audit and fix error handling in edge functions | High |
| 2 | Add empty states to all components | High |
| 3 | Add loading skeletons | Medium |
| 4 | Mobile responsiveness pass | Medium |
| 5 | Usage tracking integration | Medium |
| 6 | Performance optimization | Low |
| 7 | Complete manual testing checklist | High |

## Success Criteria

- [ ] All error states show user-friendly messages
- [ ] All empty states have helpful guidance
- [ ] All loading states show appropriate feedback
- [ ] Mobile experience is usable
- [ ] Manual testing checklist fully passed
- [ ] No TypeScript errors
- [ ] No console errors during normal usage

## Notes

- This is the final phase before production
- Focus on polish, not new features
- Prioritize user experience over technical perfection
- Document any known limitations for v1
