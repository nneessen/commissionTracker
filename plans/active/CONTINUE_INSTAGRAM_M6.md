# Continuation Prompt: Instagram DM Integration - Milestone 6

## Session Context

**Feature**: Instagram DM Integration for Messages Page
**Current Status**: Milestone 5 Complete, Ready for Milestone 6
**Last Updated**: 2026-01-04

---

## Completed Work Summary

### Milestone 1-4: Foundation, OAuth, Data Layer, Basic UI (Complete)
- All database migrations applied
- OAuth edge functions deployed
- Repository pattern implemented
- Basic UI with feature gate working

### Milestone 5: Conversations & Messages (Complete)

#### Edge Functions Created & Deployed
| Function | Purpose | Security |
|----------|---------|----------|
| `instagram-get-conversations` | Fetch conversation list, batch sync to DB | User auth + ownership verification |
| `instagram-get-messages` | Fetch messages for conversation | User auth + ownership verification |
| `instagram-send-message` | Send DM with 24hr window validation | User auth + ownership verification |

#### UI Components Created
| Component | Location |
|-----------|----------|
| `InstagramSidebar.tsx` | Conversation list with search & priority filter |
| `InstagramConversationItem.tsx` | Single conversation row with unread/window badges |
| `InstagramConversationView.tsx` | Message thread with date separators, priority toggle |
| `InstagramMessageBubble.tsx` | Message display with status icons, media support |
| `InstagramMessageInput.tsx` | Composer with 1000 char limit, window-closed state |
| `InstagramWindowIndicator.tsx` | 24hr window status badge (open/closing/closed) |

#### Integration Complete
- `MessagesPage.tsx` updated with Instagram sidebar state
- `InstagramTabContent.tsx` renders conversation view when selected
- Resizable sidebar panel for Instagram conversations

#### Migrations Applied
- `20260104_001_instagram_template_rpc.sql` - `increment_template_use_count()` RPC function

---

## Next Task: Milestone 6 - Priority & Leads

### Components to Create

Location: `src/features/messages/components/instagram/`

| Component | Purpose |
|-----------|---------|
| `InstagramPriorityBadge.tsx` | Visual priority indicator with tooltip |
| `CreateLeadFromIGDialog.tsx` | Dialog to convert IG contact to recruiting lead |

### Service Methods to Implement/Verify

The `setPriority` mutation already exists in `useInstagramIntegration.ts` (via `useSetInstagramPriority` hook). Verify it's properly connected to the service layer.

Need to create/implement:
- `createLeadFromConversation()` in `InstagramService.ts`
- `useCreateLeadFromInstagram()` hook

### Lead Service Integration

Update `src/services/leads/leadsService.ts`:
- Ensure `lead_source: 'instagram_dm'` is properly handled
- Link to `instagram_conversation_id` when creating from IG

### UI Enhancements

1. **Priority Toggle** (already in ConversationView header)
   - Star button toggles priority status
   - Visual feedback on toggle
   - Updates sidebar item styling

2. **CreateLeadFromIGDialog.tsx**
   - Pre-fill from IG contact:
     - First/last name (parsed from display name)
     - Instagram username
     - `lead_source = 'instagram_dm'`
   - User fills:
     - Email (required)
     - Phone (required)
     - State, city, experience level
   - Creates lead and links to conversation
   - Updates conversation row to show lead badge

3. **Lead Badge in Sidebar**
   - Small badge/icon on `InstagramConversationItem` when linked to lead
   - Already have `hasLinkedLead` computed property in types

---

## Key Reference Files

### Existing Code to Reference
- `src/features/recruiting/components/AddRecruitDialog.tsx` - Lead creation dialog pattern
- `src/services/leads/leadsService.ts` - Lead creation service
- `src/hooks/instagram/useInstagramIntegration.ts` - `useSetInstagramPriority` already exists
- `src/types/instagram.types.ts` - `CreateLeadFromIGInput` type defined

### Types Already Defined
```typescript
// src/types/instagram.types.ts
export interface CreateLeadFromIGInput {
  conversationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  availability?: "full_time" | "part_time" | "exploring";
  insuranceExperience?: "none" | "less_than_1_year" | "1_to_3_years" | "3_plus_years";
  whyInterested?: string;
}
```

### Design Standards
- Zinc palette (zinc-50 through zinc-950)
- Text sizes: 10px, 11px, 12px
- Padding: 1, 1.5, 2 (Tailwind units)
- Buttons: h-5, h-6, h-7
- Icons: h-3, h-3.5, h-4

---

## Implementation Steps

1. **Create InstagramPriorityBadge component**
   - Visual star/badge for priority status
   - Tooltip explaining priority feature
   - Match existing priority patterns in codebase

2. **Verify setPriority flow**
   - Ensure `useSetInstagramPriority` hook works end-to-end
   - Service → Repository → Database update
   - Query invalidation refreshes conversation list

3. **Create CreateLeadFromIGDialog component**
   - Modal dialog matching existing UI patterns
   - Form with pre-filled + user-input fields
   - Submit calls service method

4. **Implement createLeadFromConversation**
   - Add method to `InstagramService.ts`
   - Create lead in `recruiting_leads` table
   - Update conversation with `recruiting_lead_id`
   - Set `lead_source = 'instagram_dm'`

5. **Create useCreateLeadFromInstagram hook**
   - Mutation hook following TanStack Query patterns
   - Invalidate relevant queries on success
   - Toast feedback

6. **Update ConversationView actions bar**
   - Add "Create Lead" button (disabled if already linked)
   - Opens CreateLeadFromIGDialog
   - Show lead badge in header when linked

7. **Test end-to-end flow**
   - Priority toggle works
   - Lead creation works
   - Conversation shows linked status
   - Sidebar shows lead badge

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
