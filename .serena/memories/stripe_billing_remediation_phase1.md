# Stripe Billing Remediation Phase 1 (2026-02-21)

## Status: COMPLETE

## What was done

### Phase A — Security migrations (applied 2026-02-21)

**Migration 1:** `20260221190053_lock_down_stripe_rpc_execution.sql`
- REVOKE EXECUTE on `get_plan_by_stripe_price`, `process_stripe_subscription_event`, `record_stripe_payment` from PUBLIC/anon/authenticated
- GRANT EXECUTE to service_role only
- Re-created all 3 functions with `SET search_path = pg_catalog, public` + runtime `auth.role() != 'service_role'` guard
- All 3 tracked at version 20260221190053

**Migration 2:** `20260221190054_harden_user_subscriptions_rls.sql`
- DROPPED `user_subscriptions_update_own` policy (self-upgrade vulnerability)
- Expanded `user_subscriptions_admin_all` to cover `is_super_admin = true` in addition to `is_admin = true`

### Phase B — Stripe-synced pricing (implemented 2026-02-21)

**New edge function:** `supabase/functions/update-plan-pricing/index.ts`
- Super admin only (checks `is_super_admin` in `user_profiles`)
- Creates new Stripe prices for changed amounts, archives old ones
- Updates `subscription_plans` row atomically (new prices written to DB before archiving old)
- Writes audit row to `subscription_plan_changes`
- Input: `{ planId, priceMonthly, priceAnnual }` in cents

**Updated service:** `src/services/subscription/adminSubscriptionService.ts` → `updatePlanPricing()`
- Now calls `supabase.functions.invoke('update-plan-pricing', ...)` instead of direct table update
- No UI changes needed — `PlanEditorDialog` Pricing tab already routes through this service

## Deployment needed
- Run `supabase functions deploy update-plan-pricing` to activate Phase B edge function
- After deploy: use Admin Billing Panel → Team plan → Pricing tab to resolve Team pricing mismatch

## Verification queries
- RPC grants: `information_schema.routine_privileges` → only postgres + service_role rows
- RLS policies on user_subscriptions: select_own + admin_all only (no update_own, no insert_admin)
- Function versions: all 3 at 20260221190053
