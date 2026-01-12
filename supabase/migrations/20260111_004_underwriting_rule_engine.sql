-- =============================================================================
-- Underwriting Rule Engine v2
-- =============================================================================
-- Replaces naive lookup table with deterministic, multi-factor rule engine
-- supporting compound predicates, cross-condition evaluation, and proper
-- unknown propagation.
--
-- Key features:
-- - Ordered rule sets with first-match-wins semantics
-- - Global (cross-condition) and condition-specific rules
-- - Table rating as ordinal units (max aggregation, not multiply)
-- - Safe default outcomes (unknown, not decline)
-- - Complete RLS coverage
-- - Hardened approval workflow
-- =============================================================================

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Table rating: A-P corresponding to 25% increments (A=125%, P=400%)
CREATE TYPE table_rating AS ENUM (
  'none',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'
);

-- Health class with explicit ranking
CREATE TYPE health_class AS ENUM (
  'preferred_plus',
  'preferred',
  'standard_plus',
  'standard',
  'substandard',
  'refer',
  'decline',
  'unknown'
);

-- Rule set scope: condition-specific or cross-condition
CREATE TYPE rule_set_scope AS ENUM (
  'condition',
  'global'
);

-- Review status for approval workflow
CREATE TYPE rule_review_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'rejected'
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Convert table rating to ordinal units (0-16)
CREATE OR REPLACE FUNCTION table_rating_units(rating table_rating)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE rating
    WHEN 'none' THEN 0
    WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4
    WHEN 'E' THEN 5 WHEN 'F' THEN 6 WHEN 'G' THEN 7 WHEN 'H' THEN 8
    WHEN 'I' THEN 9 WHEN 'J' THEN 10 WHEN 'K' THEN 11 WHEN 'L' THEN 12
    WHEN 'M' THEN 13 WHEN 'N' THEN 14 WHEN 'O' THEN 15 WHEN 'P' THEN 16
  END;
$$;

COMMENT ON FUNCTION table_rating_units IS
'Converts table rating letter to ordinal units. Used for max aggregation across conditions.';

-- Convert ordinal units back to table rating
CREATE OR REPLACE FUNCTION units_to_table_rating(units INTEGER)
RETURNS table_rating
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN units IS NULL OR units <= 0 THEN 'none'::table_rating
    WHEN units >= 16 THEN 'P'::table_rating
    ELSE (ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'])[units]::table_rating
  END;
$$;

-- Health class severity ranking (higher = worse)
CREATE OR REPLACE FUNCTION health_class_rank(hc health_class)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE hc
    WHEN 'preferred_plus' THEN 1
    WHEN 'preferred' THEN 2
    WHEN 'standard_plus' THEN 3
    WHEN 'standard' THEN 4
    WHEN 'substandard' THEN 5
    WHEN 'refer' THEN 6
    WHEN 'unknown' THEN 7
    WHEN 'decline' THEN 8
    ELSE 7 -- Default to unknown for safety
  END;
$$;

COMMENT ON FUNCTION health_class_rank IS
'Returns severity ranking for health class. Higher = worse. Unknown (7) is worse than refer (6).';

-- Convert rank back to health class
CREATE OR REPLACE FUNCTION rank_to_health_class(rank INTEGER)
RETURNS health_class
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE rank
    WHEN 1 THEN 'preferred_plus'::health_class
    WHEN 2 THEN 'preferred'::health_class
    WHEN 3 THEN 'standard_plus'::health_class
    WHEN 4 THEN 'standard'::health_class
    WHEN 5 THEN 'substandard'::health_class
    WHEN 6 THEN 'refer'::health_class
    WHEN 7 THEN 'unknown'::health_class
    WHEN 8 THEN 'decline'::health_class
    ELSE 'unknown'::health_class
  END;
$$;

-- Get user's IMO ID (for RLS policies)
CREATE OR REPLACE FUNCTION get_my_imo_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT imo_id FROM user_profiles WHERE id = auth.uid();
$$;

-- Check if user is IMO admin
CREATE OR REPLACE FUNCTION is_imo_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND roles && ARRAY['admin', 'imo_admin', 'superadmin']
  );
