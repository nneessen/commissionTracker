# Stripe Billing Remediation Continuation (2026-02-21)

# CREATED ON 2/21/2026

## Context

This is a continuation handoff for the Stripe/subscription security + correctness remediation.

Primary audit doc:

- `docs/billing/stripe-subscription-audit-2026-02-21.md`

Current repo state:

- Audit document is complete.
- No remediation migrations have been created/applied yet.

## Confirmed current production state (as of 2026-02-21)

- Stripe live account is configured (products, prices, webhook endpoint, billing portal).
- No live subscriptions/invoices/customers yet.
- One expired/unpaid checkout session exists.
- App DB has users on `free` plan; no Stripe-linked `user_subscriptions`.
- `user_subscription_addons` has manual grants.
- Critical auth issues exist:
  - Privileged Stripe RPCs are executable by broad roles.
  - Users can update their own `user_subscriptions` row.
- Team plan DB display price does not match Stripe price IDs currently assigned.

## Remediation scope for next session

Implement the **first migration set only**:

1. Lock down Stripe RPC execution.
2. Harden `user_subscriptions` RLS to prevent self-upgrade mutation.
3. Fix Team plan DB price parity with Stripe.

Do not bundle unrelated refactors into this set.

## Planned migrations to create

Use timestamped files in `supabase/migrations/`:

1. `YYYYMMDDHHMMSS_lock_down_stripe_rpc_execution.sql`

- Target functions:
  - `process_stripe_subscription_event(...)`
  - `record_stripe_payment(...)`
  - `get_plan_by_stripe_price(...)`
- Actions:
  - Add explicit runtime guard inside each function:
    - reject unless `auth.role() = 'service_role'`
  - Keep `SECURITY DEFINER` with locked search path (`pg_catalog, public`).
  - `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;`
  - `GRANT EXECUTE ... TO service_role;`

2. `YYYYMMDDHHMMSS_harden_user_subscriptions_rls.sql`

- Actions:
  - Drop permissive self-update policy:
    - `user_subscriptions_update_own`
  - Ensure admin management policy remains and includes `is_admin OR is_super_admin`.
  - Keep self-select policy.
  - Do not re-open user self-insert/update as part of this set.

3. `YYYYMMDDHHMMSS_fix_team_plan_price_parity.sql`

- Actions:
  - Update `subscription_plans` Team row:
    - `price_monthly = 25000`
    - `price_annual = 275000`
  - Keep current Team Stripe price IDs unchanged.
  - Update `updated_at`.

## Mandatory migration rules (must obey)

From `CLAUDE.md`:

- Never apply migrations with direct `psql`.
- Always use:
- `./scripts/migrations/run-migration.sh supabase/migrations/<file>.sql`

Allowed for read/check queries:

- `./scripts/migrations/run-sql.sh "SELECT ..."`

## Execution checklist (next session)

1. Create timestamps:

- `date +%Y%m%d%H%M%S`

2. Add the 3 migration files above.

3. Apply each migration via runner:

- `./scripts/migrations/run-migration.sh supabase/migrations/<file1>.sql`
- `./scripts/migrations/run-migration.sh supabase/migrations/<file2>.sql`
- `./scripts/migrations/run-migration.sh supabase/migrations/<file3>.sql`

4. Verify migration/function tracking:

- `./scripts/migrations/verify-tracking.sh`
- `./scripts/migrations/audit-critical-functions.sh`

5. Regenerate DB types (required after schema/function/policy changes):

- `npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts`

6. Run quality checks:

- `npm run typecheck`
- `npm run test:run`
- `npm run build`

## Post-apply verification queries (read-only)

Use `./scripts/migrations/run-sql.sh`:

1. RPC privileges:

- verify `process_stripe_subscription_event`, `record_stripe_payment`, `get_plan_by_stripe_price` are executable only by `service_role`.

2. `user_subscriptions` policies:

- confirm no self-update policy exists.

3. Team price parity:

- confirm Team DB prices match expected Stripe-linked values.

## Not in this migration set (defer)

- Plan-change flow fix (currently uses new checkout subscription, double-charge risk).
- Seat pack schema/code model mismatch (`UNIQUE(stripe_subscription_id)` vs multi-pack logic).
- Checkout server allowlist for plan/price mapping.
- Portal return URL allowlist validation.
- Full payment-action-required/dunning UX.
- Doc cleanup of stale billing/subscription docs.

## Success criteria for this phase

- Clients can no longer call privileged Stripe billing RPCs.
- Users can no longer directly self-upgrade via `user_subscriptions` update path.
- Team displayed plan pricing matches Stripe price IDs again.
- Migrations are tracked and typegen/build pass cleanly.
