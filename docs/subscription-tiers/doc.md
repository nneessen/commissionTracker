# Subscription Tiers Documentation

## Overview

The application uses a 4-tier subscription system: **Free**, **Starter**, **Pro**, and **Team**. Each tier provides progressive access to features, with usage-based pricing for email and SMS. The system includes grandfathering for existing users and temporary free access until February 1, 2026.

**Launch Date**: February 1, 2026
**Payment Integration**: LemonSqueezy
**Usage Tracking**: Email and SMS with overage billing

---

## Tier Comparison

| Tier | Monthly | Annual | Email Limit | SMS | Target Use Case |
|------|---------|--------|-------------|-----|-----------------|
| **Free** | $0 | $0 | 0 | ❌ | New users exploring basic features |
| **Starter** | $10 | $100 | 0 | ❌ | Individual producers tracking financials |
| **Pro** | $25 | $250 | 200/mo | ❌ | Producers who communicate with clients |
| **Team** | $50 | $500 | 500/mo | ✅ | Agency builders managing downlines |

**Annual Savings**: Starter saves $20, Pro saves $50, Team saves $100

---

## Feature Matrix

### Core Features (All Tiers)
- Dashboard
- Policy Management
- Compensation Guide
- Settings
- Connect to Upline

### Starter Tier Adds
- Expense Tracking
- Basic Targets & Goals
- Reports View (no export)
- 5 Additional Analytics Sections*

### Pro Tier Adds
- Full Targets & Goals (advanced)
- Reports Export
- Email Messaging (200/mo included)
- 4 More Analytics Sections*
- Advanced Dashboard Financial Details

### Team Tier Adds
- SMS Messaging ($0.05/message, usage-based)
- Team Hierarchy View
- Recruiting Pipeline
- Override Tracking
- Downline Reports
- Instagram Messaging
- Workflows & Automations

*Analytics Sections: pace_metrics, policy_status_breakdown, product_matrix, carriers_products, client_segmentation, geographic, game_plan, commission_pipeline, future_section

---

## Pricing & Billing

### Base Subscription Pricing
- **Free**: $0 (no payment required)
- **Starter**: $10/month or $100/year
- **Pro**: $25/month or $250/year
- **Team**: $50/month or $500/year

### Usage-Based Pricing
- **Email Overage** (Pro/Team only): $0.01 per email after included limit
- **SMS** (Team only): $0.05 per message (no included limit, pure usage-based)

### Billing Intervals
Users can choose monthly or annual billing. Annual billing provides 2-month discount (16-20% savings).

---

## Database Schema

### `subscription_plans`
Stores the 4 tier definitions with pricing, limits, and feature flags.

**Key Fields**:
- `name`: 'free', 'starter', 'pro', 'team'
- `price_monthly`, `price_annual`: in cents
- `email_limit`: monthly email allowance (0 for Free/Starter)
- `sms_enabled`: boolean (only true for Team)
- `features`: JSONB object with feature flags
- `analytics_sections`: array of enabled analytics section keys

### `user_subscriptions`
Tracks each user's active subscription.

**Key Fields**:
- `user_id`: references user_profiles
- `plan_id`: references subscription_plans
- `status`: 'active', 'cancelled', 'past_due', 'trialing', 'paused'
- `billing_interval`: 'monthly' or 'annual'
- `lemon_subscription_id`, `lemon_customer_id`: LemonSqueezy IDs
- `current_period_start`, `current_period_end`: billing period
- `grandfathered_until`: timestamp for free Pro access (existing users)

### `usage_tracking`
Tracks email and SMS usage per user per month.

**Key Fields**:
- `user_id`: references user_profiles
- `metric`: 'emails_sent' or 'sms_sent'
- `count`: current usage count for the period
- `period_start`, `period_end`: monthly period dates
- `overage_charged`: whether overage was billed
- `overage_amount`: overage charge in cents

### Helper Functions (Postgres)
- `get_user_subscription_tier(user_id)`: Returns tier name for a user
- `user_has_feature(user_id, feature)`: Checks feature access
- `user_has_analytics_section(user_id, section)`: Checks analytics access
- `increment_usage(user_id, metric, count)`: Tracks email/SMS usage

---

## Integration Points

### LemonSqueezy Payment Integration
- **Checkout Flow**: Generate checkout URL with variant IDs
- **Webhook Handler**: Process subscription events (created, updated, cancelled)
- **Customer Portal**: Link users to LemonSqueezy billing portal
- **Variant IDs**: Stored in subscription_plans (monthly/annual variants)

### Feature Access Control
- `useFeatureAccess(feature)`: Hook to check if user can access a feature
- `useAnyFeatureAccess(features[])`: Check if user has ANY of the features
- `useAllFeaturesAccess(features[])`: Check if user has ALL features
- `useAnalyticsSectionAccess(section)`: Check analytics section access

### Usage Tracking
- `subscriptionService.incrementUsage(userId, metric, count)`: Track email/SMS
- `subscriptionService.getUsageStatus(userId, metric)`: Get usage with limits
- Automatic monthly period calculation

### Access Bypass
- **Owner Downlines**: Direct downlines of owner get Team-tier features (except admin features)
- **Temporary Access**: All users get free access to most features until Feb 1, 2026 (see below)