$$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Rule sets: groups of ordered rules for a carrier/product/condition
CREATE TABLE underwriting_rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  -- Scope determines what this rule set evaluates
  scope rule_set_scope NOT NULL DEFAULT 'condition',

  -- For condition scope: which condition (NULL for global scope)
  condition_code TEXT REFERENCES underwriting_health_conditions(code),

  -- Variant allows multiple rule sets per scope
  variant TEXT NOT NULL DEFAULT 'default',

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- Default fallback outcome when no rules match
  -- CRITICAL: Default should be 'unknown' or 'refer', NOT 'decline'
  default_outcome JSONB NOT NULL DEFAULT '{
    "eligibility": "unknown",
    "health_class": "unknown",
    "table_rating": "none",
    "reason": "No matching rule - manual review required"
  }'::jsonb,

  -- Provenance
  source TEXT CHECK (source IN ('manual', 'ai_extracted', 'imported')),
  source_guide_id UUID REFERENCES underwriting_guides(id) ON DELETE SET NULL,

  -- Review workflow
  review_status rule_review_status DEFAULT 'draft',
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_condition_scope CHECK (
    (scope = 'condition' AND condition_code IS NOT NULL) OR
    (scope = 'global' AND condition_code IS NULL)
  ),
  CONSTRAINT chk_default_outcome_safe CHECK (
    default_outcome->>'eligibility' IN ('unknown', 'refer', 'eligible')
    OR default_outcome->>'eligibility' IS NULL
  )
);

-- Partial unique index: only one active approved rule set per scope/variant
CREATE UNIQUE INDEX idx_rule_sets_active_approved
ON underwriting_rule_sets (imo_id, carrier_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid), scope, COALESCE(condition_code, ''), variant)
WHERE is_active = true AND review_status = 'approved';

-- Indexes for efficient lookup
CREATE INDEX idx_rule_sets_lookup ON underwriting_rule_sets(imo_id, carrier_id, product_id, scope, condition_code)
WHERE is_active = true AND review_status = 'approved';

CREATE INDEX idx_rule_sets_review ON underwriting_rule_sets(imo_id, review_status)
WHERE review_status IN ('draft', 'pending_review');

-- Individual rules within a rule set
CREATE TABLE underwriting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES underwriting_rule_sets(id) ON DELETE CASCADE,

  -- Ordering (lower = evaluated first)
  priority INTEGER NOT NULL DEFAULT 100,
  name TEXT NOT NULL,
  description TEXT,

  -- Applicability filters (NOT part of predicate)
  age_band_min INTEGER CHECK (age_band_min IS NULL OR age_band_min >= 0),
  age_band_max INTEGER CHECK (age_band_max IS NULL OR age_band_max <= 120),
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female')),

  -- The compound predicate (DSL v2)
  predicate JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicate_version INTEGER DEFAULT 2,

  -- Outcome if predicate matches (strongly typed columns)
  outcome_eligibility TEXT NOT NULL CHECK (outcome_eligibility IN ('eligible', 'ineligible', 'refer')),
  outcome_health_class health_class NOT NULL,
  outcome_table_rating table_rating DEFAULT 'none',
  outcome_flat_extra_per_thousand NUMERIC(8,2) CHECK (outcome_flat_extra_per_thousand IS NULL OR outcome_flat_extra_per_thousand >= 0),
  outcome_flat_extra_years INTEGER CHECK (outcome_flat_extra_years IS NULL OR outcome_flat_extra_years > 0),
  outcome_reason TEXT NOT NULL,
  outcome_concerns TEXT[] DEFAULT '{}',

  -- Provenance for this specific rule
  extraction_confidence NUMERIC(3,2) CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),
  source_pages INTEGER[],
  source_snippet TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_age_band_order CHECK (
    age_band_min IS NULL OR age_band_max IS NULL OR age_band_min <= age_band_max
  ),
  CONSTRAINT unique_rule_priority UNIQUE (rule_set_id, priority)
);

-- Indexes
CREATE INDEX idx_rules_by_rule_set ON underwriting_rules(rule_set_id, priority);

-- Evaluation log for audit trail (minimized PHI)
CREATE TABLE underwriting_rule_evaluation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES underwriting_sessions(id) ON DELETE SET NULL,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- What was evaluated
  rule_set_id UUID REFERENCES underwriting_rule_sets(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES underwriting_rules(id) ON DELETE SET NULL,
  condition_code TEXT,

  -- Evaluation timestamp
  evaluated_at TIMESTAMPTZ DEFAULT now(),

  -- Result (no PHI)
  predicate_result TEXT CHECK (predicate_result IN ('matched', 'failed', 'unknown', 'skipped')),
  matched_conditions JSONB,
  failed_conditions JSONB,
  missing_fields JSONB,

  -- Outcome applied (if matched)
  outcome_applied JSONB,

  -- Input fingerprint (NOT the actual data)
  input_hash TEXT,

  -- Expiration for data retention (90 days default)
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days')
);

