# Slack Leaderboard Naming - Continuation Prompt

## Context
We're implementing a feature where the first seller of the day for an agency gets to name the daily leaderboard. The dialog should appear IN THE APP before the Slack message is sent.

## Current State
- Edge function `slack-policy-notification` posts policies and leaderboards to Slack
- RPC functions created: `check_first_seller_naming`, `set_leaderboard_title`
- Frontend dialog created: `FirstSellerNamingDialog.tsx` in `src/features/policies/components/`
- Dialog integrated into `PolicyDashboard.tsx`

## Issues to Fix

### 1. Dialog Timing (CRITICAL)
**Problem**: Dialog appears AFTER Slack message is already sent.
**Required**: Dialog must appear FIRST. Slack message should only be sent after user names (or skips) the leaderboard.

**Solution approach**:
- The current architecture has the DB trigger calling the edge function immediately on policy insert
- Need to change this so the edge function waits for the title, OR
- Have the frontend call an endpoint to trigger the Slack notification after naming is complete
- Consider: Make the edge function check if user is first seller, and if so, delay posting until title is set (with timeout fallback)

### 2. Old Title Still Showing
**Problem**: "Fantastic Friday Sales" showing instead of new title
**Check**: Run `DELETE FROM daily_sales_logs WHERE log_date = CURRENT_DATE;` before testing

### 3. Emoji Codes Not Rendering
**Problem**: `:first_place_medal:` shows as text instead of emoji in leaderboard
**Location**: `buildLeaderboardText()` function in edge function
**Fix**: Use actual Unicode emojis instead of Slack emoji codes, OR ensure Slack renders the codes properly

Current code uses:
```typescript
const medals = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:"];
```

### 4. HTML Entities in App
**Problem**: `&amp;` showing instead of `&` in the app notification display
**Location**: Likely in how the carrier name is being escaped/displayed in the frontend
**File**: Check `SlackChannelView.tsx` or wherever notifications are displayed in-app

### 5. Emoji Picker for Title
**Problem**: Users should be able to add/remove emojis in the leaderboard title
**Solution**: Add emoji picker component to `FirstSellerNamingDialog.tsx`
**Libraries**: Consider using `emoji-mart` or similar

## Architecture Change Needed

The fundamental issue is the timing. Current flow:
1. User creates policy → DB insert
2. DB trigger fires → Edge function called immediately
3. Edge function posts to Slack
4. Frontend checks if first seller → Shows dialog (TOO LATE)

Required flow:
1. User creates policy → DB insert
2. DB trigger fires → Edge function called
3. Edge function detects first seller → Does NOT post yet, creates pending log
4. Frontend shows naming dialog to first seller
5. User names (or skips) → Frontend calls endpoint
6. Slack messages are posted with the title

**Alternative simpler approach**:
1. DB trigger does NOT call edge function for first sale
2. Frontend detects first sale, shows dialog
3. After naming, frontend calls edge function to post
4. For subsequent sales, trigger works normally

## Files to Modify

1. `supabase/functions/slack-policy-notification/index.ts` - Change posting logic
2. `src/features/policies/components/FirstSellerNamingDialog.tsx` - Add emoji picker
3. `src/features/policies/PolicyDashboard.tsx` - Fix timing of dialog
4. `supabase/migrations/20251226_012_first_seller_naming_rpc.sql` - May need updates
5. Possibly create new endpoint to trigger Slack posting after naming

## Test Commands

```sql
-- Clear today's logs
DELETE FROM daily_sales_logs WHERE log_date = CURRENT_DATE;

-- Check logs
SELECT * FROM daily_sales_logs WHERE log_date = CURRENT_DATE;

-- Test RPC
SELECT * FROM check_first_seller_naming('USER-ID-HERE');
```

## Key Decisions Needed

1. Should the edge function wait for title (with timeout), or should frontend control when to post?
2. How long to wait before auto-posting with default title if user doesn't respond?
3. What emoji picker library to use?

## Priority Order

1. Fix dialog timing (show before Slack posts)
2. Fix emoji rendering
3. Add emoji picker
4. Fix HTML entities issue
