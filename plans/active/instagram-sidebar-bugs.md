# Instagram Sidebar Bug Fixes Plan

## Issue Summary

Two bugs in the Instagram messaging feature:
1. **Refresh Button Infinite Spin** - The refresh button in Instagram sidebar spins forever on initial render
2. **Priority Star Not Updating** - Star doesn't visually fill with yellow immediately after clicking; requires page reload

---

## Findings

### Bug 1: Infinite Spinning Refresh Button

**Location:** `src/features/messages/components/instagram/InstagramSidebar.tsx:59-77`

**Root Cause Analysis:**

1. The sidebar uses `useSyncInstagramConversations()` mutation on component mount
2. The `isSyncing = syncConversations.isPending` controls the spinner animation
3. The useEffect auto-triggers the sync on first render:
   ```tsx
   useEffect(() => {
     if (integration.id && hasSyncedRef.current !== integration.id) {
       hasSyncedRef.current = integration.id;
       syncConversations.mutate({ integrationId: integration.id }, {...});
     }
   }, [integration.id]);
   ```

4. The mutation calls `instagramService.syncConversations()` which invokes Edge Function `instagram-get-conversations`
5. **Problem:** If the Edge Function:
   - Times out (Supabase functions have a 60s timeout)
   - Has network issues
   - The integration has an invalid/expired token
   - Any error that isn't properly caught

   The `supabase.functions.invoke()` may hang or not resolve properly, keeping `isPending = true` forever.

6. **Secondary Issue:** The `useEffect` sets `hasSyncedRef.current = integration.id` BEFORE the mutation is called, meaning if the mutation fails, the ref still thinks it synced. However, this doesn't cause the infinite spin - it just prevents retries.

**Evidence:**
- The spinner is controlled by `isSyncing` which is `syncConversations.isPending`
- If pending never resolves to false, spinner animates forever
- The service calls an Edge Function which could hang

**Hypothesis:** The Edge Function either:
- Returns an error that isn't being caught
- Hangs due to token issues
- Network/timeout issues causing the promise to never settle

---

### Bug 2: Priority Star Not Updating Immediately

**Location:**
- `src/features/messages/components/instagram/InstagramConversationView.tsx:163-181`
- `src/hooks/instagram/useInstagramIntegration.ts:372-406`

**Root Cause Analysis:**

1. **Data Flow:**
   ```
   InstagramTabContent (parent)
     └── useInstagramConversations(integrationId) → conversations[]
     └── passes selected conversation as prop
           └── InstagramConversationView({ conversation: initialConversation })
                 └── const conversation = initialConversation; // Uses prop directly
   ```

2. **The Priority Toggle Hook:**
   ```tsx
   export function useSetInstagramPriority() {
     return useMutation({
       mutationFn: async ({ conversationId, isPriority, notes }) => {
         await instagramService.setPriority(conversationId, isPriority, ...);
       },
       onSuccess: (_, variables) => {
         queryClient.invalidateQueries({
           queryKey: instagramKeys.conversation(variables.conversationId),
         });
         queryClient.invalidateQueries({
           queryKey: instagramKeys.all, // Too broad, doesn't force refetch
         });
       },
     });
   }
   ```

3. **The Problem:**
   - After priority toggle succeeds, it invalidates:
     - `["instagram", "conversation", conversationId]` - for single conversation query
     - `["instagram"]` - matches everything but doesn't REFETCH, just marks stale

   - The sidebar uses: `["instagram", "conversations", integrationId, filters]`
   - The conversation view uses the **passed prop**, not a query

   - **Key insight:** `InstagramConversationView` receives `conversation` as a prop from the parent. It does NOT subscribe to any conversation query. So even if the query is invalidated, the component won't re-render because props don't change.

4. **Why Reload Works:**
   - On reload, the sidebar fetches fresh data from DB
   - The fresh data has the updated `is_priority` value
   - This gets passed as a new prop to the conversation view

