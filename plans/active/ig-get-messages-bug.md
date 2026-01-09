# Instagram Token Expiration Bug - Fix Plan

## Issue Summary
**Error:** `instagram-get-messages` returns 400 Bad Request
**Root Cause:** Instagram access token expired on Jan 8, 2026 at 21:00 PST
**Current Time:** Jan 9, 2026 at 04:36 PST (~7.5 hours past expiration)

## Error Details
```
OAuth error code 190: "Error validating access token: Session has expired on Thursday, 08-Jan-26 21:00:00 PST"
```

## Current System Behavior
1. Token refresh CRON (`instagram-refresh-token`) runs daily
2. Refreshes tokens expiring within 7 days
3. When OAuth code 190 occurs, integration is marked as `expired`
4. User must manually reconnect via full OAuth flow

## Problem Analysis
The refresh CRON either:
- Didn't run before the token expired, OR
- Ran but the token was already past the refresh window (Instagram doesn't allow refreshing already-expired tokens)

**Critical Gap:** No on-demand refresh attempt when code 190 is detected before marking as expired.

---

## Recommended Fix: Two-Phase Approach

### Phase 1: Immediate Fix (User Action Required)
**Goal:** Get the user reconnected now

**Action:** User must reconnect Instagram via Settings → Integrations → Instagram → Reconnect

**Why manual reconnect is required:**
- Instagram tokens cannot be refreshed once expired (Meta API limitation)
- A new OAuth flow is the only way to get a fresh token

### Phase 2: Prevent Future Occurrences (Code Changes)

#### 2A. Reduce Refresh Window from 7 Days to 14 Days
**File:** `supabase/functions/instagram-refresh-token/index.ts`
**Line ~72**

```typescript
// BEFORE
.lte('token_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

// AFTER
.lte('token_expires_at', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
```

**Rationale:** Start refreshing tokens 14 days before expiry instead of 7 days. This provides more buffer time.

#### 2B. Add On-Demand Refresh Attempt Before Marking as Expired
**Files:**
- `supabase/functions/instagram-get-conversations/index.ts`
- `supabase/functions/instagram-get-messages/index.ts`
- `supabase/functions/instagram-send-message/index.ts`

**Logic:**
When OAuth code 190 is detected:
1. Check if token_expires_at was within the last 24 hours (recently expired)
2. If yes, attempt one refresh before marking as expired
3. If refresh succeeds, retry the original API call
4. If refresh fails, then mark as expired

#### 2C. Add Token Expiry Warning in UI
**File:** `src/features/messages/components/instagram/InstagramTabContent.tsx`

**Logic:**
- Check if `token_expires_at` is within 7 days
- Show amber warning banner: "Your Instagram token expires in X days. Consider reconnecting to avoid disruption."

#### 2D. Add Proactive Token Expiry Check on App Load
**File:** `src/hooks/integrations/useInstagramIntegration.ts`

**Logic:**
- On integration load, check if token expires within 3 days
- If yes, call refresh endpoint proactively
- Toast notification if token is expiring soon and refresh fails

---

## Implementation Order

1. **Phase 1:** User reconnects manually (no code changes)
2. **Phase 2A:** Increase refresh window (simple config change)
3. **Phase 2C:** Add UI warning banner (improves UX)
4. **Phase 2B:** On-demand refresh attempt (more complex, requires testing)
5. **Phase 2D:** Proactive refresh on load (additional safety net)

---

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `supabase/functions/instagram-refresh-token/index.ts` | Config change | High |
| `supabase/functions/instagram-get-conversations/index.ts` | Add retry logic | Medium |
| `supabase/functions/instagram-get-messages/index.ts` | Add retry logic | Medium |
| `supabase/functions/instagram-send-message/index.ts` | Add retry logic | Medium |
| `src/features/messages/components/instagram/InstagramTabContent.tsx` | Add warning | Medium |
| `src/hooks/integrations/useInstagramIntegration.ts` | Proactive check | Low |

---

## Questions for User

1. **Immediate action:** Do you want to reconnect Instagram now via the app's settings?

2. **Scope of fix:** Which phases do you want implemented?
   - Phase 1 only (manual reconnect)
   - Phase 1 + 2A (manual reconnect + increase refresh window)
   - Full implementation (all phases)

3. **CRON schedule:** Is the `instagram-refresh-token` CRON currently enabled? What's the schedule?
