-- supabase/migrations/20260220081834_create_carrier_contract_requests.sql
-- Create carrier_contract_requests table for tracking carrier contract workflow

-- New table for tracking carrier contract requests (replaces checklist items)
CREATE TABLE IF NOT EXISTS carrier_contract_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  recruit_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES pipeline_phases(id) ON DELETE SET NULL, -- Link to contracting phase

  -- Request tracking
  request_order INTEGER NOT NULL, -- 1, 2, 3... (order of request)
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'in_progress', 'writing_received', 'completed', 'rejected', 'cancelled')),

  -- Dates
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  in_progress_date DATE,
  writing_received_date DATE,
  completed_date DATE,

  -- Writing number
  writing_number TEXT,

  -- Documents
  contract_document_id UUID REFERENCES user_documents(id) ON DELETE SET NULL,
  supporting_docs JSONB DEFAULT '[]'::jsonb, -- Array of document IDs

  -- Notes & instructions
  notes TEXT,
  carrier_instructions TEXT, -- Cached from carriers.contracting_metadata->>'instructions'

  -- Audit
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(recruit_id, carrier_id) -- One request per recruit per carrier
);

-- Indexes
CREATE INDEX idx_contract_requests_recruit ON carrier_contract_requests(recruit_id);
CREATE INDEX idx_contract_requests_carrier ON carrier_contract_requests(carrier_id);
CREATE INDEX idx_contract_requests_phase ON carrier_contract_requests(phase_id);
CREATE INDEX idx_contract_requests_status ON carrier_contract_requests(status);
CREATE INDEX idx_contract_requests_order ON carrier_contract_requests(recruit_id, request_order);

-- RLS Policies
ALTER TABLE carrier_contract_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view all
CREATE POLICY "Staff can view all contract requests" ON carrier_contract_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE id = auth.uid()
  AND (roles @> ARRAY['trainer'] OR roles @> ARRAY['contracting_manager'] OR is_admin = true)
));

-- Staff can manage all
CREATE POLICY "Staff can manage all contract requests" ON carrier_contract_requests FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_profiles
  WHERE id = auth.uid()
  AND (roles @> ARRAY['trainer'] OR roles @> ARRAY['contracting_manager'] OR is_admin = true)
));

-- Recruits can view their own
CREATE POLICY "Recruits can view own contract requests" ON carrier_contract_requests FOR SELECT
USING (recruit_id = auth.uid());

-- Recruits can update their own (limited fields: writing_number, notes, documents)
CREATE POLICY "Recruits can update own contract requests" ON carrier_contract_requests FOR UPDATE
USING (recruit_id = auth.uid())
WITH CHECK (
  recruit_id = auth.uid()
  AND status = OLD.status -- Cannot change status
  AND request_order = OLD.request_order -- Cannot change order
);

-- Updated_at trigger
CREATE TRIGGER carrier_contract_requests_updated_at
  BEFORE UPDATE ON carrier_contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE carrier_contract_requests IS 'Tracks carrier contract requests for recruits going through contracting phase';
COMMENT ON COLUMN carrier_contract_requests.request_order IS 'Order in which carrier contracts were requested (1 = first, 2 = second, etc.)';
COMMENT ON COLUMN carrier_contract_requests.carrier_instructions IS 'Cached carrier-specific instructions from carriers.contracting_metadata';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, version, description)
VALUES ('carrier_contract_requests_table', '20260220081834', 'Created carrier_contract_requests table with RLS policies')
ON CONFLICT (function_name) DO UPDATE SET
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  updated_at = NOW();
