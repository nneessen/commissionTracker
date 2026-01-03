-- supabase/migrations/20260103_008_instagram_lead_source.sql
-- Instagram DM Integration - Lead Source Tracking

-- ============================================================================
-- 1. Add lead_source column to recruiting_leads
-- ============================================================================

ALTER TABLE recruiting_leads
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website';

COMMENT ON COLUMN recruiting_leads.lead_source IS 'Source of the lead: website, instagram_dm, manual, referral';

-- ============================================================================
-- 2. Add instagram_conversation_id FK to recruiting_leads
-- ============================================================================

ALTER TABLE recruiting_leads
ADD COLUMN IF NOT EXISTS instagram_conversation_id UUID REFERENCES instagram_conversations(id) ON DELETE SET NULL;

COMMENT ON COLUMN recruiting_leads.instagram_conversation_id IS 'Links lead to Instagram DM conversation if created from IG';

-- ============================================================================
-- 3. Add instagram_username to recruiting_leads for IG leads
-- ============================================================================

ALTER TABLE recruiting_leads
ADD COLUMN IF NOT EXISTS instagram_username TEXT;

COMMENT ON COLUMN recruiting_leads.instagram_username IS 'Instagram @handle if lead came from Instagram DM';

-- ============================================================================
-- 4. Add FK constraint from instagram_conversations to recruiting_leads
-- Now that recruiting_leads has instagram_conversation_id, we can add the reciprocal FK
-- ============================================================================

ALTER TABLE instagram_conversations
ADD CONSTRAINT fk_instagram_conversations_recruiting_lead
FOREIGN KEY (recruiting_lead_id) REFERENCES recruiting_leads(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Create index for instagram leads
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recruiting_leads_instagram
  ON recruiting_leads(instagram_conversation_id)
  WHERE instagram_conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruiting_leads_source
  ON recruiting_leads(lead_source);

-- ============================================================================
-- 6. Update existing leads to have 'website' source (if they don't have one)
-- ============================================================================

UPDATE recruiting_leads
SET lead_source = 'website'
WHERE lead_source IS NULL;

-- ============================================================================
-- 7. Create helper function to create lead from Instagram conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_lead_from_instagram(
  p_conversation_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_city TEXT DEFAULT '',
  p_state TEXT DEFAULT '',
  p_availability TEXT DEFAULT 'exploring',
  p_insurance_experience TEXT DEFAULT 'none',
  p_why_interested TEXT DEFAULT 'Contacted via Instagram DM'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation instagram_conversations%ROWTYPE;
  v_integration instagram_integrations%ROWTYPE;
  v_lead_id UUID;
BEGIN
  -- Get conversation
  SELECT * INTO v_conversation
  FROM instagram_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- Get integration to find recruiter
  SELECT * INTO v_integration
  FROM instagram_integrations
  WHERE id = v_conversation.integration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;

  -- Verify user owns this conversation
  IF v_integration.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Create the lead
  INSERT INTO recruiting_leads (
    recruiter_id,
    imo_id,
    first_name,
    last_name,
    email,
    phone,
    city,
    state,
    availability,
    insurance_experience,
    why_interested,
    status,
    lead_source,
    instagram_conversation_id,
    instagram_username,
    utm_source,
    submitted_at
  ) VALUES (
    v_integration.user_id,
    v_integration.imo_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    COALESCE(p_city, ''),
    COALESCE(p_state, ''),
    p_availability,
    p_insurance_experience,
    p_why_interested,
    'pending',
    'instagram_dm',
    p_conversation_id,
    v_conversation.participant_username,
    'instagram',
    now()
  )
  RETURNING id INTO v_lead_id;

  -- Link the conversation back to the lead
  UPDATE instagram_conversations
  SET recruiting_lead_id = v_lead_id
  WHERE id = p_conversation_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_lead_from_instagram TO authenticated;

COMMENT ON FUNCTION create_lead_from_instagram IS 'Creates a recruiting lead from an Instagram DM conversation';