5. **Missing Elements:**
   - No optimistic update to immediately show the change
   - No invalidation of the conversations LIST query (sidebar's data source)
   - The conversation view relies on prop, not its own query

---

## Fix Strategy

### Fix 1: Infinite Spinning Refresh Button

**Option A (Recommended): Add timeout and proper error handling**

Add a timeout to the sync mutation and ensure `isPending` properly resolves:

```tsx
// In InstagramSidebar.tsx
useEffect(() => {
  if (integration.id && hasSyncedRef.current !== integration.id) {
    hasSyncedRef.current = integration.id;

    // Create an AbortController or timeout wrapper
    const timeoutId = setTimeout(() => {
      // If still pending after 30s, reset mutation state
      if (syncConversations.isPending) {
        syncConversations.reset();
      }
    }, 30000);

    syncConversations.mutate(
      { integrationId: integration.id },
      {
        onSettled: () => {
          clearTimeout(timeoutId);
        },
        onError: (error) => {
          console.warn("[InstagramSidebar] Sync failed:", error);
          toast.error("Failed to sync conversations");
        },
      },
    );
  }
}, [integration.id]);
```

**Option B: Use TanStack Query's mutation timeout (cleaner)**

Configure mutation options with a timeout at the hook level.

### Fix 2: Priority Star Not Updating

**Option A (Recommended): Optimistic Update + Proper Invalidation**

1. **Add optimistic update in `useSetInstagramPriority`:**
   ```tsx
   useMutation({
     mutationFn: async ({ conversationId, isPriority }) => {
       await instagramService.setPriority(...);
       return { conversationId, isPriority }; // Return for optimistic rollback
     },
     onMutate: async ({ conversationId, isPriority }) => {
       // Cancel outgoing refetches
       await queryClient.cancelQueries({
         predicate: (query) =>
           query.queryKey[0] === "instagram" &&
           query.queryKey[1] === "conversations"
       });

       // Snapshot previous value
       const previousConversations = queryClient.getQueriesData({
         predicate: (query) =>
           query.queryKey[0] === "instagram" &&
           query.queryKey[1] === "conversations"
       });

       // Optimistically update ALL conversations queries
       queryClient.setQueriesData(
         { predicate: (query) =>
           query.queryKey[0] === "instagram" &&
           query.queryKey[1] === "conversations"
         },
         (old) => old?.map(conv =>
           conv.id === conversationId
             ? { ...conv, is_priority: isPriority, priority_set_at: new Date().toISOString() }
             : conv
         )
       );

       return { previousConversations };
     },
     onError: (err, variables, context) => {
       // Rollback on error
       context?.previousConversations?.forEach(([queryKey, data]) => {
         queryClient.setQueryData(queryKey, data);
       });
     },
     onSettled: () => {
       // Refetch to ensure server state
       queryClient.invalidateQueries({
         predicate: (query) =>
           query.queryKey[0] === "instagram" &&
           query.queryKey[1] === "conversations"
       });
     },
   });
   ```

2. **Problem with prop passing:**
   Even with optimistic updates to the query cache, the `InstagramConversationView` uses the prop directly. The parent (`InstagramTabContent`) needs to either:
   - Re-render when conversations query updates (it should if using the hook)
   - Pass the conversation from the query result, not a stale selected state

**Confirmed in MessagesPage.tsx (lines 62-63, 298, 397-404):**

```tsx
// Line 62-63: State stores FULL conversation object
const [selectedInstagramConversation, setSelectedInstagramConversation] =
  useState<InstagramConversation | null>(null);

// Line 298: Sidebar sets full object to state when clicked
onConversationSelect={setSelectedInstagramConversation}

// Line 397-404: Full object passed as prop to tab content
<InstagramTabContent selectedConversation={selectedInstagramConversation} .../>
```

**Root Cause Confirmed:**
- When user clicks a conversation in sidebar, the FULL `InstagramConversation` object is stored in React state
- This object snapshot has `is_priority` value from when it was fetched
- Priority toggle mutation succeeds and invalidates queries
- BUT the `selectedInstagramConversation` STATE is NOT updated - it's a stale snapshot
- The conversation view receives stale prop → star doesn't update visually

**Fix Approach:**
- Store only the conversation ID in state, not the full object
- Derive the full conversation from the conversations query by ID
- This way, when query cache updates, the derived object updates automatically

---

## Implementation Steps

### Step 1: Fix Infinite Spin Bug (InstagramSidebar.tsx)
- [ ] Add timeout mechanism to reset mutation if Edge Function hangs
- [ ] Add `onSettled` callback to ensure proper cleanup
- [ ] Reset `hasSyncedRef` on error to allow retry on next render

```tsx
// In InstagramSidebar.tsx useEffect
useEffect(() => {
  if (integration.id && hasSyncedRef.current !== integration.id) {
    hasSyncedRef.current = integration.id;

    // Set timeout to reset mutation if hanging
    const timeoutId = setTimeout(() => {
      if (syncConversations.isPending) {
        syncConversations.reset();
        console.warn("[InstagramSidebar] Sync timed out, resetting state");
      }
    }, 30000); // 30 second timeout

    syncConversations.mutate(
      { integrationId: integration.id },
      {
        onSettled: () => {
          clearTimeout(timeoutId);
        },
        onError: (error) => {
          console.warn("[InstagramSidebar] Sync failed:", error);
          toast.error("Failed to sync conversations");
          // Allow retry on next mount/integration change
          hasSyncedRef.current = null;
        },
      },
    );

    return () => clearTimeout(timeoutId);
  }
}, [integration.id, syncConversations]);
```

### Step 2: Fix Priority Star Bug - Part A (MessagesPage.tsx)
- [ ] Change state to store conversation ID only (not full object)
- [ ] Derive full conversation from conversations query cache/data
- [ ] Update sidebar callback to pass ID
- [ ] Update child components to work with this pattern

```tsx
// In MessagesPage.tsx
// BEFORE:
const [selectedInstagramConversation, setSelectedInstagramConversation] =
  useState<InstagramConversation | null>(null);

// AFTER:
const [selectedInstagramConversationId, setSelectedInstagramConversationId] =
  useState<string | null>(null);

// Use useInstagramConversations to get conversations
const { data: conversations = [] } = useInstagramConversations(
  instagramIntegration?.id,
  {}
);

// Derive selected conversation from query data
const selectedInstagramConversation = selectedInstagramConversationId
  ? conversations.find(c => c.id === selectedInstagramConversationId) ?? null
  : null;

// Update sidebar callback
onConversationSelect={(conversation) => setSelectedInstagramConversationId(conversation.id)}
```

### Step 3: Fix Priority Star Bug - Part B (useSetInstagramPriority hook)
- [ ] Add optimistic update to immediately update cache
- [ ] Ensure proper rollback on error
- [ ] Add broader invalidation that covers conversations list

```tsx
// In useInstagramIntegration.ts useSetInstagramPriority
export function useSetInstagramPriority() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      isPriority,
      notes,
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      await instagramService.setPriority(conversationId, isPriority, user.id, notes);
    },
    onMutate: async ({ conversationId, isPriority }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          query.queryKey[1] === "conversations"
      });

      // Snapshot all conversations queries
      const snapshots: [unknown[], InstagramConversation[] | undefined][] = [];
      queryClient.getQueriesData<InstagramConversation[]>({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          query.queryKey[1] === "conversations"
      }).forEach(([queryKey, data]) => {
        snapshots.push([queryKey, data]);
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData<InstagramConversation[]>(
        { predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          query.queryKey[1] === "conversations"
        },
        (old) => old?.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                is_priority: isPriority,
                priority_set_at: isPriority ? new Date().toISOString() : null
              }
            : conv
        )
      );

      return { snapshots };
    },
    onError: (err, variables, context) => {
      // Rollback all snapshots
      context?.snapshots?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          (query.queryKey[1] === "conversations" || query.queryKey[1] === "conversation")
      });
    },
  });
}
```

### Step 4: Testing
- [ ] Test refresh button stops spinning after sync completes
- [ ] Test refresh button stops spinning after sync times out (30s)
- [ ] Test refresh button stops spinning after sync fails
- [ ] Test priority star fills immediately on click
- [ ] Test priority star unfills immediately on second click
- [ ] Test priority toggles correctly in sidebar list view
- [ ] Test error rollback - star reverts if API fails
- [ ] Verify no regressions in message viewing/sending

---

## Files to Modify

1. `src/features/messages/MessagesPage.tsx`
   - Change `selectedInstagramConversation` to `selectedInstagramConversationId` (string)
   - Add `useInstagramConversations` hook call
   - Derive full conversation from query data
   - Update callback and prop passing

2. `src/features/messages/components/instagram/InstagramSidebar.tsx`
   - Add timeout mechanism for sync mutation
   - Add cleanup in useEffect return
   - Reset ref on error for retry capability

3. `src/hooks/instagram/useInstagramIntegration.ts`
   - Add optimistic update to `useSetInstagramPriority`
   - Add proper rollback logic
   - Update invalidation to cover conversations list

## Priority

- **Bug 1 (Infinite Spin):** High - Blocks initial UX, makes app appear broken
- **Bug 2 (Star Update):** Medium - Functional but UX inconvenience

## Risk Assessment

- **Low Risk:** Adding timeout mechanism is additive, won't break existing functionality
- **Medium Risk:** Changing MessagesPage state pattern requires careful prop threading
- **Low Risk:** Optimistic updates are a standard TanStack Query pattern

## Rollback Plan

If issues arise after implementation:
1. Revert to storing full conversation object in state
2. Add manual `setSelectedInstagramConversation` update after priority mutation success
3. Remove optimistic updates, keep simple invalidation
