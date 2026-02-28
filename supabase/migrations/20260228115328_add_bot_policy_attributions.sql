-- Bot Policy Attributions
-- Links bot conversations to policy sales for measuring bot effectiveness
-- Attribution types: bot_converted (convo + appointment + sale), bot_assisted (convo + sale)
-- Match methods: auto_phone (confidence 1.0), auto_name (0.7), manual (1.0)

CREATE TABLE bot_policy_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_conversation_id text NOT NULL,
  external_appointment_id text,
  attribution_type text NOT NULL CHECK (attribution_type IN ('bot_assisted', 'bot_converted')),
  match_method text NOT NULL CHECK (match_method IN ('auto_phone', 'auto_name', 'manual')),
  confidence_score numeric(3,2) NOT NULL DEFAULT 1.0,
  lead_name text,
  conversation_started_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(policy_id)
);

CREATE INDEX idx_bot_attr_user ON bot_policy_attributions(user_id);
CREATE INDEX idx_bot_attr_type ON bot_policy_attributions(attribution_type);
CREATE INDEX idx_bot_attr_created ON bot_policy_attributions(created_at);

ALTER TABLE bot_policy_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attributions"
  ON bot_policy_attributions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages attributions"
  ON bot_policy_attributions FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bot_policy_attributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
