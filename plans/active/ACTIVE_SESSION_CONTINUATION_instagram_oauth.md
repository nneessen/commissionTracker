# ACTIVE SESSION CONTINUATION - Instagram OAuth Fix for All Users

**Created:** 2026-01-07
**Priority:** P0 - Blocking feature for all users except nickneessen

---

## THE PROBLEM

Instagram integration is broken for users OTHER than nickneessen:

1. **OAuth fails** for kerryglass.ffl@gmail.com with error:
   ```
   "Unsupported request - method type: get"
   IGApiException code: 100
   ```

2. **Conversations sidebar showed wrong usernames** - all showed @nickneessen instead of actual participants (manually fixed for nickneessen only)

---

## WHAT WAS TRIED AND CURRENT STATE

### OAuth Callback (`supabase/functions/instagram-oauth-callback/index.ts`)

**Original working code:**
```typescript
const igProfileUrl = new URL(`https://graph.instagram.com/v21.0/me`);
igProfileUrl.searchParams.set("fields", "user_id,username,name,profile_picture_url,account_type");
const instagramBusinessAccountId = igProfile.user_id || instagramUserId;
```

**Current code after multiple fix attempts:**
```typescript
const igProfileUrl = new URL(`https://graph.instagram.com/v21.0/${instagramUserId}`);
igProfileUrl.searchParams.set("fields", "id,user_id,username,name,account_type");
const instagramBusinessAccountId = igProfile.user_id || igProfile.id || String(instagramUserId);
```

Changes made:
- Changed `/me` endpoint to `/{user_id}` (because /me didn't work for some accounts)
- Changed fields from `user_id` to `id` then back to `id,user_id`
- Added fallback logic for ID storage

### Conversations Fetch (`supabase/functions/instagram-get-conversations/index.ts`)

Added username matching to identify "self" vs "other" participants:
```typescript
const otherParticipant = conv.participants.data.find(
  (p) =>
    p.username?.toLowerCase() !== igUsername?.toLowerCase() &&
    String(p.id) !== String(igUserId),
);
```

### Database Fix (nickneessen only)
- Manually updated `instagram_user_id` from `25704725202515864` to `17841401907010491`
- Cleared corrupted conversation data

---

## ROOT CAUSE ANALYSIS

Instagram has **multiple different user ID formats**:

| ID Type | Example | Source |
|---------|---------|--------|
| Token user_id | `25704725202515864` | `api.instagram.com/oauth/access_token` response |
| Profile id | Different number | `graph.instagram.com/{user_id}?fields=id` |
| IGSID | `17841401907010491` | Conversations API participant IDs |

These are ALL DIFFERENT for the same user. The `instagram_user_id` we store must match what the conversations API returns, or participant matching fails.

---

## WHAT NEEDS TO BE FIXED

### 1. OAuth Must Work for ALL Users
kerryglass is still getting "Unsupported request - method type: get" error. Need to:
- Check edge function logs when they try to connect
- Verify the deployed code is actually the latest version
- Test if `/{user_id}` endpoint works for their account type

### 2. Stored ID Must Match Conversations API
When storing `instagram_user_id`, we need to store the ID format that matches what conversations API returns. Options:
- Use `user_id` field from profile (if available)
- Or just rely on username matching (more robust)

### 3. Fix Must Work for New Connections
Any new user connecting Instagram should:
- Complete OAuth successfully
- Have correct `instagram_user_id` stored
- See correct usernames in conversations sidebar

---

## KEY FILES

```
supabase/functions/instagram-oauth-callback/index.ts  # OAuth flow
supabase/functions/instagram-get-conversations/index.ts  # Conversation fetch
```

---

## TESTING CHECKLIST

- [ ] kerryglass.ffl@gmail.com can complete OAuth
- [ ] kerryglass's conversations show correct participant usernames
- [ ] nickneessen's conversations still work correctly
- [ ] New user can connect and see correct conversations

---

## DIAGNOSTIC STEPS

1. Have kerryglass try to connect Instagram again
2. Check Supabase edge function logs for `instagram-oauth-callback`
3. Look for the profile fetch step - what URL is being called? What response?
4. Compare with nickneessen's successful connection

---

## IMPORTANT CONTEXT

- nickneessen's account works because we manually fixed the DB
- The username matching code should handle ID mismatches
- But OAuth itself must complete for any of this to matter
- The error "method type: get" is misleading - it's usually about invalid fields/endpoint, not HTTP method

---

## NEXT STEPS

1. Deploy latest OAuth callback code (verify it's deployed)
2. Have kerryglass attempt connection
3. Check logs to see exactly where/why it fails
4. Fix the specific issue for their account type
5. Verify conversations work after successful OAuth