-- Indexes
CREATE INDEX idx_eval_log_session ON underwriting_rule_evaluation_log(session_id);
CREATE INDEX idx_eval_log_expires ON underwriting_rule_evaluation_log(expires_at);
CREATE INDEX idx_eval_log_imo ON underwriting_rule_evaluation_log(imo_id, evaluated_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE underwriting_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_rule_evaluation_log ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- underwriting_rule_sets
-- -------------------------

-- Agents: view approved rules for their IMO
CREATE POLICY rule_sets_select_agent ON underwriting_rule_sets
  FOR SELECT TO authenticated
  USING (
    imo_id = get_my_imo_id()
    AND review_status = 'approved'
  );

-- Admins: view all statuses for their IMO
CREATE POLICY rule_sets_select_admin ON underwriting_rule_sets
  FOR SELECT TO authenticated
  USING (
    imo_id = get_my_imo_id()
    AND is_imo_admin()
  );

-- Admins: insert for their IMO
CREATE POLICY rule_sets_insert ON underwriting_rule_sets
  FOR INSERT TO authenticated
  WITH CHECK (
    imo_id = get_my_imo_id()
    AND is_imo_admin()
  );

-- Admins: update for their IMO
CREATE POLICY rule_sets_update ON underwriting_rule_sets
  FOR UPDATE TO authenticated
  USING (imo_id = get_my_imo_id() AND is_imo_admin())
  WITH CHECK (imo_id = get_my_imo_id() AND is_imo_admin());

-- Admins: delete for their IMO
CREATE POLICY rule_sets_delete ON underwriting_rule_sets
  FOR DELETE TO authenticated
  USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- -------------------------
-- underwriting_rules
-- -------------------------

-- Select: visible if parent rule_set is visible
CREATE POLICY rules_select ON underwriting_rules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM underwriting_rule_sets rs
      WHERE rs.id = underwriting_rules.rule_set_id
      AND rs.imo_id = get_my_imo_id()
      AND (rs.review_status = 'approved' OR is_imo_admin())
    )
  );

-- Insert: allowed if parent rule_set is modifiable
CREATE POLICY rules_insert ON underwriting_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM underwriting_rule_sets rs
      WHERE rs.id = underwriting_rules.rule_set_id
      AND rs.imo_id = get_my_imo_id()
      AND is_imo_admin()
    )
  );

-- Update: allowed if parent rule_set is modifiable
CREATE POLICY rules_update ON underwriting_rules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM underwriting_rule_sets rs
      WHERE rs.id = underwriting_rules.rule_set_id
      AND rs.imo_id = get_my_imo_id()
      AND is_imo_admin()
    )
  );

-- Delete: allowed if parent rule_set is modifiable
CREATE POLICY rules_delete ON underwriting_rules
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM underwriting_rule_sets rs
      WHERE rs.id = underwriting_rules.rule_set_id
      AND rs.imo_id = get_my_imo_id()
      AND is_imo_admin()
    )
  );

-- -------------------------
-- underwriting_rule_evaluation_log
-- -------------------------

-- Select: own IMO only
CREATE POLICY eval_log_select ON underwriting_rule_evaluation_log
  FOR SELECT TO authenticated
  USING (imo_id = get_my_imo_id());

-- Insert: own IMO only
CREATE POLICY eval_log_insert ON underwriting_rule_evaluation_log
  FOR INSERT TO authenticated
  WITH CHECK (imo_id = get_my_imo_id());

-- No updates or deletes (append-only audit log)

-- =============================================================================
-- APPROVAL WORKFLOW RPCS
-- =============================================================================

-- Submit rule set for review
CREATE OR REPLACE FUNCTION submit_rule_set_for_review(
  p_rule_set_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_current_status rule_review_status;
BEGIN
  -- Get rule set details
  SELECT imo_id, review_status
  INTO v_imo_id, v_current_status
  FROM underwriting_rule_sets
  WHERE id = p_rule_set_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rule set not found');
  END IF;

  -- Verify user is in same IMO
  IF v_imo_id != get_my_imo_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Verify user is admin
  IF NOT is_imo_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Only draft can be submitted
  IF v_current_status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot submit from status: %s', v_current_status)
    );
  END IF;

  -- Update status
  UPDATE underwriting_rule_sets
  SET
    review_status = 'pending_review',
    updated_at = now()
  WHERE id = p_rule_set_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Approve rule set
