-- Add stripe_subscription_item_id to track individual line items within a single subscription
-- This supports the multi-line-item billing model where addons and seat packs
-- are added as line items on the main subscription rather than separate subscriptions.

-- user_subscription_addons: track which Stripe subscription item (si_xxx) each addon maps to
ALTER TABLE user_subscription_addons
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;

-- team_seat_packs: track which Stripe subscription item (si_xxx) each seat pack maps to
ALTER TABLE team_seat_packs
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;

-- Partial indexes for fast lookups on active items with a subscription item ID
CREATE INDEX IF NOT EXISTS idx_user_sub_addons_stripe_item_id
  ON user_subscription_addons (stripe_subscription_item_id)
  WHERE stripe_subscription_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_seat_packs_stripe_item_id
  ON team_seat_packs (stripe_subscription_item_id)
  WHERE stripe_subscription_item_id IS NOT NULL;
