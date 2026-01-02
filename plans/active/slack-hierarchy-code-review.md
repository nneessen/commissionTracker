# Code Review Request: Slack Policy Notification Hierarchy Fix

## Task
Perform a comprehensive production-grade code review on the changes made to fix Slack policy notification routing.

## Problem Statement
Policies from agents not assigned to any agency were incorrectly being posted to "The Standard" Slack workspace. The fix implements conditional leaderboard logic based on `hierarchy_depth`.

## Files Changed

### 1. New Migration
**File**: `supabase/migrations/20260102_005_fix_slack_hierarchy_leaderboard.sql`
- Adds `hierarchy_depth` column to `daily_sales_logs` table
- Includes manual data fix queries for production

### 2. Edge Function (Main Changes)
**File**: `supabase/functions/slack-policy-notification/index.ts`

Key changes:
- Line ~882-884: Added `shouldIncludeLeaderboard` flag based on `hierarchy_depth === 0`
- Lines ~949-973: New early-exit for parent/IMO integrations during first sale (posts policy immediately, skips naming dialog)
- Lines ~1027: Added `hierarchy_depth` to daily_sales_logs insert
- Lines ~1085-1161: Wrapped leaderboard posting in conditional check for `shouldIncludeLeaderboard`

### 3. Database Types
**File**: `src/types/database.types.ts`
- Added `hierarchy_depth: number | null` to `daily_sales_logs` Row, Insert, Update types

## Desired Behavior After Fix

| Agent Scenario | Slack Destination | Include Leaderboard |
|----------------|-------------------|---------------------|
| Agent with NO agency | Self Made Slack (IMO-level, depth=999) | NO |
| Agent in "The Standard" | The Standard Slack (depth=0) | YES |
| Agent in "The Standard" | Self Made Slack (parent, depth>0) | NO |
| Any agent | Parent agency Slack | NO |
| Any agent | IMO-level Slack | NO |

## Review Focus Areas

1. **Correctness**: Does the `hierarchy_depth` check correctly identify direct agency vs parent/IMO?
2. **Edge Cases**: What happens if `hierarchy_depth` is undefined/null? Is the fallback behavior correct?
3. **First Sale Logic**: Is the early-exit for parent/IMO integrations properly integrated?
4. **Data Consistency**: Is `hierarchy_depth` stored correctly in `daily_sales_logs`?
5. **Performance**: Any unnecessary operations being performed?
6. **Error Handling**: Are errors properly logged/handled?
7. **Migration Safety**: Is the migration safe to run on production?

## Code Review Checklist (from CLAUDE.md)

Apply the full code review checklist:
- [ ] SOLID principles followed
- [ ] Security validation pipeline implemented
- [ ] Error handling comprehensive with proper logging
- [ ] Performance considerations addressed
- [ ] Tests cover edge cases and error conditions
- [ ] Repository/Service patterns followed correctly
- [ ] No anti-patterns (singleton, mixed CRUD/business logic, etc.)

## Commands to Run

```bash
# Typecheck
npm run typecheck

# Read the changed files
cat supabase/migrations/20260102_005_fix_slack_hierarchy_leaderboard.sql
cat supabase/functions/slack-policy-notification/index.ts | head -1200 | tail -400
```

## Questions to Answer

1. Are there any race conditions in the first-sale handling for multi-workspace scenarios?
2. Should we also update `handleCompleteFirstSale` and `handleUpdateLeaderboard` functions to respect `hierarchy_depth`?
3. Is the IMO-level integration fallback (lines 652-684) still working correctly with the new logic?
4. Should the `include_leaderboard_with_policy` column on `slack_integrations` table interact with `shouldIncludeLeaderboard`?
