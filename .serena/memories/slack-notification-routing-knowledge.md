# Slack Policy Notification Routing Knowledge

## Quick Reference

### When policy is created, routing depends on:
1. **Agent's IMO** - Required, or notification fails (400 error)
2. **Agent's Agency** - Determines hierarchy traversal
3. **Slack integration's agency_id** - Determines which workspaces receive notifications

### Hierarchy Depth Rules
- `depth = 0` → Direct agency match → **WITH leaderboard**
- `depth > 0` → Parent agency → **NO leaderboard**  
- `depth = 999` → IMO-level fallback → **NO leaderboard**

### Key Database Relationships
```
slack_integrations.agency_id → agencies.id
agencies.parent_agency_id → agencies.id (self-referential)
```

### Current Configuration (as of 2026-01-02)
- "💎 SELF MADE 💎" workspace → Self Made Financial agency (root)
- "The Standard" workspace → The Standard agency (child of Self Made)

### Edge Cases to Remember
1. **Agent with no agency** → Falls back to IMO-level integrations (agency_id = NULL)
2. **Agent in agency without Slack workspace** → Gets parent workspace at depth>0, no leaderboard
3. **Agent with no IMO** → 400 error, notification fails

### Files Involved
- `supabase/functions/slack-policy-notification/index.ts` - Main edge function
- `supabase/migrations/20251226_002_agency_slack_integration.sql` - Defines `get_agency_hierarchy` and `get_slack_integrations_for_agency_hierarchy` RPC functions

### Full documentation
See: `docs/slack-notification-routing.md`
