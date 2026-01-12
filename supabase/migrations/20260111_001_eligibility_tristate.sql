-- =============================================================================
-- Phase 1: Tri-State Eligibility for Underwriting Wizard
-- =============================================================================
-- Eligibility is product-specific, not session-specific. A single session can have:
-- - Product A: eligible
-- - Product B: unknown
-- - Product C: ineligible
--
-- This migration creates the underwriting_session_recommendations table to track
-- per-product eligibility and recommendation details.
-- =============================================================================

-- Add eligibility summary to sessions (aggregate view)
ALTER TABLE underwriting_sessions
ADD COLUMN IF NOT EXISTS eligibility_summary JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN underwriting_sessions.eligibility_summary IS
'Summary of eligibility across all products in session. Structure: {"eligible": N, "unknown": N, "ineligible": N}';

-- =============================================================================
-- Per-product recommendation tracking table
-- =============================================================================
CREATE TABLE IF NOT EXISTS underwriting_session_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES underwriting_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  imo_id UUID NOT NULL REFERENCES imos(id),

  -- Tri-state eligibility (TEXT + CHECK for flexibility)
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('eligible', 'ineligible', 'unknown')),
  eligibility_reasons TEXT[] DEFAULT '{}'::text[],
  missing_fields JSONB DEFAULT '[]'::jsonb,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),

  -- Approval details
  approval_likelihood DECIMAL(3,2) CHECK (approval_likelihood >= 0 AND approval_likelihood <= 1),
  health_class_result TEXT,
  condition_decisions JSONB DEFAULT '[]'::jsonb,

  -- Pricing
  monthly_premium DECIMAL(10,2),
  annual_premium DECIMAL(12,2),
  cost_per_thousand DECIMAL(8,4),

  -- Ranking
  score DECIMAL(5,4),
  score_components JSONB DEFAULT '{}'::jsonb,
  recommendation_reason TEXT CHECK (recommendation_reason IN ('best_value', 'cheapest', 'best_approval', 'highest_coverage')),
  recommendation_rank INTEGER,

  -- Draft rules shown as FYI (not used in scoring)
  draft_rules_fyi JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  -- One recommendation per product per session
  UNIQUE(session_id, product_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX idx_session_recs_session
ON underwriting_session_recommendations(session_id);

CREATE INDEX idx_session_recs_imo
ON underwriting_session_recommendations(imo_id);

CREATE INDEX idx_session_recs_eligibility
ON underwriting_session_recommendations(eligibility_status);

CREATE INDEX idx_session_recs_carrier
ON underwriting_session_recommendations(carrier_id);

CREATE INDEX idx_session_recs_score
ON underwriting_session_recommendations(session_id, score DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE underwriting_session_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can read recommendations for sessions they created or are upline of
CREATE POLICY "Users can view recommendations for their accessible sessions"
ON underwriting_session_recommendations FOR SELECT
USING (
  imo_id = get_my_imo_id()
  AND EXISTS (
    SELECT 1 FROM underwriting_sessions s
    WHERE s.id = session_id
    AND (
      s.created_by = auth.uid()
      OR is_upline_of(s.created_by)
      OR is_imo_admin()
    )
  )
);

-- Only system can insert (via edge functions or backend)
-- Regular users cannot directly insert recommendations
CREATE POLICY "System can insert recommendations"
ON underwriting_session_recommendations FOR INSERT
WITH CHECK (
  imo_id = get_my_imo_id()
);

-- No direct updates - recommendations are immutable once created
-- (If re-run is needed, delete and recreate)

-- Allow deletion via cascade when session is deleted
CREATE POLICY "Users can delete recommendations for their sessions"
ON underwriting_session_recommendations FOR DELETE
USING (
  imo_id = get_my_imo_id()
  AND EXISTS (
    SELECT 1 FROM underwriting_sessions s
    WHERE s.id = session_id
    AND s.created_by = auth.uid()
  )
);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE underwriting_session_recommendations IS
'Per-product recommendation details with tri-state eligibility. Each row represents one product evaluation within a session.';

COMMENT ON COLUMN underwriting_session_recommendations.eligibility_status IS
'Product-specific eligibility: eligible (pass all checks), ineligible (fails hard checks), unknown (missing data for evaluation)';

COMMENT ON COLUMN underwriting_session_recommendations.missing_fields IS
'Array of field identifiers that are missing and needed for eligibility evaluation. Structure: [{"field": "condition.diabetes.a1c", "reason": "Required for acceptance check"}]';

COMMENT ON COLUMN underwriting_session_recommendations.confidence IS
'Data completeness score 0-1. Derived from ratio of answered vs required fields.';

COMMENT ON COLUMN underwriting_session_recommendations.score_components IS
'Breakdown of how final score was calculated. Structure: {"likelihood": 0.8, "priceScore": 0.6, "confidenceMultiplier": 0.85}';

COMMENT ON COLUMN underwriting_session_recommendations.draft_rules_fyi IS
'Draft acceptance rules shown for reference but NOT used in scoring. Structure: [{"conditionCode": "diabetes", "decision": "table_rated", "reviewStatus": "pending_review"}]';
