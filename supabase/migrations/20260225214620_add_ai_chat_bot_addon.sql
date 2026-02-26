-- supabase/migrations/20260225214620_add_ai_chat_bot_addon.sql
-- AI Chat Bot addon: mapping table + subscription_addons seed with 3 tiers
--
-- Changes:
-- 1. Create chat_bot_agents table (user_id → external agent mapping)
-- 2. RLS policies (users read own row, service_role full access)
-- 3. Indexes on user_id and provisioning_status
-- 4. Seed subscription_addons with ai_chat_bot entry + 3 placeholder tiers

BEGIN;

-- ============================================================
-- 1. chat_bot_agents table
-- ============================================================

CREATE TABLE chat_bot_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  external_agent_id TEXT NOT NULL,
  provisioning_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (provisioning_status IN ('pending', 'active', 'deprovisioned', 'failed')),
  tier_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_chat_bot_agents_user_id ON chat_bot_agents(user_id);
CREATE INDEX idx_chat_bot_agents_provisioning_status ON chat_bot_agents(provisioning_status);

-- ============================================================
-- 2. RLS policies
-- ============================================================

ALTER TABLE chat_bot_agents ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "Users can view own chat bot agent"
  ON chat_bot_agents FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (bypasses RLS by default, but explicit for clarity)
CREATE POLICY "Service role full access on chat_bot_agents"
  ON chat_bot_agents FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 3. Updated at trigger
-- ============================================================

CREATE TRIGGER update_chat_bot_agents_updated_at
  BEFORE UPDATE ON chat_bot_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. Seed ai_chat_bot addon with 3 tiers (placeholder Stripe IDs)
-- ============================================================

INSERT INTO subscription_addons (
  name, display_name, description,
  price_monthly, price_annual, sort_order, tier_config
)
VALUES (
  'ai_chat_bot',
  'AI Chat Bot',
  'Automated SMS appointment-setting bot powered by AI. Connects to your Close CRM and calendar to book meetings from inbound leads.',
  4900,   -- $49/month (Starter tier base price)
  47000,  -- $470/year
  2,
  jsonb_build_object('tiers', jsonb_build_array(
    jsonb_build_object(
      'id', 'starter',
      'name', 'Starter',
      'leads_per_month', 50,
      'price_monthly', 4900,
      'price_annual', 47000,
      'stripe_price_id_monthly', NULL,
      'stripe_price_id_annual', NULL
    ),
    jsonb_build_object(
      'id', 'growth',
      'name', 'Growth',
      'leads_per_month', 150,
      'price_monthly', 9900,
      'price_annual', 95000,
      'stripe_price_id_monthly', NULL,
      'stripe_price_id_annual', NULL
    ),
    jsonb_build_object(
      'id', 'scale',
      'name', 'Scale',
      'leads_per_month', 500,
      'price_monthly', 19900,
      'price_annual', 191000,
      'stripe_price_id_monthly', NULL,
      'stripe_price_id_annual', NULL
    )
  ))
)
ON CONFLICT (name) DO NOTHING;

COMMIT;
