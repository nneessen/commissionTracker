-- supabase/migrations/20260112_010_rule_source_tracking.sql
-- Phase 0: Add source tracking and safety labeling to rule sets

-- Create source type enum
DO $$ BEGIN
  CREATE TYPE rule_source_type AS ENUM (
    'generic_template',   -- Generated from built-in templates
    'carrier_document',   -- Extracted from carrier UW guide
    'manual'              -- Manually created by user
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create product type enum
DO $$ BEGIN
  CREATE TYPE insurance_product_type AS ENUM (
    'term_life',
    'whole_life',
    'universal_life',
    'final_expense',
    'indexed_universal_life',
    'variable_life'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to underwriting_rule_sets
ALTER TABLE underwriting_rule_sets
  ADD COLUMN IF NOT EXISTS source_type rule_source_type DEFAULT 'manual';

ALTER TABLE underwriting_rule_sets
  ADD COLUMN IF NOT EXISTS template_version INTEGER;

ALTER TABLE underwriting_rule_sets
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

ALTER TABLE underwriting_rule_sets
  ADD COLUMN IF NOT EXISTS product_type insurance_product_type;

-- Mark all existing generated rules as generic_template
UPDATE underwriting_rule_sets
SET source_type = 'generic_template',
    template_version = 1,
    needs_review = true
WHERE source = 'imported';

-- Add knockout_category to health conditions if not exists
ALTER TABLE underwriting_health_conditions
  ADD COLUMN IF NOT EXISTS knockout_category TEXT
    CHECK (knockout_category IN ('absolute', 'conditional', 'standard'))
    DEFAULT 'standard';

-- Categorize knockout conditions
UPDATE underwriting_health_conditions
SET knockout_category = 'absolute'
WHERE code IN (
  'aids_hiv',
  'als',
  'alzheimers',
  'dementia',
  'hospice',
  'metastatic_cancer',
  'organ_transplant_waiting'
);

UPDATE underwriting_health_conditions
SET knockout_category = 'conditional'
WHERE code IN (
  'dialysis',
  'oxygen_therapy',
  'wheelchair_bound',
  'stroke_recent',
  'heart_attack_recent',
  'parkinsons_advanced',
  'substance_abuse_active',
  'intravenous_drug_use'
);

-- Add constraint: product_id and product_type are mutually exclusive
-- (only add if doesn't exist)
DO $$ BEGIN
  ALTER TABLE underwriting_rule_sets
    ADD CONSTRAINT chk_product_scope CHECK (
      NOT (product_id IS NOT NULL AND product_type IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create index for efficient scope resolution
CREATE INDEX IF NOT EXISTS idx_rule_sets_scope_resolution
  ON underwriting_rule_sets (carrier_id, condition_code, product_type, product_id)
  WHERE review_status = 'approved' AND is_active = true;

-- Comments
COMMENT ON COLUMN underwriting_rule_sets.source_type IS
  'Origin of this rule set: generic_template (auto-generated), carrier_document (extracted from UW guide), manual (user created)';

COMMENT ON COLUMN underwriting_rule_sets.template_version IS
  'Version of the template used to generate this rule set (for tracking updates)';

COMMENT ON COLUMN underwriting_rule_sets.needs_review IS
  'If true, this rule set requires manual review before it can be approved';

COMMENT ON COLUMN underwriting_rule_sets.product_type IS
  'Product type scope. NULL = applies to all product types (carrier-global)';

COMMENT ON COLUMN underwriting_health_conditions.knockout_category IS
  'absolute = decline across all products, conditional = varies by product type, standard = normal condition';
