-- =============================================================================
-- Phase 2: Provenance & Review Workflow for Acceptance Rules
-- =============================================================================
-- Adds provenance tracking (source guide, pages, confidence) and review workflow
-- to carrier_condition_acceptance table. Only approved rules drive recommendations;
-- draft rules are shown as FYI.
-- =============================================================================

-- =============================================================================
-- Add provenance and review columns to carrier_condition_acceptance
-- =============================================================================

-- Source guide reference
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS source_guide_id UUID REFERENCES underwriting_guides(id) ON DELETE SET NULL;

-- Page numbers (array for multi-page rules)
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS source_pages INTEGER[] DEFAULT '{}'::integer[];

-- Relevant excerpt from the guide
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS source_snippet TEXT;

-- AI extraction confidence (0-1)
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2)
CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1));

-- Review status (TEXT + CHECK for flexibility)
-- Default to 'approved' for existing data to maintain backward compatibility
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved'
CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected'));

-- Who reviewed the rule
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- When the rule was reviewed
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Review notes
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Rule DSL schema version (for future-proofing)
ALTER TABLE carrier_condition_acceptance
ADD COLUMN IF NOT EXISTS rule_schema_version INTEGER DEFAULT 1;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON COLUMN carrier_condition_acceptance.source_guide_id IS
'Reference to the underwriting guide this rule was extracted from';

COMMENT ON COLUMN carrier_condition_acceptance.source_pages IS
'Page numbers in the source guide where this rule was found';

COMMENT ON COLUMN carrier_condition_acceptance.source_snippet IS
'Relevant text excerpt from the source guide';

COMMENT ON COLUMN carrier_condition_acceptance.extraction_confidence IS
'AI extraction confidence score (0-1). NULL for manually entered rules.';

COMMENT ON COLUMN carrier_condition_acceptance.review_status IS
'Review workflow status. Only approved rules drive recommendations. draft/pending_review rules shown as FYI.';

COMMENT ON COLUMN carrier_condition_acceptance.reviewed_by IS
'User who reviewed and approved/rejected this rule';

COMMENT ON COLUMN carrier_condition_acceptance.reviewed_at IS
'Timestamp when the rule was reviewed';

COMMENT ON COLUMN carrier_condition_acceptance.review_notes IS
'Notes from the reviewer about this rule';

COMMENT ON COLUMN carrier_condition_acceptance.rule_schema_version IS
'Version of the rule DSL schema. Increment when operators/structure changes.';

-- =============================================================================
-- Indexes for query performance
-- =============================================================================

-- Composite index for common lookup pattern
CREATE INDEX IF NOT EXISTS idx_acceptance_imo_carrier_condition_status
ON carrier_condition_acceptance(imo_id, carrier_id, condition_code, review_status);

-- Partial index for approved rules (most common query)
CREATE INDEX IF NOT EXISTS idx_acceptance_approved_lookup
ON carrier_condition_acceptance(imo_id, carrier_id, review_status)
WHERE review_status = 'approved';

-- Index for finding rules needing review
CREATE INDEX IF NOT EXISTS idx_acceptance_pending_review
ON carrier_condition_acceptance(imo_id, review_status)
WHERE review_status IN ('draft', 'pending_review');

-- Index for source guide lookups
CREATE INDEX IF NOT EXISTS idx_acceptance_source_guide
ON carrier_condition_acceptance(source_guide_id)
WHERE source_guide_id IS NOT NULL;

-- =============================================================================
-- Update existing RLS policies for review status filtering
-- =============================================================================

-- Drop existing select policy if exists
DROP POLICY IF EXISTS "Users can view acceptance rules in their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "Users can view approved acceptance rules in their IMO" ON carrier_condition_acceptance;
DROP POLICY IF EXISTS "IMO admins can view draft acceptance rules" ON carrier_condition_acceptance;

-- SELECT approved rules: all authenticated users in tenant
CREATE POLICY "Users can view approved acceptance rules in their IMO"
ON carrier_condition_acceptance FOR SELECT
USING (
  review_status = 'approved'
  AND imo_id = get_my_imo_id()
);

-- SELECT draft/pending rules: IMO admins only
CREATE POLICY "IMO admins can view draft acceptance rules"
ON carrier_condition_acceptance FOR SELECT
USING (
  review_status IN ('draft', 'pending_review', 'rejected')
  AND imo_id = get_my_imo_id()
  AND is_imo_admin()
);

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "IMO admins can create acceptance rules" ON carrier_condition_acceptance;

CREATE POLICY "IMO admins can create acceptance rules"
ON carrier_condition_acceptance FOR INSERT
WITH CHECK (
  imo_id = get_my_imo_id()
  AND is_imo_admin()
);

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "IMO admins can update acceptance rules" ON carrier_condition_acceptance;

CREATE POLICY "IMO admins can update acceptance rules"
ON carrier_condition_acceptance FOR UPDATE
USING (
  imo_id = get_my_imo_id()
  AND is_imo_admin()
)
WITH CHECK (
  imo_id = get_my_imo_id()
);

-- Ensure RLS is enabled
ALTER TABLE carrier_condition_acceptance ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper function to approve a rule
-- =============================================================================

CREATE OR REPLACE FUNCTION approve_acceptance_rule(
  p_rule_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is IMO admin
  IF NOT is_imo_admin() THEN
    RAISE EXCEPTION 'Only IMO admins can approve acceptance rules';
  END IF;

  -- Update the rule
  UPDATE carrier_condition_acceptance
  SET
    review_status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = COALESCE(p_notes, review_notes)
  WHERE id = p_rule_id
    AND imo_id = get_my_imo_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rule not found or not in your IMO';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_acceptance_rule(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION approve_acceptance_rule IS
'Approves an acceptance rule, setting review_status to approved and recording reviewer info.';

-- =============================================================================
-- Helper function to reject a rule
-- =============================================================================

CREATE OR REPLACE FUNCTION reject_acceptance_rule(
  p_rule_id UUID,
  p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is IMO admin
  IF NOT is_imo_admin() THEN
    RAISE EXCEPTION 'Only IMO admins can reject acceptance rules';
  END IF;

  -- Notes required for rejection
  IF p_notes IS NULL OR p_notes = '' THEN
    RAISE EXCEPTION 'Notes are required when rejecting a rule';
  END IF;

  -- Update the rule
  UPDATE carrier_condition_acceptance
  SET
    review_status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = p_notes
  WHERE id = p_rule_id
    AND imo_id = get_my_imo_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rule not found or not in your IMO';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION reject_acceptance_rule(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION reject_acceptance_rule IS
'Rejects an acceptance rule, setting review_status to rejected. Notes are required.';