CREATE OR REPLACE FUNCTION approve_underwriting_rule_set(
  p_rule_set_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_imo_id UUID;
  v_current_status rule_review_status;
  v_created_by UUID;
BEGIN
  -- Get rule set details
  SELECT imo_id, review_status, created_by
  INTO v_imo_id, v_current_status, v_created_by
  FROM underwriting_rule_sets
  WHERE id = p_rule_set_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rule set not found');
  END IF;

  -- Verify user is in same IMO
  IF v_imo_id != get_my_imo_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Verify user is admin
  IF NOT is_imo_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Prevent self-approval
  IF v_created_by = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve your own rule set');
  END IF;

  -- Enforce valid state transitions
  IF v_current_status NOT IN ('draft', 'pending_review') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot approve from status: %s', v_current_status)
    );
  END IF;

  -- Perform approval
  UPDATE underwriting_rule_sets
  SET
    review_status = 'approved',
    reviewed_by = v_user_id,
    reviewed_at = now(),
    review_notes = COALESCE(p_notes, review_notes),
    updated_at = now()
  WHERE id = p_rule_set_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Reject rule set (requires notes)
CREATE OR REPLACE FUNCTION reject_underwriting_rule_set(
  p_rule_set_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_imo_id UUID;
  v_current_status rule_review_status;
BEGIN
  -- Notes required for rejection
  IF p_notes IS NULL OR trim(p_notes) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection notes required');
  END IF;

  -- Get rule set details
  SELECT imo_id, review_status
  INTO v_imo_id, v_current_status
  FROM underwriting_rule_sets
  WHERE id = p_rule_set_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rule set not found');
  END IF;

  -- Verify access
  IF v_imo_id != get_my_imo_id() OR NOT is_imo_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Enforce valid state transitions
  IF v_current_status NOT IN ('draft', 'pending_review') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot reject from status: %s', v_current_status)
    );
  END IF;

  -- Perform rejection
  UPDATE underwriting_rule_sets
  SET
    review_status = 'rejected',
    reviewed_by = v_user_id,
    reviewed_at = now(),
    review_notes = p_notes,
    updated_at = now()
  WHERE id = p_rule_set_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Revert to draft (for editing after rejection or re-review)
CREATE OR REPLACE FUNCTION revert_rule_set_to_draft(
  p_rule_set_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_current_status rule_review_status;
BEGIN
  -- Get rule set details
  SELECT imo_id, review_status
  INTO v_imo_id, v_current_status
  FROM underwriting_rule_sets
  WHERE id = p_rule_set_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rule set not found');
  END IF;

  -- Verify access
  IF v_imo_id != get_my_imo_id() OR NOT is_imo_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Can revert from any status except draft
  IF v_current_status = 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in draft status');
  END IF;

  -- Increment version when reverting from approved
  IF v_current_status = 'approved' THEN
    UPDATE underwriting_rule_sets
    SET
      review_status = 'draft',
      version = version + 1,
      updated_at = now()
    WHERE id = p_rule_set_id;
  ELSE
    UPDATE underwriting_rule_sets
    SET
      review_status = 'draft',
      updated_at = now()
    WHERE id = p_rule_set_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- CLEANUP JOB (for evaluation log retention)
-- =============================================================================

-- Function to clean up expired evaluation logs
CREATE OR REPLACE FUNCTION cleanup_expired_evaluation_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM underwriting_rule_evaluation_log
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_evaluation_logs IS
'Deletes evaluation logs past their retention period. Should be called periodically via pg_cron or similar.';

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE underwriting_rule_sets IS
'Groups of ordered rules for underwriting evaluation. Can be condition-specific or global (cross-condition).';

COMMENT ON TABLE underwriting_rules IS
'Individual rules within a rule set. Evaluated in priority order (lower first). First match wins.';

COMMENT ON TABLE underwriting_rule_evaluation_log IS
'Audit trail of rule evaluations. Stores minimal data (no PHI) with 90-day retention.';

COMMENT ON COLUMN underwriting_rule_sets.scope IS
'condition = evaluates single condition. global = evaluates cross-condition interactions.';

COMMENT ON COLUMN underwriting_rule_sets.variant IS
'Allows multiple rule sets per scope (e.g., simplified_issue, fully_underwritten).';

COMMENT ON COLUMN underwriting_rule_sets.default_outcome IS
'Fallback when no rules match. MUST be unknown/refer for safety, never decline.';

COMMENT ON COLUMN underwriting_rules.predicate IS
'Compound predicate in DSL v2 format. Supports all/any/not groups with typed field conditions.';

COMMENT ON COLUMN underwriting_rules.outcome_table_rating IS
'Table rating letter A-P. Aggregated across conditions using MAX (worst wins), not multiplication.';
