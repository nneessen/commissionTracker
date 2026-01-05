# RESOLVED: Instagram Conversation Loading Bug

**Created:** 2026-01-05
**Resolved:** 2026-01-05
**Status:** FIXED

---

## Root Cause

The `instagram-get-messages` Edge Function was using an incorrect `onConflict` constraint:

```typescript
// BEFORE (broken)
onConflict: "conversation_id,instagram_message_id"

// AFTER (fixed)
onConflict: "instagram_message_id"
```

The database schema only has a unique constraint on `instagram_message_id` alone (not a composite constraint on both columns). This caused every upsert operation to fail silently because PostgreSQL couldn't find the referenced constraint.

---

## Fix Applied

**File:** `supabase/functions/instagram-get-messages/index.ts`

Changed line 352 from composite constraint to single column constraint to match the database schema.

**Deployed:** Edge Function deployed to production via `npx supabase functions deploy instagram-get-messages`

---

## Verification

To verify the fix:
1. Refresh the browser on the Messages page
2. Click on any Instagram conversation
3. The sync should now work and populate messages in the database
4. Messages should appear in the conversation view

---

## Database Evidence

Before fix:
- `instagram_conversations` table: 5 rows (with `last_message_preview` populated from conversation sync)
- `instagram_messages` table: 0 rows (message sync was failing silently)

After fix: Messages should now sync from Instagram API to local database.
