# ACTIVE SESSION CONTINUATION - Instagram OAuth Fix

**Created:** 2026-01-07
**Updated:** 2026-01-07
**Status:** ✅ FIXES DEPLOYED - READY FOR TESTING

---

## FIXES APPLIED (Jan 7, 2026)

### 1. OAuth Callback - Profile Fetch (P0 FIX)
**File:** `supabase/functions/instagram-oauth-callback/index.ts`

**Problem:** Requesting `user_id` field from Instagram API caused "Unsupported request - method type: get" error for some account types.

**Fix:**
- Changed from `/{user_id}` endpoint to `/me` endpoint
- Removed `user_id` from requested fields
- Now only requests: `id,username,name,account_type`
- Stores `igProfile.id` directly (the IGSID format that matches webhooks)

### 2. OAuth Callback - ID Storage (P0 FIX)
**File:** `supabase/functions/instagram-oauth-callback/index.ts`

**Problem:** Stored ID format didn't match webhook `entry.id` format.

**Fix:**
- Now stores ONLY `igProfile.id` from `/me` response
- Added validation to fail if `id` is missing
- Removed fallback logic that could store wrong ID format

### 3. Webhook Scheduled Messages - API Endpoint (P1 FIX)
**File:** `supabase/functions/instagram-webhook/index.ts`

**Problem:** Used `graph.facebook.com/v18.0` while other functions use `graph.instagram.com/v21.0`.

**Fix:**
- Changed to `https://graph.instagram.com/v21.0/me/messages`
- Consistent with `instagram-send-message` function

### 4. Conversations - Participant Matching (P1 FIX)
**File:** `supabase/functions/instagram-get-conversations/index.ts`

**Problem:** Username matching had null safety issues and used incorrect AND logic.

**Fix:**
- Now uses OR logic: participant is "us" if username matches OR ID matches
- Added proper null handling for usernames
- Same logic applied to inbound message detection

---

## DEPLOYED FUNCTIONS

All three functions deployed successfully:
- ✅ `instagram-oauth-callback`
- ✅ `instagram-get-conversations`
- ✅ `instagram-webhook`

---

## TESTING CHECKLIST

### kerryglass OAuth Test
- [ ] kerryglass.ffl@gmail.com attempts to connect Instagram
- [ ] OAuth completes without "Unsupported request" error
- [ ] Integration record created with correct `instagram_user_id` (IGSID format)
- [ ] Conversations load with correct participant names

### nickneessen Regression Test
- [ ] nickneessen's existing integration still works
- [ ] Conversations display correctly
- [ ] Can send messages
- [ ] Webhooks still route correctly

### New User Test
- [ ] New user can complete OAuth
- [ ] Correct ID stored in database
- [ ] Conversations show correct participant info

---

## HOW TO VERIFY

1. **Check Supabase logs** during OAuth attempt:
   ```
   Look for: "[instagram-oauth-callback] Fetching Instagram profile via /me endpoint"
   Look for: "[instagram-oauth-callback] Storing instagram_user_id: XXXX (from /me endpoint id field)"
   ```

2. **Check database** after OAuth:
   ```sql
   SELECT instagram_user_id, instagram_username, connection_status
   FROM instagram_integrations
   WHERE user_id = '<user-uuid>';
   ```
   The `instagram_user_id` should be in IGSID format (e.g., `17841401907010491`)

3. **Test webhook matching**:
   - Have someone DM the connected Instagram account
   - Check logs for: `"[instagram-webhook] Processing inbound message from XXX"`
   - Verify message appears in conversations

---

## IF STILL FAILING

If kerryglass still can't connect:

1. Check edge function logs for exact error message
2. Verify the deployed function has the latest code:
   ```bash
   npx supabase functions deploy instagram-oauth-callback --no-verify-jwt
   ```
3. The `/me` endpoint should work for ALL Instagram Business accounts - if it doesn't, there may be a permissions issue with the Meta app configuration

---

## RELATED FILES

- `supabase/functions/instagram-oauth-callback/index.ts` - OAuth flow
- `supabase/functions/instagram-get-conversations/index.ts` - Conversation sync
- `supabase/functions/instagram-webhook/index.ts` - Inbound message handling
- `.serena/memories/instagram-app-credentials.md` - Configuration docs
