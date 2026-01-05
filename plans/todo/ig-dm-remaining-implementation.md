# Instagram DM Performance - Remaining Implementation Plan

## Overview

This plan covers the remaining work needed to fully complete the Instagram DM Performance & Architecture improvements. The infrastructure (migrations, edge functions, hooks) has been built; this plan focuses on integration, configuration, and UI updates.

**Status:** Infrastructure complete, integration pending
**Priority:** High - needed to realize performance gains

---

## 1. Supabase Storage Configuration

### 1.1 Create Storage Bucket

**Action:** Create `instagram-media` bucket in Supabase Dashboard or via migration

**Migration Option:** `supabase/migrations/20260106_001_instagram_storage_bucket.sql`
```sql
-- Create storage bucket for Instagram media caching
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instagram-media',
  'instagram-media',
  true,  -- Public for avatar/media access
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;
```

### 1.2 Storage RLS Policies

**Migration:** Add RLS policies for the bucket

```sql
-- Allow service role to upload (from edge functions)
CREATE POLICY "Service role can upload instagram media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'instagram-media');

-- Allow authenticated users to read media for their integrations
CREATE POLICY "Users can view their instagram media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'instagram-media'
  AND (
    -- Avatar path: avatars/{integration_id}/{participant_id}.ext
    -- Message path: messages/{conversation_id}/{message_id}.ext
    EXISTS (
      SELECT 1 FROM instagram_integrations i
      WHERE i.user_id = auth.uid()
      AND (
        storage.foldername(name)[1] = 'avatars'
        AND storage.foldername(name)[2] = i.id::text
      )
    )
    OR EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN instagram_integrations i ON c.integration_id = i.id
      WHERE i.user_id = auth.uid()
      AND storage.foldername(name)[1] = 'messages'
      AND storage.foldername(name)[2] = c.id::text
    )
  )
);
```

### 1.3 Files to Create/Modify
- `supabase/migrations/20260106_001_instagram_storage_bucket.sql` (new)

---

## 2. CRON Job Configuration

### 2.1 Schedule instagram-process-jobs

**Action:** Add CRON trigger for the job processor

**Option A: Supabase Dashboard**
- Navigate to Edge Functions → instagram-process-jobs
- Add schedule: `*/1 * * * *` (every minute)

**Option B: Via pg_cron (if enabled)**
```sql
SELECT cron.schedule(
  'instagram-process-jobs',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-process-jobs',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

### 2.2 Verify Existing CRON Jobs
- Ensure `instagram-process-scheduled` still runs every 5 minutes
- Ensure `instagram-refresh-token` runs daily

---

## 3. UI Integration - Cached Media URLs

### 3.1 Update Avatar Display Components

**Files to Modify:**
- `src/features/messages/components/instagram/InstagramConversationItem.tsx`
- `src/features/messages/components/instagram/InstagramConversationView.tsx`
- `src/features/messages/components/instagram/InstagramSidebar.tsx`

**Change Pattern:**
```tsx
// Before
<AvatarImage src={conversation.participant_profile_picture_url} />

// After
import { selectAvatarUrl } from "@/lib/instagram";

<AvatarImage
  src={selectAvatarUrl(
    conversation.participant_avatar_cached_url,
    conversation.participant_profile_picture_url
  ) ?? undefined}
/>
```

### 3.2 Update Message Media Display

**File:** `src/features/messages/components/instagram/InstagramMessageBubble.tsx`

**Change Pattern:**
```tsx
// Before
{message.media_url && <img src={message.media_url} />}

// After
import { selectMediaUrl } from "@/lib/instagram";

const mediaUrl = selectMediaUrl(message.media_cached_url, message.media_url);
{mediaUrl && <img src={mediaUrl} />}
```

### 3.3 Add Broken Image Fallback

**Pattern for all avatar/media components:**
```tsx
<img
  src={mediaUrl}
  onError={(e) => {
    e.currentTarget.style.display = 'none';
    // Or show fallback icon
  }}
