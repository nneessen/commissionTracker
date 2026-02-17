-- supabase/migrations/20260217152650_seat_pack_idempotency.sql
-- Add unique constraint on team_seat_packs.stripe_subscription_id to prevent
-- duplicate rows from Stripe webhook retries on checkout.session.completed.

BEGIN;

-- Add unique constraint (NULLs are allowed and won't conflict)
ALTER TABLE team_seat_packs
  ADD CONSTRAINT team_seat_packs_stripe_subscription_id_key
  UNIQUE (stripe_subscription_id);

COMMIT;
