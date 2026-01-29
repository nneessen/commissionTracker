# Slack "On Fire" Celebration Messages

## Feature Overview
Add milestone celebration messages to Slack when agents hit policy count or AP thresholds during a single day. Messages should be channel-wide, visually striking, and appeal to Gen-Z aesthetics (not corporate/AI-sounding).

## Milestone Thresholds

### Policy Count Milestones
| Policies | Name | Vibe |
|----------|------|------|
| 2 | "Heating Up" | Starting to cook 🔥 |
| 3 | "Trifecta" | Hat trick energy 🎩 |
| 5 | "Certified Demon" | Absolute menace, unstoppable 😈 |

### AP (Annual Premium) Milestones
| AP Amount | Tier | Vibe |
|-----------|------|------|
| $2,500 | Bronze | Solid start 💪 |
| $5,000 | Silver | Getting serious 🚀 |
| $7,500 | Gold | Big money moves 💰 |
| $10,000 | Platinum | Elite status, legendary 👑 |

## Implementation Approach

### 1. Track Milestone State
- Add columns to `daily_sales_logs` or create new `agent_daily_milestones` table:
  - `last_policy_milestone_triggered` (int: 2, 3, 5)
  - `last_ap_milestone_triggered` (numeric: 2500, 5000, 7500, 10000)
- Prevents duplicate celebrations for same milestone

### 2. Celebration Logic in Edge Function
Location: `supabase/functions/slack-policy-notification/index.ts`

After updating leaderboard, check:
1. Agent's current policy count for the day
2. Agent's current total AP for the day
3. Compare against last triggered milestones
4. If new milestone hit → post celebration message

### 3. Message Design (Slack Block Kit)
- Use section blocks with large emoji headers
- Include agent name (with @mention if slack_member_id available)
- Show the achievement (policy count or AP amount)
- Add contextual flavor text that rotates/randomizes
- Use accent colors via attachment color bars

### 4. Example Message Formats

**Policy Count - Trifecta (3 policies):**
```
🎯 TRIFECTA 🎯
━━━━━━━━━━━━━━━━━━━━━━
@hunter_agent just locked in their 3rd policy today

three for three. no misses. 🎯
```

**AP Milestone - $10k:**
```
👑 $10K CLUB 👑
━━━━━━━━━━━━━━━━━━━━━━
@hunter_agent crossed $10,000 AP today

different breed. built different. 💎
```

### 5. Flavor Text Pool (Randomized)
Keep it fresh by rotating through multiple phrases:

**Heating Up (2 policies):**
- "starting to cook 🍳"
- "the warmup is over"
- "they're locked in now"

**Trifecta (3 policies):**
- "three for three. no misses."
- "hat trick secured 🎩"
- "rule of three: they write, they close, they repeat"

**Certified Demon (5 policies):**
- "absolutely unhinged performance"
- "someone check on the competition 💀"
- "main character energy activated"

**AP Milestones:**
- $2.5k: "bag secured 💼"
- $5k: "money printer go brrrr"
- $7.5k: "big dawg behavior"
- $10k: "generational wealth mindset 👑"

## Files to Modify

1. **`supabase/migrations/YYYYMMDDHHMMSS_agent_milestone_tracking.sql`**
   - Add milestone tracking columns or table
   - Create helper function to check/update milestones

2. **`supabase/functions/slack-policy-notification/index.ts`**
   - Add `checkAndPostMilestoneCelebration()` function
   - Call after leaderboard update in `processSlackNotification()`
   - Add Slack block builders for each milestone type

3. **`src/types/database.types.ts`**
   - Regenerate after migration

## Design Decisions
- **Always on** - No per-agency toggle needed
- **Combined celebration** - When agent hits BOTH policy + AP milestone on same sale, post single mega-celebration

## Mega-Celebration Format (Dual Milestone)
```
🔥👑 DOUBLE THREAT 👑🔥
━━━━━━━━━━━━━━━━━━━━━━
@hunter_agent just hit their 3rd policy AND crossed $7,500 AP

trifecta + big money? that's called inevitable. 💎
```

## Edge Cases
- Policy deletion/chargeback drops count below milestone → Don't "un-celebrate" (milestone stays triggered)
- Same agent hits same milestone across multiple channels → Only celebrate once per IMO/day
- Backdated policies → No celebration (same as leaderboard logic - only today's submit_date)

## Testing
1. Create test policy that triggers 2nd policy milestone
2. Verify celebration posts to correct channel
3. Verify milestone state updated (won't re-trigger)
4. Test AP milestones with appropriate premium amounts
5. Test dual milestone scenario (policy count + AP threshold same sale)