/>
```

---

## 4. UI Integration - Selectors for Computed Fields

### 4.1 Replace windowStatus/windowTimeRemaining Usage

**Files to Modify:**
- `src/features/messages/components/instagram/InstagramWindowIndicator.tsx`
- `src/features/messages/components/instagram/InstagramConversationView.tsx`
- `src/features/messages/components/instagram/InstagramMessageInput.tsx`

**Change Pattern:**
```tsx
// Before (using computed field from DB transform)
const status = conversation.windowStatus;
const remaining = conversation.windowTimeRemaining;

// After (compute at render time)
import { selectWindowStatus, selectWindowTimeRemaining, formatTimeRemaining } from "@/lib/instagram";

const status = selectWindowStatus(conversation.can_reply_until);
const remaining = selectWindowTimeRemaining(conversation.can_reply_until);
const formattedRemaining = formatTimeRemaining(remaining);
```

### 4.2 Replace Other Computed Fields

**Display Name:**
```tsx
import { selectDisplayName, selectInitials } from "@/lib/instagram";

const displayName = selectDisplayName(
  conversation.participant_name,
  conversation.participant_username,
  conversation.participant_instagram_id
);
const initials = selectInitials(displayName);
```

**Message Direction:**
```tsx
import { selectIsOutbound } from "@/lib/instagram";

const isOutbound = selectIsOutbound(message.direction);
```

**Message Time:**
```tsx
import { formatMessageTime } from "@/lib/instagram";

const formattedTime = formatMessageTime(message.sent_at);
```

---

## 5. Remove Computed Fields from Repository Transforms

### 5.1 Identify Current Transforms

**File:** `src/services/instagram/repositories/` (check each repository)

Look for transforms that compute:
- `windowStatus`
- `windowTimeRemaining`
- `isOutbound`
- `formattedSentAt`
- `hasLinkedLead`

### 5.2 Remove/Simplify Transforms

**Before (in repository):**
```typescript
function transformConversation(row: ConversationRow): InstagramConversation {
  return {
    ...row,
    windowStatus: calculateWindowStatus(row.can_reply_until),
    windowTimeRemaining: calculateTimeRemaining(row.can_reply_until),
    // ...
  };
}
```

**After:**
```typescript
function transformConversation(row: ConversationRow): InstagramConversation {
  return {
    ...row,
    // Remove windowStatus, windowTimeRemaining - computed in UI via selectors
    hasLinkedLead: !!row.recruiting_lead_id, // Keep simple boolean derivations
  };
}
```

### 5.3 Update Types

**File:** `src/types/instagram.types.ts`

Remove computed fields from `InstagramConversation` and `InstagramMessage` types if they're no longer computed in transforms. Or mark them as optional.

---

## 6. Selective Cache Invalidation

### 6.1 Update Mutation Invalidations

**File:** `src/hooks/instagram/useInstagramIntegration.ts`

**Current (aggressive):**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: instagramKeys.all });
}
```

**Target (selective):**
```typescript
// For sending a message
onSuccess: (data, { conversationId }) => {
  // Update messages for this conversation only
  queryClient.invalidateQueries({
    queryKey: instagramKeys.messages(conversationId)
  });
  // Update conversation metadata (last_message_at, etc.)
  queryClient.invalidateQueries({
    queryKey: instagramKeys.conversation(conversationId)
  });
}
```

### 6.2 Use setQueryData for Optimistic Updates

**Pattern:**
```typescript
onSuccess: (newMessage, { conversationId }) => {
  // Optimistically add message to cache
  queryClient.setQueryData(
    instagramKeys.messages(conversationId),
    (old: Message[]) => [newMessage, ...old]
  );

  // Update conversation preview
  queryClient.setQueryData(
    instagramKeys.conversation(conversationId),
    (old: Conversation) => ({
      ...old,
      last_message_at: newMessage.sent_at,
      last_message_preview: newMessage.message_text?.substring(0, 100),
      last_message_direction: 'outbound',
    })
  );
}
```

---

## 7. Profile Picture Refresh Policy

### 7.1 Add Refresh Job Enqueuing

