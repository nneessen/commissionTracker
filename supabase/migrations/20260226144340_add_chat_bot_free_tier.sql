-- supabase/migrations/20260226144340_add_chat_bot_free_tier.sql
-- Add a free tier (5 leads/month, $0) to the ai_chat_bot addon for testing.

UPDATE subscription_addons
SET tier_config = jsonb_set(
  tier_config,
  '{tiers}',
  (
    SELECT jsonb_build_array(
      jsonb_build_object(
        'id', 'free',
        'name', 'Free',
        'runs_per_month', 5,
        'price_monthly', 0,
        'price_annual', 0,
        'stripe_price_id_monthly', null,
        'stripe_price_id_annual', null
      )
    ) || (tier_config->'tiers')
  )
)
WHERE name = 'ai_chat_bot';
