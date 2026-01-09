-- supabase/migrations/20260109_001_underwriting_wizard_tables.sql
-- AI-Powered Underwriting Wizard - Database Schema

-- ============================================================================
-- TABLE 1: underwriting_health_conditions (Reference Data)
-- Stores predefined health conditions with dynamic follow-up question schemas
-- ============================================================================

CREATE TABLE IF NOT EXISTS underwriting_health_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  follow_up_schema JSONB NOT NULL DEFAULT '{"questions": []}',
  risk_weight INTEGER DEFAULT 1 CHECK (risk_weight >= 1 AND risk_weight <= 10),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_health_conditions_category ON underwriting_health_conditions(category);
CREATE INDEX idx_health_conditions_active ON underwriting_health_conditions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_health_conditions_code ON underwriting_health_conditions(code);

-- ============================================================================
-- TABLE 2: underwriting_guides (Carrier Underwriting Guide PDFs)
-- Stores uploaded carrier underwriting guides with parsed content
-- ============================================================================

CREATE TABLE IF NOT EXISTS underwriting_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50),
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INTEGER,
  content_hash VARCHAR(64),
  parsed_content TEXT,
  parsing_status VARCHAR(20) DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
  parsing_error TEXT,
  effective_date DATE,
  expiration_date DATE,
  uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_underwriting_guides_imo ON underwriting_guides(imo_id);
CREATE INDEX idx_underwriting_guides_carrier ON underwriting_guides(carrier_id);
CREATE INDEX idx_underwriting_guides_status ON underwriting_guides(parsing_status);
CREATE INDEX idx_underwriting_guides_imo_carrier ON underwriting_guides(imo_id, carrier_id);

-- ============================================================================
-- TABLE 3: underwriting_decision_trees (Custom Matching Logic)
-- Stores user-defined decision tree rules for carrier/product matching
-- ============================================================================

CREATE TABLE IF NOT EXISTS underwriting_decision_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  rules JSONB NOT NULL DEFAULT '{"rules": []}',
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(imo_id, name)
);

-- Indexes
CREATE INDEX idx_decision_trees_imo ON underwriting_decision_trees(imo_id);
CREATE INDEX idx_decision_trees_active ON underwriting_decision_trees(imo_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_decision_trees_default ON underwriting_decision_trees(imo_id, is_default) WHERE is_default = TRUE;

-- ============================================================================
-- TABLE 4: underwriting_sessions (Wizard Sessions - Optional Save)
-- Stores saved underwriting wizard sessions for compliance/audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS underwriting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Client Info
  client_name VARCHAR(255),
  client_dob DATE,
  client_age INTEGER NOT NULL CHECK (client_age >= 0 AND client_age <= 150),
  client_gender VARCHAR(20),
  client_state VARCHAR(2),
  client_height_inches INTEGER CHECK (client_height_inches >= 0 AND client_height_inches <= 120),
  client_weight_lbs INTEGER CHECK (client_weight_lbs >= 0 AND client_weight_lbs <= 1000),
  client_bmi DECIMAL(5,2),

  -- Health Data
  health_responses JSONB NOT NULL DEFAULT '{}',
  conditions_reported TEXT[] DEFAULT '{}',
  tobacco_use BOOLEAN DEFAULT FALSE,
  tobacco_details JSONB,

  -- Coverage Request
  requested_face_amount DECIMAL(15,2),
  requested_product_types TEXT[] DEFAULT '{}',

  -- AI Analysis Results
  ai_analysis JSONB,
  health_tier VARCHAR(50),
  risk_factors TEXT[] DEFAULT '{}',

  -- Recommendations
  recommendations JSONB NOT NULL DEFAULT '[]',
  decision_tree_id UUID REFERENCES underwriting_decision_trees(id) ON DELETE SET NULL,

  -- Metadata
  session_duration_seconds INTEGER,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'saved')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_underwriting_sessions_imo ON underwriting_sessions(imo_id);
CREATE INDEX idx_underwriting_sessions_agency ON underwriting_sessions(agency_id);
CREATE INDEX idx_underwriting_sessions_user ON underwriting_sessions(created_by);
CREATE INDEX idx_underwriting_sessions_date ON underwriting_sessions(created_at DESC);
CREATE INDEX idx_underwriting_sessions_status ON underwriting_sessions(status);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_underwriting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_conditions_updated_at
  BEFORE UPDATE ON underwriting_health_conditions
  FOR EACH ROW EXECUTE FUNCTION update_underwriting_updated_at();