---

## Special Access Periods

### 1. Grandfathering System
**Who**: Existing users before subscription system launch
**Benefit**: Free Pro-tier access for 6 months
**Duration**: Set via `grandfathered_until` timestamp
**Implementation**: Migration 20251218_005 automatically assigns Pro subscriptions to existing approved users

### 2. Temporary Free Access (Until Feb 1, 2026)
**Who**: All users
**Benefit**: Free access to all features EXCEPT Recruiting Pipeline
**Duration**: Automatically expires February 1, 2026
**Implementation**: `lib/temporaryAccess.ts` with date-based checks
**Documentation**: See `docs/billing/TEMPORARY_FREE_ACCESS.md`

**Granted Features**:
- Expenses, Targets (basic & full), Reports (view & export)
- Email messaging, SMS messaging
- Team hierarchy, Override tracking, Downline reports
- All analytics sections, Dashboard financial details

**Still Gated**:
- Recruiting Pipeline (requires Team subscription)

---

## Access Control Flow

When a user attempts to access a feature, the system checks in this order:

1. **Loading State**: Deny access until data loads
2. **Staff Bypass**: (Currently empty array, no staff bypass roles)
3. **Subscription Features**: Check if plan.features[feature] = true
4. **Owner Downline Access**: Direct downlines get Team features (except admin)
5. **Temporary Free Access**: Grant access if before Feb 1, 2026 and feature != 'recruiting'
6. **Result**: Grant or deny access

---

## Usage Limits & Overages

### Email Usage
- **Free/Starter**: No email messaging (feature disabled)
- **Pro**: 200 emails/month included
- **Team**: 500 emails/month included
- **Overage**: $0.01 per email beyond limit

### SMS Usage
- **Free/Starter/Pro**: SMS feature disabled
- **Team**: Pure usage-based at $0.05/message (no included amount)

### Tracking Implementation
- Usage is tracked in `usage_tracking` table with monthly periods
- Period: First day of month to last day of month
- Auto-creates usage records on first use each month
- `increment_usage()` function updates count atomically

### Usage Warnings
- Warning threshold: 80% of limit
- Limit threshold: 100% of limit
- UI shows usage status in billing settings

---

## Key Files Reference

### Migrations
- `supabase/migrations/archive/2025/20251218_005_subscription_tiering_system.sql` - Schema & seed data

### Services
- `src/services/subscription/subscriptionService.ts` - Main service layer
- `src/services/subscription/SubscriptionRepository.ts` - Database access layer

### Hooks
- `src/hooks/subscription/useSubscription.ts` - Get user subscription data
- `src/hooks/subscription/useFeatureAccess.ts` - Feature access checks
- `src/hooks/subscription/useAnalyticsSectionAccess.ts` - Analytics section access
- `src/hooks/subscription/useOwnerDownlineAccess.ts` - Owner downline feature grants

### Components
- `src/features/settings/billing/BillingTab.tsx` - Billing settings UI
- `src/components/subscription/SubscriptionAnnouncementDialog.tsx` - Tier announcement modal
- `src/components/layout/Sidebar.tsx` - Sidebar feature gating

### Types
- `src/types/database.types.ts` - Auto-generated from database schema
- `src/services/subscription/SubscriptionRepository.ts` - TypeScript interfaces

### Utilities
- `src/lib/temporaryAccess.ts` - Temporary free access logic (expires Feb 1, 2026)

---

## Known Discrepancies

### Missing Starter Tier in UI
The `SubscriptionAnnouncementDialog.tsx` component currently displays only 3 tiers (Free, Pro, Team) and omits **Starter**. This is a UI bug—the Starter tier exists in the database and is fully functional.

**Impact**: Users cannot see Starter tier in the announcement dialog
**Fix Required**: Add Starter tier card to the dialog between Free and Pro

---

## Implementation Notes

### Database Constraints
- User can only have ONE active subscription (unique constraint on user_id)
- RLS policies ensure users can only see/modify their own subscriptions
- Admins can manage all subscriptions

### Sync Mechanism
- Trigger `sync_subscription_tier_on_change` keeps `user_profiles.subscription_tier` in sync with `user_subscriptions.plan_id`
- Ensures consistent tier lookups even without JOIN queries

### Edge Cases Handled
- Null/missing subscription → defaults to 'free' tier
- Expired period → subscription remains but access denied
- Grandfathered users → period_end matches grandfathered_until
- Temporary access → bypasses subscription checks until Feb 1, 2026

---

## Development Checklist

When making changes to the subscription system:

1. **Schema Changes**: Update migration, regenerate database.types.ts
2. **Feature Flags**: Update seed data in migration file
3. **Pricing Changes**: Update both migration and LemonSqueezy variant IDs
4. **New Features**: Add to SubscriptionFeatures type and FEATURE_PLAN_REQUIREMENTS
5. **UI Updates**: Update BillingTab, SubscriptionAnnouncementDialog, and upgrade prompts
6. **Access Control**: Add checks in useFeatureAccess and component guards
7. **Testing**: Test with different tiers, grandfathered users, and temporary access periods

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Migration Reference**: 20251218_005_subscription_tiering_system.sql
