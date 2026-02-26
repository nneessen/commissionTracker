-- supabase/migrations/20260226142159_normalize_chat_bot_tier_field.sql
-- Normalize ai_chat_bot tier_config: rename leads_per_month → runs_per_month
-- to match the canonical AddonTier interface used by all other addons.

UPDATE subscription_addons
SET tier_config = jsonb_set(
  tier_config,
  '{tiers}',
  (
    SELECT jsonb_agg(
      (t - 'leads_per_month') || jsonb_build_object('runs_per_month', t->'leads_per_month')
    )
    FROM jsonb_array_elements(tier_config->'tiers') AS t
  )
)
WHERE name = 'ai_chat_bot'
  AND tier_config->'tiers'->0 ? 'leads_per_month';