**When to refresh:**
- On conversation sync if `participant_avatar_cached_at` > 30 days old
- When avatar returns 403/404 (detected in UI, enqueue via API)

**Add to conversation sync:**
```typescript
// In instagram-get-conversations edge function
if (
  existing.participant_avatar_cached_url &&
  existing.participant_avatar_cached_at &&
  Date.now() - new Date(existing.participant_avatar_cached_at).getTime() > 30 * 24 * 60 * 60 * 1000
) {
  // Enqueue refresh job
  await supabase.rpc("enqueue_instagram_job", {
    p_job_type: "download_profile_picture",
    p_payload: { ... },
    p_priority: -2, // Low priority
  });
}
```

### 7.2 Add Manual Refresh API (Optional)

**New endpoint or service method:**
```typescript
async function requestAvatarRefresh(conversationId: string) {
  // Enqueue a job to re-download the avatar
}
```

---

## 8. Error Handling & Fallbacks

### 8.1 Handle Media Download Failures

**In job processor:**
- If download fails 3 times, mark conversation/message with `avatar_fetch_failed: true`
- UI should show fallback gracefully

### 8.2 Handle Realtime Disconnects

**Add reconnection logic:**
```typescript
// In useInstagramRealtime.ts
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('[realtime] Connected');
  }
  if (status === 'CHANNEL_ERROR') {
    console.error('[realtime] Error, will retry');
    // Supabase client handles reconnection automatically
  }
});
```

### 8.3 Fallback to Polling

**If realtime fails:**
```typescript
// Keep refetchInterval as fallback (longer interval since realtime handles most)
useQuery({
  // ...
  staleTime: 5 * 60 * 1000,
  refetchInterval: 60 * 1000, // Fallback polling every 60s
});
```

---

## Implementation Order

| Step | Task | Effort | Priority |
|------|------|--------|----------|
| 1 | Create storage bucket + policies | Small | High |
| 2 | Schedule CRON for instagram-process-jobs | Small | High |
| 3 | Update avatar display to use cached URLs | Small | High |
| 4 | Update message media to use cached URLs | Small | Medium |
| 5 | Replace windowStatus with selectors in UI | Medium | Medium |
| 6 | Remove computed fields from repository transforms | Medium | Medium |
| 7 | Implement selective cache invalidation | Medium | Medium |
| 8 | Add profile picture refresh policy | Small | Low |
| 9 | Add error handling & fallbacks | Small | Low |

---

## Files to Modify Summary

**Migrations (new):**
- `supabase/migrations/20260106_001_instagram_storage_bucket.sql`

**Edge Functions:**
- `supabase/functions/instagram-get-conversations/index.ts` (avatar refresh logic)

**Components:**
- `src/features/messages/components/instagram/InstagramConversationItem.tsx`
- `src/features/messages/components/instagram/InstagramConversationView.tsx`
- `src/features/messages/components/instagram/InstagramSidebar.tsx`
- `src/features/messages/components/instagram/InstagramMessageBubble.tsx`
- `src/features/messages/components/instagram/InstagramWindowIndicator.tsx`
- `src/features/messages/components/instagram/InstagramMessageInput.tsx`

**Hooks:**
- `src/hooks/instagram/useInstagramIntegration.ts` (selective invalidation)
- `src/hooks/instagram/useInstagramRealtime.ts` (error handling)

**Services/Types:**
- `src/services/instagram/repositories/*.ts` (remove computed fields)
- `src/types/instagram.types.ts` (update types)

---

## Success Criteria

1. **Avatars load from Supabase Storage** - no 403 errors from expired Meta URLs
2. **Message media loads from cache** - images/videos always display
3. **Window status is accurate** - computed fresh on each render
4. **Cache invalidation is minimal** - only affected queries invalidated
5. **Realtime updates work** - messages appear without refresh
6. **Fallbacks work** - graceful degradation if realtime fails

---

## Notes

- The job queue infrastructure is complete but needs CRON scheduling
- Storage bucket must be created before media caching will work
- UI changes are non-breaking - can be done incrementally
- Test thoroughly with expired Meta URLs to verify caching works
