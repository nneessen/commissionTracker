# Feature Gating Implementation Plan

## Status: IMPLEMENTED ✅

## Context

The Lemon Squeezy subscription integration is complete:
- ✅ Database tables: `subscription_plans`, `user_subscriptions`, `subscription_payments`, `subscription_events`
- ✅ Lemon Squeezy webhook edge function deployed at `lemon-webhook`
- ✅ Checkout URLs working with correct UUIDs
- ✅ Billing UI with plan selection cards
- ✅ Feature gating logic implemented
- ✅ Route-level subscription feature checks
- ✅ Sidebar shows locked/unlocked features with crown icon
- ✅ Discount code support added to checkout

**Solved**: Feature locking is now implemented. Users can only access features based on their subscription tier.

## Subscription Tiers & Features

From `subscription_plans.features` JSON:

### Free Tier
```json
{
  "dashboard": true,
  "policies": true,
  "settings": true,
  "comp_guide": true,
  "connect_upline": true,
  "expenses": false,
  "email": false,
  "sms": false,
  "hierarchy": false,
  "overrides": false,
  "recruiting": false,
  "reports_view": false,
  "reports_export": false,
  "targets_basic": false,
  "targets_full": false,
  "downline_reports": false
}
```

### Starter Tier ($10/mo)
- Everything in Free
- `expenses`: true
- `reports_view`: true
- `targets_basic`: true

### Pro Tier ($25/mo)
- Everything in Starter
- `email`: true (200/month limit)
- `sms`: true ✅ (added Dec 2025)
- `reports_export`: true
- `targets_full`: true
- **Team size limit**: 5 direct downlines (agents + recruits combined)
- Warning shown at 4/5 downlines, blocked at 5/5

### Team Tier ($50/mo)
- Everything in Pro
- `hierarchy`: true
- `overrides`: true
- `recruiting`: true
- `downline_reports`: true
- **Team size limit**: Unlimited

## What Needs to Be Built

### 1. Feature Access Hook
Create `useFeatureAccess` hook that:
- Gets user's current subscription/plan
- Checks if a specific feature is enabled
- Returns `{ hasAccess, isLoading, plan, upgradeRequired }`

### 2. Feature Gate Component
Create `<FeatureGate feature="recruiting">` wrapper that:
- Shows children if user has access
- Shows upgrade prompt if locked
- Handles loading state

### 3. Route Protection
Apply gates to these routes/features:
- `/recruiting` → requires `recruiting` feature
- `/hierarchy` → requires `hierarchy` feature
- `/messages` (email/SMS) → requires `email` or `sms` feature
- Export buttons → requires `reports_export` feature
- Expense tracking → requires `expenses` feature
- Full targets → requires `targets_full` feature

### 4. Sidebar Navigation
- Show/hide or disable menu items based on features
- Or show all items but gate the actual pages

### 5. Upgrade Prompts
- Create a reusable upgrade prompt component
- Show which plan is needed for the blocked feature
- Link to billing page

## Existing Code References

- `subscriptionService.hasFeature(userId, feature)` - Already exists at `src/services/subscription/subscriptionService.ts:171`
- `useSubscription()` hook - Returns current subscription with plan data
- Subscription plans with features JSON in database

## Database Quick Reference

```sql
-- Check user's current plan features
SELECT sp.name, sp.features
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'USER_ID';
```

## Session Notes

- User is currently grandfathered on Pro until June 2026
- Webhook may not be processing correctly (no events in subscription_events table after test checkout)
- Need to also verify webhook is updating user_subscriptions properly

---

### 6. Discount Code Support
- Add discount code input field to checkout flow
- Pass discount code to Lemon Squeezy checkout URL via `?discount=CODE` parameter
- Allow users to enter promo codes before redirecting to checkout

---

## Continuation Prompt

Continue implementing feature gating for The Standard HQ subscription system. The Lemon Squeezy payment integration is complete but there's no logic to actually LOCK features based on subscription tier.

Tasks:
1. Create a `useFeatureAccess` hook that checks the user's subscription plan features
2. Create a `<FeatureGate>` component wrapper for protected content
3. Apply feature gates to: recruiting, hierarchy, messages/email, expense tracking, report exports, full targets
4. Update sidebar navigation to reflect locked vs unlocked features
5. Create upgrade prompt component that shows when accessing locked features
6. Add discount code input to billing page that passes code to Lemon Squeezy checkout URL
7. Test the complete flow: Free user → tries recruiting → sees upgrade prompt → upgrades (with optional discount code) → has access

Reference the features JSON in subscription_plans table for what each tier can access.

Lemon Squeezy discount codes are passed via URL parameter: `?discount=CODE_HERE`

## Implementation Summary

### Files Created
- `src/hooks/subscription/useFeatureAccess.ts` - Hook for checking subscription feature access
- `src/hooks/subscription/useTeamSizeLimit.ts` - Hook for checking team size limits (Pro: 5 max)
- `src/components/subscription/FeatureGate.tsx` - Wrapper component for protected content
- `src/components/subscription/UpgradePrompt.tsx` - Upgrade prompt UI component
- `src/components/subscription/index.ts` - Exports
- `supabase/migrations/20251218_008_pro_tier_updates.sql` - Pro tier SMS + team size limits

### Files Modified
- `src/hooks/subscription/index.ts` - Added exports for new hooks (useFeatureAccess, useTeamSizeLimit)
- `src/components/auth/RouteGuard.tsx` - Added `subscriptionFeature` prop for route-level gating, fixed admin bypass for multiple admin emails
- `src/router.tsx` - Added subscription feature checks to protected routes
- `src/components/layout/Sidebar.tsx` - Added subscription-locked nav item rendering with crown icon
- `src/services/subscription/subscriptionService.ts` - Added discount code parameter to checkout URL
- `src/features/settings/billing/BillingTab.tsx` - Added discount code input field
- `src/features/hierarchy/components/SendInvitationModal.tsx` - Added team size limit enforcement (warning at 4, blocked at 5)

### Feature-to-Route Mapping
| Route | Subscription Feature |
|-------|---------------------|
| `/targets` | `targets_basic` |
| `/reports` | `reports_view` |
| `/expenses` | `expenses` |
| `/hierarchy/*` | `hierarchy` |
| `/hierarchy/overrides` | `overrides` |
| `/hierarchy/downlines` | `downline_reports` |
| `/recruiting` | `recruiting` |
| `/messages` | `email` |

## Known Issues to Fix First

1. **Webhook not processing**: After a successful test checkout, no events were recorded in `subscription_events` table. Check Lemon Squeezy webhook deliveries for errors. The webhook signing secret is `N123j234n345!$!$` - verify it matches what's set in Supabase secrets.

2. **Redirect not working**: The `checkout[redirect_url]` parameter isn't redirecting users back to the app after checkout. May be a Lemon Squeezy test mode limitation.

## Lemon Squeezy Checkout UUIDs (Already Configured)

| Plan | Monthly UUID | Annual UUID |
|------|--------------|-------------|
| Starter | `92229c01-a048-49a2-ab6e-cbe4b2788bb9` | `4426b858-2e6a-4092-91ff-708c26456233` |
| Pro | `7dd982d4-4aef-41f5-af18-30caf59e3c3b` | `bf46ee19-3b14-4bc8-a402-2d9634fb69eb` |
| Team | `1025fb86-15de-4004-9bbd-cf332d944fee` | `ea2896e9-e953-4d11-bf15-4bb1ee15ecc6` |

Webhook URL: `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/lemon-webhook`
