-- supabase/migrations/20251227_005_docuseal_signature_tables.sql
-- DocuSeal E-Signature Integration: Core Tables
-- Supports legally-binding signatures for agent contracts, agreements, and custom documents

-- =============================================================================
-- 1. CREATE signature_templates TABLE
-- =============================================================================
-- Stores document templates that can be sent for signature
-- Agency-scoped, with optional IMO-scoped templates

CREATE TABLE IF NOT EXISTS signature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  imo_id UUID REFERENCES imos(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'custom', -- 'agent_contract', 'independent_agreement', 'custom', 'user_signup'

  -- DocuSeal integration
  docuseal_template_id INTEGER, -- DocuSeal's internal template ID
  docuseal_template_slug TEXT,  -- For embedded forms

  -- Signing configuration
  required_signer_roles TEXT[] DEFAULT '{}', -- ['recruit', 'recruiter', 'agency_owner']
  signing_order TEXT DEFAULT 'any', -- 'any' or 'sequential'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE signature_templates IS
  'Document templates for e-signature collection via DocuSeal';
COMMENT ON COLUMN signature_templates.template_type IS
  'Type of document: agent_contract, independent_agreement, custom, user_signup';
COMMENT ON COLUMN signature_templates.required_signer_roles IS
  'Roles that must sign this document (recruit, recruiter, agency_owner)';
COMMENT ON COLUMN signature_templates.signing_order IS
  'Order of signing: any (parallel) or sequential';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_templates_agency ON signature_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_signature_templates_imo ON signature_templates(imo_id);
CREATE INDEX IF NOT EXISTS idx_signature_templates_type ON signature_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_signature_templates_active ON signature_templates(is_active) WHERE is_active = true;

-- =============================================================================
-- 2. CREATE signature_submissions TABLE
-- =============================================================================
-- Tracks individual signature requests/submissions

CREATE TABLE IF NOT EXISTS signature_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  imo_id UUID REFERENCES imos(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES signature_templates(id) ON DELETE RESTRICT,

  -- DocuSeal integration
  docuseal_submission_id INTEGER, -- DocuSeal's submission ID

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'declined', 'expired', 'voided'

  -- Participants
  initiated_by UUID REFERENCES user_profiles(id),
  target_user_id UUID REFERENCES user_profiles(id), -- Primary signer (e.g., the recruit)

  -- Checklist integration
  checklist_progress_id UUID REFERENCES recruit_checklist_progress(id) ON DELETE SET NULL,

  -- Completed document storage
  audit_log_url TEXT,
  combined_document_url TEXT,

  -- Timestamps
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES user_profiles(id),
  voided_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE signature_submissions IS
  'Individual signature requests sent for signing via DocuSeal';
COMMENT ON COLUMN signature_submissions.status IS
  'Current status: pending, in_progress, completed, declined, expired, voided';
COMMENT ON COLUMN signature_submissions.checklist_progress_id IS
  'Links submission to a recruit checklist item for pipeline integration';
COMMENT ON COLUMN signature_submissions.audit_log_url IS
  'URL to the DocuSeal audit trail for legal compliance';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_submissions_agency ON signature_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_signature_submissions_imo ON signature_submissions(imo_id);
CREATE INDEX IF NOT EXISTS idx_signature_submissions_template ON signature_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_signature_submissions_target_user ON signature_submissions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_signature_submissions_status ON signature_submissions(status);
CREATE INDEX IF NOT EXISTS idx_signature_submissions_checklist ON signature_submissions(checklist_progress_id);
CREATE INDEX IF NOT EXISTS idx_signature_submissions_docuseal ON signature_submissions(docuseal_submission_id);

-- =============================================================================
-- 3. CREATE signature_submitters TABLE
-- =============================================================================
-- Tracks individual signers within a submission

CREATE TABLE IF NOT EXISTS signature_submitters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES signature_submissions(id) ON DELETE CASCADE,

  -- User information
  user_id UUID REFERENCES user_profiles(id),
  docuseal_submitter_id INTEGER, -- DocuSeal's submitter ID

  -- Signer details
  role TEXT NOT NULL, -- 'recruit', 'recruiter', 'agency_owner', 'witness', 'custom'
  email TEXT NOT NULL,
  name TEXT,

  -- Signing configuration
  signing_order INTEGER DEFAULT 0, -- For sequential signing

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'opened', 'completed', 'declined'

  -- Embedded signing
  embed_url TEXT, -- URL for embedded signing experience
  embed_url_expires_at TIMESTAMPTZ,

  -- Completion details
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,

  -- Audit information (for legal compliance)
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE signature_submitters IS
  'Individual signers within a signature submission';
COMMENT ON COLUMN signature_submitters.role IS
  'Role of signer: recruit, recruiter, agency_owner, witness, custom';
COMMENT ON COLUMN signature_submitters.embed_url IS
  'DocuSeal embed URL for in-app signing experience';
COMMENT ON COLUMN signature_submitters.ip_address IS
  'IP address captured for legal audit trail';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_submitters_submission ON signature_submitters(submission_id);
CREATE INDEX IF NOT EXISTS idx_signature_submitters_user ON signature_submitters(user_id);
CREATE INDEX IF NOT EXISTS idx_signature_submitters_status ON signature_submitters(status);
CREATE INDEX IF NOT EXISTS idx_signature_submitters_email ON signature_submitters(email);

-- =============================================================================
-- 4. CREATE updated_at TRIGGERS
-- =============================================================================

-- Trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_signature_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
DROP TRIGGER IF EXISTS signature_templates_updated_at ON signature_templates;
CREATE TRIGGER signature_templates_updated_at
  BEFORE UPDATE ON signature_templates
  FOR EACH ROW EXECUTE FUNCTION update_signature_updated_at();

DROP TRIGGER IF EXISTS signature_submissions_updated_at ON signature_submissions;
CREATE TRIGGER signature_submissions_updated_at
  BEFORE UPDATE ON signature_submissions
  FOR EACH ROW EXECUTE FUNCTION update_signature_updated_at();

DROP TRIGGER IF EXISTS signature_submitters_updated_at ON signature_submitters;
CREATE TRIGGER signature_submitters_updated_at
  BEFORE UPDATE ON signature_submitters
  FOR EACH ROW EXECUTE FUNCTION update_signature_updated_at();

-- =============================================================================
-- 5. ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE signature_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_submitters ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. RLS POLICIES FOR signature_templates
-- =============================================================================

-- Super admins: full access
CREATE POLICY "Super admins can manage all signature_templates"
  ON signature_templates
  TO authenticated
  USING (is_super_admin());

-- IMO admins: full access within their IMO
CREATE POLICY "IMO admins can view signature_templates in own IMO"
  ON signature_templates FOR SELECT
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can insert signature_templates in own IMO"
  ON signature_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can update signature_templates in own IMO"
  ON signature_templates FOR UPDATE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can delete signature_templates in own IMO"
  ON signature_templates FOR DELETE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- Agency owners: manage templates for their agency
CREATE POLICY "Agency owners can view signature_templates in own agency"
  ON signature_templates FOR SELECT
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can insert signature_templates in own agency"
  ON signature_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can update signature_templates in own agency"
  ON signature_templates FOR UPDATE
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can delete signature_templates in own agency"
  ON signature_templates FOR DELETE
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

-- Recruiters: view active templates in their agency
CREATE POLICY "Recruiters can view active signature_templates in own agency"
  ON signature_templates FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND agency_id = get_my_agency_id()
    AND imo_id = get_my_imo_id()
  );

-- =============================================================================
-- 7. RLS POLICIES FOR signature_submissions
-- =============================================================================

-- Super admins: full access
CREATE POLICY "Super admins can manage all signature_submissions"
  ON signature_submissions
  TO authenticated
  USING (is_super_admin());

-- IMO admins: full access within their IMO
CREATE POLICY "IMO admins can view signature_submissions in own IMO"
  ON signature_submissions FOR SELECT
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can insert signature_submissions in own IMO"
  ON signature_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can update signature_submissions in own IMO"
  ON signature_submissions FOR UPDATE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can delete signature_submissions in own IMO"
  ON signature_submissions FOR DELETE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- Agency owners: manage submissions for their agency
CREATE POLICY "Agency owners can view signature_submissions in own agency"
  ON signature_submissions FOR SELECT
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can insert signature_submissions in own agency"
  ON signature_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can update signature_submissions in own agency"
  ON signature_submissions FOR UPDATE
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

-- Recruiters: manage submissions for their recruits
CREATE POLICY "Recruiters can view signature_submissions for their recruits"
  ON signature_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = signature_submissions.target_user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can insert signature_submissions for their recruits"
  ON signature_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = target_user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update signature_submissions for their recruits"
  ON signature_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = signature_submissions.target_user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- Users: view their own submissions
CREATE POLICY "Users can view their own signature_submissions"
  ON signature_submissions FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid() OR initiated_by = auth.uid());

