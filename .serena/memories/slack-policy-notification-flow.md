# Slack Policy Notification System - Quick Reference

## A-Z Flow Summary

1. Agent submits policy via PolicyForm
2. policyService.create() → creates policy + commission + emits POLICY_CREATED event
3. slack-policy-notification edge function checks if first sale of day
4. **First sale**: Creates pending log, shows naming dialog, then posts policy + leaderboard
5. **Subsequent sales**: Posts policy immediately, deletes old leaderboard, posts fresh one

## Agency Hierarchy Posting

| Agent Location | Their Agency | Parent Agency | Grandparent | IMO |
|----------------|--------------|---------------|-------------|-----|
| Policy + Leaderboard | ✓ (depth=0) | Policy only | Policy only | Policy only |

**Key**: Only depth=0 gets leaderboard. ALL levels get policy notifications.

## Username Display

- **Policy messages**: Agent's Slack username + avatar (looked up by email per-workspace)
- **Leaderboard**: @mention if slack_member_id stored, else plain name

## First Seller Dialog

- Triggered for first policy of day per (channel, date)
- Agent names leaderboard for their agency (depth=0) only
- Multi-channel support if agent is first in multiple workspaces

## NOT Implemented

- Manual Slack post detection (no Slack → App flow)
- Missing sales reconciliation
- Detecting discrepancies between Slack and database

## Key Files

- Edge function: `supabase/functions/slack-policy-notification/index.ts`
- First seller dialog: `src/features/policies/components/FirstSellerNamingDialog.tsx`
- Policy service: `src/services/policies/policyService.ts`
- Key RPCs: `get_slack_integrations_for_agency_hierarchy`, `get_daily_production_by_agent`, `check_first_seller_naming`
