# Slack Scoreboard Continuation Prompt

## Current Status
Fixes were deployed but testing revealed two remaining issues.

## Issues to Fix

### Issue 1: Leaderboard Should Always Be Freshest Message
**Current behavior**: Uses `chat.update` to update existing leaderboard in place
**Problem**: Leaderboard stays in its original position; new policies appear BELOW it
**Required behavior**: Leaderboard should ALWAYS appear AFTER each policy notification

**Fix needed in** `supabase/functions/slack-policy-notification/index.ts`:
- Instead of using `chat.update` for subsequent sales, POST a new leaderboard message each time
- Optionally delete the old leaderboard message first using `chat.delete`
- OR: Just post new message each time (old one becomes history)

### Issue 2: First-Seller Naming Prompt Not Appearing
**Cause**: `daily_sales_logs` entries exist from previous testing
**The detection logic checks if first_seller has production, but if entries exist with stale first_seller_id that happens to have production today, it won't reset**

**Before testing**:
```sql
DELETE FROM daily_sales_logs WHERE log_date = CURRENT_DATE;
```

**Fix needed**: The first-seller detection may need refinement - currently checks if `first_seller_id` has production, but should also verify the leaderboard_message_ts points to a valid message.

## Files to Modify
1. `supabase/functions/slack-policy-notification/index.ts`
   - Change leaderboard update logic to always POST new message (not update)
   - Optionally delete old message using `chat.delete` API before posting new
   - Lines 693-789 need refactoring

## Key Change Required
Replace this pattern:
```typescript
// OLD: Update existing message (keeps it in old position)
await fetch("https://slack.com/api/chat.update", {...});
```

With this pattern:
```typescript
// NEW: Delete old message, post fresh one
if (existingLog.leaderboard_message_ts) {
  await fetch("https://slack.com/api/chat.delete", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelId, ts: existingLog.leaderboard_message_ts }),
  });
}
// Then post new leaderboard message
const newLeaderboard = await postSlackMessage(botToken, channelId, leaderboardText);
// Update log with new message_ts
```

## Testing Steps
1. Clear today's logs: `DELETE FROM daily_sales_logs WHERE log_date = CURRENT_DATE;`
2. Delete all test policies
3. Add first policy → should see:
   - Policy message
   - Leaderboard message (immediately after)
   - "Congrats! Name your leaderboard" message with link
4. Add second policy → should see:
   - Policy message
   - NEW leaderboard message (after policy, old one deleted or left as history)

## DB Cleanup Command
```sql
DELETE FROM daily_sales_logs WHERE log_date = CURRENT_DATE;
```