-- =============================================================================
-- 8. RLS POLICIES FOR signature_submitters
-- =============================================================================

-- Super admins: full access
CREATE POLICY "Super admins can manage all signature_submitters"
  ON signature_submitters
  TO authenticated
  USING (is_super_admin());

-- IMO admins: access through submission relationship
CREATE POLICY "IMO admins can view signature_submitters in own IMO"
  ON signature_submitters FOR SELECT
  TO authenticated
  USING (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

CREATE POLICY "IMO admins can insert signature_submitters in own IMO"
  ON signature_submitters FOR INSERT
  TO authenticated
  WITH CHECK (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = submission_id
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

CREATE POLICY "IMO admins can update signature_submitters in own IMO"
  ON signature_submitters FOR UPDATE
  TO authenticated
  USING (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

CREATE POLICY "IMO admins can delete signature_submitters in own IMO"
  ON signature_submitters FOR DELETE
  TO authenticated
  USING (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

-- Agency owners: access through submission relationship
CREATE POLICY "Agency owners can view signature_submitters in own agency"
  ON signature_submitters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND is_agency_owner_of(signature_submissions.agency_id)
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

CREATE POLICY "Agency owners can insert signature_submitters in own agency"
  ON signature_submitters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = submission_id
      AND is_agency_owner_of(signature_submissions.agency_id)
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

CREATE POLICY "Agency owners can update signature_submitters in own agency"
  ON signature_submitters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM signature_submissions
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND is_agency_owner_of(signature_submissions.agency_id)
      AND signature_submissions.imo_id = get_my_imo_id()
    )
  );

-- Recruiters: access through submission relationship
CREATE POLICY "Recruiters can view signature_submitters for their recruits"
  ON signature_submitters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM signature_submissions
      JOIN user_profiles ON user_profiles.id = signature_submissions.target_user_id
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can insert signature_submitters for their recruits"
  ON signature_submitters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM signature_submissions
      JOIN user_profiles ON user_profiles.id = signature_submissions.target_user_id
      WHERE signature_submissions.id = submission_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update signature_submitters for their recruits"
  ON signature_submitters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM signature_submissions
      JOIN user_profiles ON user_profiles.id = signature_submissions.target_user_id
      WHERE signature_submissions.id = signature_submitters.submission_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- Users: view their own submitter records
CREATE POLICY "Users can view their own signature_submitters"
  ON signature_submitters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own submitter records (for marking as signed)
CREATE POLICY "Users can update their own signature_submitters"
  ON signature_submitters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 9. VERIFICATION
-- =============================================================================

DO $$
DECLARE
  v_templates_exists BOOLEAN;
  v_submissions_exists BOOLEAN;
  v_submitters_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'signature_templates'
  ) INTO v_templates_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'signature_submissions'
  ) INTO v_submissions_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'signature_submitters'
  ) INTO v_submitters_exists;

  IF v_templates_exists AND v_submissions_exists AND v_submitters_exists THEN
    RAISE NOTICE 'Migration successful: All signature tables created';
  ELSE
    RAISE EXCEPTION 'Migration failed: Not all tables were created properly';
  END IF;
END $$;
