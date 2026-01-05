# Instagram DM Enhancement Plan

**Created:** 2026-01-05
**Status:** PENDING IMPLEMENTATION

---

## Goals

1. **Display profile photos** of Instagram users in conversation list and chat view
2. **Fetch user contact info** (email, phone) from Instagram profiles if available
3. **Auto-populate lead creation** when selecting a conversation with:
   - First name
   - Last name
   - Email
   - Phone
   - State

---

## Current State

- Instagram DM integration is working (conversations loading)
- Meta App ID: `1168926578343790`
- Business ID: `1031454965449972`
- App Dashboard: `https://developers.facebook.com/apps/1168926578343790/dashboard/?business_id=1031454965449972`

---

## Research Required

### 1. Profile Photos
- Check if `profile_picture_url` is available in Instagram Graph API user/participant data
- Determine if we need additional permissions/scopes
- API endpoint: `GET /{user-id}?fields=profile_picture_url`

### 2. Contact Information (Email/Phone)
- **IMPORTANT:** Instagram API typically does NOT expose email/phone for privacy
- Check what fields are available: `GET /{user-id}?fields=name,username,biography`
- May need to parse bio for contact info (not reliable)
- Alternative: Manual entry or prompt user to ask for contact info in DM

### 3. Lead Auto-Population
- Parse Instagram username/name for first/last name split
- Store any extracted contact info with conversation record
- Pre-fill lead creation form from conversation metadata

---

## Implementation Tasks

### Task 1: Add Profile Photos to Conversations

**Files to modify:**
- `supabase/functions/instagram-get-conversations/index.ts` - Fetch profile_picture_url
- `src/features/messages/components/instagram/InstagramSidebar.tsx` - Display avatars
- `src/features/messages/components/instagram/InstagramConversationItem.tsx` - Avatar component
- Database: Add `participant_profile_picture_url` column to `instagram_conversations` table

**Steps:**
1. Update API request to include `profile_picture_url` in fields
2. Store profile picture URL in database
3. Display avatar in conversation list
4. Add fallback avatar (initials) if no photo available

### Task 2: Fetch Available User Data

**Files to modify:**
- `supabase/functions/instagram-get-conversations/index.ts` - Expand fields requested
- Database: May need columns for additional user data

**Steps:**
1. Research which fields Instagram API actually returns for participants
2. Request all available fields: `id,username,name,profile_picture_url`
3. Store any useful data
4. Document what IS and IS NOT available from API

### Task 3: Lead Creation Auto-Population

**Files to modify:**
- `src/features/messages/components/instagram/InstagramChatView.tsx` - Add "Create Lead" button
- `src/features/leads/components/LeadForm.tsx` - Accept pre-filled data
- `src/services/instagram/instagramService.ts` - Helper to extract lead data from conversation

**Steps:**
1. Add "Create Lead" action button in chat view header
2. When clicked, extract available data from conversation:
   - Parse `participant_name` into first/last name
   - Include `participant_username` as reference
   - Include any available contact info
3. Open lead creation form with pre-filled fields
4. Link created lead to Instagram conversation

### Task 4: Contact Info Collection Flow (Alternative)

Since Instagram API likely won't provide email/phone:
- Add UI prompt suggesting user ask for contact info in chat
- Add quick-reply templates for requesting contact details
- When user manually enters contact info, save to conversation record

---

## Database Schema Changes

```sql
-- Add to instagram_conversations table
ALTER TABLE instagram_conversations ADD COLUMN IF NOT EXISTS participant_profile_picture_url TEXT;
ALTER TABLE instagram_conversations ADD COLUMN IF NOT EXISTS participant_email TEXT;
ALTER TABLE instagram_conversations ADD COLUMN IF NOT EXISTS participant_phone TEXT;
ALTER TABLE instagram_conversations ADD COLUMN IF NOT EXISTS linked_lead_id UUID REFERENCES leads(id);
```

---

## Key Files Reference

- `supabase/functions/instagram-get-conversations/index.ts`
- `supabase/functions/instagram-get-messages/index.ts`
- `src/services/instagram/instagramService.ts`
- `src/features/messages/components/instagram/InstagramSidebar.tsx`
- `src/features/messages/components/instagram/InstagramChatView.tsx`
- `src/features/leads/components/LeadForm.tsx`

---

## API Documentation References

- Instagram Graph API User: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user
- Instagram Messaging API: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging

---

## Continuation Prompt

When starting a new session to implement this plan:

1. Read this file: `plans/active/ig-enhance.md`
2. Read memory file: `meta-developer-app-info.md`
3. First task: Research Instagram Graph API to confirm what user fields are actually available
4. Implement in order: Profile photos → User data fetch → Lead auto-population
5. Test each feature before moving to next
6. Update CHANGELOG.md when complete

---

## Notes

- Email/phone will likely NOT be available via API - plan for manual collection
- Profile photos should be straightforward
- Name parsing (first/last) will be imperfect - Instagram users often use display names, not real names
- Consider adding a "Save Contact Info" feature where user can manually add details learned from conversation