CREATE TRIGGER update_guides_updated_at
  BEFORE UPDATE ON underwriting_guides
  FOR EACH ROW EXECUTE FUNCTION update_underwriting_updated_at();

CREATE TRIGGER update_decision_trees_updated_at
  BEFORE UPDATE ON underwriting_decision_trees
  FOR EACH ROW EXECUTE FUNCTION update_underwriting_updated_at();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON underwriting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_underwriting_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE underwriting_health_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_decision_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_sessions ENABLE ROW LEVEL SECURITY;

-- Health Conditions: Read for all authenticated users (reference data)
CREATE POLICY "health_conditions_select" ON underwriting_health_conditions
  FOR SELECT TO authenticated USING (TRUE);

-- Health Conditions: Super admin only for mutations
CREATE POLICY "health_conditions_insert" ON underwriting_health_conditions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "health_conditions_update" ON underwriting_health_conditions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "health_conditions_delete" ON underwriting_health_conditions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- Underwriting Guides: IMO-scoped access
CREATE POLICY "guides_select" ON underwriting_guides
  FOR SELECT TO authenticated USING (imo_id = get_my_imo_id());

CREATE POLICY "guides_insert" ON underwriting_guides
  FOR INSERT TO authenticated WITH CHECK (
    imo_id = get_my_imo_id() AND is_imo_admin()
  );

CREATE POLICY "guides_update" ON underwriting_guides
  FOR UPDATE TO authenticated USING (
    imo_id = get_my_imo_id() AND is_imo_admin()
  );

CREATE POLICY "guides_delete" ON underwriting_guides
  FOR DELETE TO authenticated USING (
    imo_id = get_my_imo_id() AND is_imo_admin()
  );

-- Decision Trees: IMO-scoped access
CREATE POLICY "decision_trees_select" ON underwriting_decision_trees
  FOR SELECT TO authenticated USING (imo_id = get_my_imo_id());

CREATE POLICY "decision_trees_insert" ON underwriting_decision_trees
  FOR INSERT TO authenticated WITH CHECK (
    imo_id = get_my_imo_id() AND is_imo_admin()
  );

CREATE POLICY "decision_trees_update" ON underwriting_decision_trees
  FOR UPDATE TO authenticated USING (
    imo_id = get_my_imo_id() AND is_imo_admin()
  );

CREATE POLICY "decision_trees_delete" ON underwriting_decision_trees
  FOR DELETE TO authenticated USING (
    imo_id = get_my_imo_id() AND is_imo_admin()
  );

-- Sessions: Creator + upline + admin access
CREATE POLICY "sessions_select" ON underwriting_sessions
  FOR SELECT TO authenticated USING (
    imo_id = get_my_imo_id() AND (
      created_by = auth.uid() OR
      is_imo_admin() OR
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = underwriting_sessions.created_by
        AND up.hierarchy_path LIKE (
          SELECT COALESCE(hierarchy_path, id::text) || '%'
          FROM user_profiles
          WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "sessions_insert" ON underwriting_sessions
  FOR INSERT TO authenticated WITH CHECK (
    imo_id = get_my_imo_id() AND created_by = auth.uid()
  );

CREATE POLICY "sessions_update" ON underwriting_sessions
  FOR UPDATE TO authenticated USING (
    imo_id = get_my_imo_id() AND (
      created_by = auth.uid() OR is_imo_admin()
    )
  );

CREATE POLICY "sessions_delete" ON underwriting_sessions
  FOR DELETE TO authenticated USING (
    imo_id = get_my_imo_id() AND (
      created_by = auth.uid() OR is_imo_admin()
    )
  );

-- ============================================================================
-- FEATURE FLAG FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION is_underwriting_wizard_enabled(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (settings->>'underwriting_wizard_enabled')::boolean
     FROM agencies
     WHERE id = p_agency_id),
    FALSE
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_underwriting_wizard_enabled(UUID) TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: Get active decision tree for IMO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_decision_tree(p_imo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT rules INTO v_result
  FROM underwriting_decision_trees
  WHERE imo_id = p_imo_id
    AND is_active = TRUE
  ORDER BY is_default DESC, updated_at DESC
  LIMIT 1;

  RETURN COALESCE(v_result, '{"rules": []}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_decision_tree(UUID) TO authenticated;
