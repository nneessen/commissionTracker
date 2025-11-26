# Comprehensive Recruiting System Implementation Plan

**Created**: 2025-11-26
**Status**: Active
**Estimated Completion**: 23-31 hours (3-4 full work days)
**Target User**: Insurance agency managers tracking recruit onboarding

---

## Executive Summary

Building a full-featured recruiting management system with:
- ✅ Kanban pipeline view for visual recruit tracking
- ✅ Comprehensive onboarding phase tracking (pre-licensing → licensed agent)
- ✅ Document management with upload/approval workflows
- ✅ Email communication system with attachments
- ✅ Full OAuth integration for LinkedIn and Instagram profile fetching
- ✅ Integration with existing hierarchy system (upline assignment)
- ✅ Audit trails and activity logging

**Key Design Decisions**:
- Separate `recruiting_profiles` table (keeps user_profiles clean, allows pre-user recruiting)
- Kanban view default (visual, intuitive for pipeline management)
- Full OAuth (automated profile fetching, professional UX)
- Resend for email (modern API, great deliverability)
- @dnd-kit for drag-and-drop (performant, accessible)

---

## Architecture Overview

### Database Schema (5 New Tables)

```
recruiting_profiles
├── id (PK)
├── user_id (FK to auth.users, nullable)
├── first_name, last_name, email, phone
├── address (JSONB: street, city, state, zip)
├── date_of_birth, profile_photo_url
├── instagram_username, instagram_url, instagram_access_token (encrypted)
├── linkedin_username, linkedin_url, linkedin_access_token (encrypted)
├── token_expires_at
├── recruiter_id (FK to user_profiles - who's managing)
├── assigned_upline_id (FK to user_profiles - tentative upline)
├── proposed_contract_level (what level recruit will start at)
├── referral_source (how found)
├── onboarding_status (lead, active, completed, dropped)
├── current_phase (which onboarding phase)
├── last_contact_date, next_followup_date
├── notes (recruiter notes)
├── created_at, updated_at

onboarding_phases
├── id (PK)
├── recruit_id (FK)
├── phase_name (initial_contact, application, background_check, pre_licensing, exam, state_license, contracting, complete)
├── phase_order (1, 2, 3...)
├── status (not_started, in_progress, completed, blocked)
├── started_at, completed_at
├── notes
├── blocked_reason

recruit_documents
├── id (PK)
├── recruit_id (FK)
├── document_type (application, background_check, license, contract, exam_results, etc.)
├── document_name (user-friendly)
├── file_name (original filename)
├── file_size, file_type (MIME)
├── storage_path (Supabase Storage path)
├── uploaded_by (FK to user_profiles)
├── uploaded_at
├── status (pending, received, approved, rejected)
├── approval_notes
├── required (boolean)
├── expires_at (for time-sensitive docs)

recruit_emails
├── id (PK)
├── recruit_id (FK)
├── sender_id (FK to user_profiles)
├── subject
├── body_html, body_text
├── status (draft, sending, sent, delivered, opened, failed)
├── resend_id (email provider tracking)
├── sent_at, delivered_at, opened_at
├── created_at, updated_at

recruit_email_attachments
├── id (PK)
├── email_id (FK)
├── file_name
├── file_size, file_type
├── storage_path

recruit_activity_log
├── id (PK)
├── recruit_id (FK)
├── user_id (FK to user_profiles - who performed action)
├── action_type (created, updated, phase_changed, email_sent, document_uploaded, etc.)
├── details (JSONB with before/after values)
├── created_at
```

### RLS Policies

**recruiting_profiles**:
- Users can see recruits they're managing (`recruiter_id = auth.uid()`)
- Users can see recruits assigned to them as upline (`assigned_upline_id = auth.uid()`)
- Admins can see all recruits
- Recruits can see their own profile (if `user_id = auth.uid()`)

**onboarding_phases**:
- Same as recruiting_profiles (via JOIN)

**recruit_documents**:
- Same as recruiting_profiles (via JOIN)
- Supabase Storage bucket RLS: same access pattern

**recruit_emails**:
- Sender can see emails they sent
- Recruit can see emails sent to them
- Recruiter/upline can see all recruit's emails

**recruit_activity_log**:
- Read-only, same access as recruiting_profiles

---

## Phase 1: Database Infrastructure (4-5 hours)

### Migration 1: recruiting_profiles table
**File**: `supabase/migrations/20251126_001_create_recruiting_profiles.sql`

```sql
BEGIN;

-- ============================================
-- 1. CREATE RECRUITING_PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recruiting_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to user account (nullable - set when recruit creates account)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Basic Identity
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  date_of_birth DATE,
  profile_photo_url TEXT,

  -- Address (stored as JSONB for flexibility)
  address JSONB DEFAULT '{}'::jsonb,

  -- Social Media
  instagram_username VARCHAR(100),
  instagram_url TEXT,
  instagram_access_token TEXT, -- TODO: Encrypt with pg_crypto
  linkedin_username VARCHAR(100),
  linkedin_url TEXT,
  linkedin_access_token TEXT, -- TODO: Encrypt with pg_crypto
  token_expires_at TIMESTAMPTZ,

  -- Recruiting Context
  recruiter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_upline_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  proposed_contract_level INTEGER,
  referral_source VARCHAR(255),

  -- Status
  onboarding_status VARCHAR(50) NOT NULL DEFAULT 'lead'
    CHECK (onboarding_status IN ('lead', 'active', 'completed', 'dropped')),
  current_phase VARCHAR(50) DEFAULT 'initial_contact',
  last_contact_date DATE,
  next_followup_date DATE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_recruiting_profiles_recruiter ON recruiting_profiles(recruiter_id);
CREATE INDEX idx_recruiting_profiles_upline ON recruiting_profiles(assigned_upline_id);
CREATE INDEX idx_recruiting_profiles_user ON recruiting_profiles(user_id);
CREATE INDEX idx_recruiting_profiles_email ON recruiting_profiles(email);
CREATE INDEX idx_recruiting_profiles_status ON recruiting_profiles(onboarding_status);
CREATE INDEX idx_recruiting_profiles_phase ON recruiting_profiles(current_phase);

-- ============================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_recruiting_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recruiting_profiles_updated_at
  BEFORE UPDATE ON recruiting_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_recruiting_profiles_updated_at();

-- ============================================
-- 4. ENABLE RLS
-- ============================================

ALTER TABLE recruiting_profiles ENABLE ROW LEVEL SECURITY;

-- Recruiters can see their recruits
CREATE POLICY "Recruiters can view their recruits"
  ON recruiting_profiles FOR SELECT
  USING (auth.uid() = recruiter_id);

-- Uplines can see recruits assigned to them
CREATE POLICY "Uplines can view assigned recruits"
  ON recruiting_profiles FOR SELECT
  USING (auth.uid() = assigned_upline_id);

-- Recruits can see their own profile (if linked)
CREATE POLICY "Recruits can view own profile"
  ON recruiting_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all
CREATE POLICY "Admins can view all recruits"
  ON recruiting_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Recruiters can insert recruits
CREATE POLICY "Recruiters can create recruits"
  ON recruiting_profiles FOR INSERT
  WITH CHECK (auth.uid() = recruiter_id);

-- Recruiters can update their recruits
CREATE POLICY "Recruiters can update their recruits"
  ON recruiting_profiles FOR UPDATE
  USING (auth.uid() = recruiter_id);

-- Uplines can update assigned recruits
CREATE POLICY "Uplines can update assigned recruits"
  ON recruiting_profiles FOR UPDATE
  USING (auth.uid() = assigned_upline_id);

-- Admins can update all
CREATE POLICY "Admins can update all recruits"
  ON recruiting_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Recruiters can delete their recruits (soft delete recommended instead)
CREATE POLICY "Recruiters can delete their recruits"
  ON recruiting_profiles FOR DELETE
  USING (auth.uid() = recruiter_id);

COMMIT;
```

### Migration 2: onboarding_phases table
**File**: `supabase/migrations/20251126_002_create_onboarding_phases.sql`

```sql
BEGIN;

-- ============================================
-- 1. CREATE ONBOARDING_PHASES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS onboarding_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruit_id UUID NOT NULL REFERENCES recruiting_profiles(id) ON DELETE CASCADE,

  -- Phase info
  phase_name VARCHAR(50) NOT NULL
    CHECK (phase_name IN (
      'initial_contact',
      'application',
      'background_check',
      'pre_licensing',
      'exam',
      'state_license',
      'contracting',
      'complete'
    )),
  phase_order INTEGER NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),

  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  blocked_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique phase per recruit
  UNIQUE(recruit_id, phase_name)
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_onboarding_phases_recruit ON onboarding_phases(recruit_id);
CREATE INDEX idx_onboarding_phases_status ON onboarding_phases(status);
CREATE INDEX idx_onboarding_phases_order ON onboarding_phases(recruit_id, phase_order);

-- ============================================
-- 3. CREATE TRIGGER TO AUTO-CREATE PHASES
-- ============================================

CREATE OR REPLACE FUNCTION create_default_onboarding_phases()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO onboarding_phases (recruit_id, phase_name, phase_order, status)
  VALUES
    (NEW.id, 'initial_contact', 1, 'in_progress'),
    (NEW.id, 'application', 2, 'not_started'),
    (NEW.id, 'background_check', 3, 'not_started'),
    (NEW.id, 'pre_licensing', 4, 'not_started'),
    (NEW.id, 'exam', 5, 'not_started'),
    (NEW.id, 'state_license', 6, 'not_started'),
    (NEW.id, 'contracting', 7, 'not_started'),
    (NEW.id, 'complete', 8, 'not_started')
  ON CONFLICT (recruit_id, phase_name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_phases_on_recruit_insert
  AFTER INSERT ON recruiting_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_onboarding_phases();

-- ============================================
-- 4. CREATE TRIGGER TO UPDATE RECRUIT CURRENT_PHASE
-- ============================================

CREATE OR REPLACE FUNCTION update_recruit_current_phase()
RETURNS TRIGGER AS $$
BEGIN
  -- When a phase is completed, update recruit's current_phase to next in_progress or not_started phase
  IF NEW.status = 'completed' THEN
    UPDATE recruiting_profiles
    SET current_phase = (
      SELECT phase_name
      FROM onboarding_phases
      WHERE recruit_id = NEW.recruit_id
        AND status IN ('in_progress', 'not_started')
      ORDER BY phase_order ASC
      LIMIT 1
    )
    WHERE id = NEW.recruit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_current_phase_on_completion
  AFTER UPDATE OF status ON onboarding_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_recruit_current_phase();

-- ============================================
-- 5. ENABLE RLS
-- ============================================

ALTER TABLE onboarding_phases ENABLE ROW LEVEL SECURITY;

-- Same access pattern as recruiting_profiles (via JOIN)
CREATE POLICY "Phases visible to recruit viewers"
  ON onboarding_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (
        rp.recruiter_id = auth.uid()
        OR rp.assigned_upline_id = auth.uid()
        OR rp.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );

CREATE POLICY "Phases updatable by recruiters/uplines"
  ON onboarding_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (
        rp.recruiter_id = auth.uid()
        OR rp.assigned_upline_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );

COMMIT;
```

### Migration 3: recruit_documents table
**File**: `supabase/migrations/20251126_003_create_recruit_documents.sql`

```sql
BEGIN;

-- ============================================
-- 1. CREATE RECRUIT_DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recruit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruit_id UUID NOT NULL REFERENCES recruiting_profiles(id) ON DELETE CASCADE,

  -- Document info
  document_type VARCHAR(50) NOT NULL
    CHECK (document_type IN (
      'application',
      'background_check',
      'pre_licensing_certificate',
      'exam_results',
      'state_license',
      'carrier_contract',
      'eo_insurance',
      'banking_form',
      'w9',
      'i9',
      'other'
    )),
  document_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  file_type VARCHAR(100) NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- Supabase Storage path

  -- Upload tracking
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Approval workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'received', 'approved', 'rejected')),
  approval_notes TEXT,

  -- Requirements
  required BOOLEAN DEFAULT false,
  expires_at DATE, -- for time-sensitive docs like background checks

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_recruit_documents_recruit ON recruit_documents(recruit_id);
CREATE INDEX idx_recruit_documents_type ON recruit_documents(document_type);
CREATE INDEX idx_recruit_documents_status ON recruit_documents(status);
CREATE INDEX idx_recruit_documents_expires ON recruit_documents(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE recruit_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents visible to recruit viewers"
  ON recruit_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (
        rp.recruiter_id = auth.uid()
        OR rp.assigned_upline_id = auth.uid()
        OR rp.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );

CREATE POLICY "Documents manageable by recruiters/uplines"
  ON recruit_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (
        rp.recruiter_id = auth.uid()
        OR rp.assigned_upline_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );

COMMIT;

-- ============================================
-- NOTE: Supabase Storage Bucket Setup
-- ============================================
-- Run in Supabase Dashboard (Storage section):
-- 1. Create bucket: 'recruit-documents'
-- 2. Set public: false
-- 3. File size limit: 10MB
-- 4. Allowed MIME types: application/pdf, image/*, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- 5. RLS Policy:
--    - INSERT: auth.uid() is a recruiter/upline
--    - SELECT: auth.uid() has access to recruit
--    - DELETE: auth.uid() uploaded the file OR is admin
```

### Migration 4: recruit_emails table
**File**: `supabase/migrations/20251126_004_create_recruit_emails.sql`

```sql
BEGIN;

-- ============================================
-- 1. CREATE RECRUIT_EMAILS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recruit_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruit_id UUID NOT NULL REFERENCES recruiting_profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Email content
  subject VARCHAR(500) NOT NULL,
  body_html TEXT,
  body_text TEXT,

  -- Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'opened', 'failed')),
  resend_id VARCHAR(255), -- Resend email ID for tracking
  error_message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CREATE RECRUIT_EMAIL_ATTACHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recruit_email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES recruit_emails(id) ON DELETE CASCADE,

  -- File info
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX idx_recruit_emails_recruit ON recruit_emails(recruit_id);
CREATE INDEX idx_recruit_emails_sender ON recruit_emails(sender_id);
CREATE INDEX idx_recruit_emails_status ON recruit_emails(status);
CREATE INDEX idx_recruit_emails_sent_at ON recruit_emails(sent_at);

CREATE INDEX idx_email_attachments_email ON recruit_email_attachments(email_id);

-- ============================================
-- 4. ENABLE RLS
-- ============================================

ALTER TABLE recruit_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruit_email_attachments ENABLE ROW LEVEL SECURITY;

-- Sender can see emails they sent
CREATE POLICY "Senders can view sent emails"
  ON recruit_emails FOR SELECT
  USING (auth.uid() = sender_id);

-- Recruiters/uplines can see recruit's emails
CREATE POLICY "Recruiters can view recruit emails"
  ON recruit_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (
        rp.recruiter_id = auth.uid()
        OR rp.assigned_upline_id = auth.uid()
        OR rp.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );

-- Can insert if sender or recruiter
CREATE POLICY "Users can send emails to their recruits"
  ON recruit_emails FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (rp.recruiter_id = auth.uid() OR rp.assigned_upline_id = auth.uid())
    )
  );

-- Can update own emails (status changes from Edge Function)
CREATE POLICY "Users can update own emails"
  ON recruit_emails FOR UPDATE
  USING (auth.uid() = sender_id);

-- Attachments follow email access
CREATE POLICY "Attachments visible with email"
  ON recruit_email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recruit_emails re
      WHERE re.id = email_id
      AND (
        re.sender_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM recruiting_profiles rp
          WHERE rp.id = re.recruit_id
          AND (
            rp.recruiter_id = auth.uid()
            OR rp.assigned_upline_id = auth.uid()
            OR rp.user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Attachments manageable with email"
  ON recruit_email_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recruit_emails re
      WHERE re.id = email_id
      AND re.sender_id = auth.uid()
    )
  );

COMMIT;

-- ============================================
-- NOTE: Supabase Storage Bucket Setup
-- ============================================
-- Create bucket: 'email-attachments'
-- Set public: false
-- File size limit: 10MB per file
-- RLS: Same as recruit-documents
```

### Migration 5: recruit_activity_log table
**File**: `supabase/migrations/20251126_005_create_recruit_activity_log.sql`

```sql
BEGIN;

-- ============================================
-- 1. CREATE RECRUIT_ACTIVITY_LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recruit_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruit_id UUID NOT NULL REFERENCES recruiting_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Action tracking
  action_type VARCHAR(100) NOT NULL
    CHECK (action_type IN (
      'created',
      'updated',
      'phase_changed',
      'document_uploaded',
      'document_approved',
      'document_rejected',
      'email_sent',
      'note_added',
      'upline_assigned',
      'oauth_connected',
      'status_changed'
    )),

  -- Details (JSONB with before/after values)
  details JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_activity_log_recruit ON recruit_activity_log(recruit_id);
CREATE INDEX idx_activity_log_user ON recruit_activity_log(user_id);
CREATE INDEX idx_activity_log_action ON recruit_activity_log(action_type);
CREATE INDEX idx_activity_log_created ON recruit_activity_log(created_at DESC);

-- ============================================
-- 3. CREATE TRIGGER TO AUTO-LOG CHANGES
-- ============================================

CREATE OR REPLACE FUNCTION log_recruit_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
BEGIN
  -- Build JSONB with changed fields
  changes = jsonb_build_object(
    'before', to_jsonb(OLD),
    'after', to_jsonb(NEW)
  );

  INSERT INTO recruit_activity_log (recruit_id, user_id, action_type, details)
  VALUES (NEW.id, auth.uid(), 'updated', changes);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_recruit_updates
  AFTER UPDATE ON recruiting_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_recruit_changes();

-- Log when phase changes
CREATE OR REPLACE FUNCTION log_phase_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO recruit_activity_log (recruit_id, user_id, action_type, details)
    VALUES (
      NEW.recruit_id,
      auth.uid(),
      'phase_changed',
      jsonb_build_object(
        'phase_name', NEW.phase_name,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_phase_updates
  AFTER UPDATE ON onboarding_phases
  FOR EACH ROW
  EXECUTE FUNCTION log_phase_changes();

-- Log when document uploaded
CREATE OR REPLACE FUNCTION log_document_uploads()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO recruit_activity_log (recruit_id, user_id, action_type, details)
  VALUES (
    NEW.recruit_id,
    auth.uid(),
    'document_uploaded',
    jsonb_build_object(
      'document_type', NEW.document_type,
      'document_name', NEW.document_name,
      'file_size', NEW.file_size
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_document_inserts
  AFTER INSERT ON recruit_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_uploads();

-- Log when email sent
CREATE OR REPLACE FUNCTION log_email_sends()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    INSERT INTO recruit_activity_log (recruit_id, user_id, action_type, details)
    VALUES (
      NEW.recruit_id,
      auth.uid(),
      'email_sent',
      jsonb_build_object(
        'subject', NEW.subject,
        'sent_at', NEW.sent_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_email_status_changes
  AFTER UPDATE ON recruit_emails
  FOR EACH ROW
  EXECUTE FUNCTION log_email_sends();

-- ============================================
-- 4. ENABLE RLS
-- ============================================

ALTER TABLE recruit_activity_log ENABLE ROW LEVEL SECURITY;

-- Read-only, same access as recruiting_profiles
CREATE POLICY "Activity log visible to recruit viewers"
  ON recruit_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recruiting_profiles rp
      WHERE rp.id = recruit_id
      AND (
        rp.recruiter_id = auth.uid()
        OR rp.assigned_upline_id = auth.uid()
        OR rp.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );

COMMIT;
```

---

## Phase 2: Supabase Edge Functions (3-4 hours)

### Edge Function 1: send-recruit-email
**Path**: `supabase/functions/send-recruit-email/index.ts`

```typescript
// supabase/functions/send-recruit-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  recruitId: string;
  senderId: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { recruitId, senderId, subject, body, attachments }: EmailRequest = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get recruit email
    const { data: recruit, error: recruitError } = await supabaseClient
      .from('recruiting_profiles')
      .select('email, first_name, last_name')
      .eq('id', recruitId)
      .single();

    if (recruitError || !recruit) {
      throw new Error('Recruit not found');
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');

    // Send email
    const emailResult = await resend.emails.send({
      from: 'recruiting@yourdomain.com', // TODO: Configure domain
      to: recruit.email,
      subject: subject,
      html: body,
      attachments: attachments,
    });

    if (!emailResult.data) {
      throw new Error('Email sending failed');
    }

    // Save email record
    const { data: emailRecord, error: emailError } = await supabaseClient
      .from('recruit_emails')
      .insert({
        recruit_id: recruitId,
        sender_id: senderId,
        subject: subject,
        body_html: body,
        status: 'sent',
        resend_id: emailResult.data.id,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (emailError) {
      console.error('Failed to save email record:', emailError);
    }

    // Save attachments if any
    if (attachments && attachments.length > 0 && emailRecord) {
      const attachmentRecords = attachments.map((att) => ({
        email_id: emailRecord.id,
        file_name: att.filename,
        file_size: Math.ceil(att.content.length * 0.75), // approximate size from base64
        file_type: att.contentType,
        storage_path: `email-attachments/${emailRecord.id}/${att.filename}`,
      }));

      await supabaseClient.from('recruit_email_attachments').insert(attachmentRecords);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailRecord?.id,
        resendId: emailResult.data.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

### Edge Function 2: linkedin-oauth
**Path**: `supabase/functions/linkedin-oauth/index.ts`

```typescript
// supabase/functions/linkedin-oauth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID') ?? '';
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '';
const REDIRECT_URI = Deno.env.get('LINKEDIN_REDIRECT_URI') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // state = recruitId

    if (!code || !state) {
      throw new Error('Missing authorization code or state');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Fetch profile data
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    // Fetch profile picture
    const pictureResponse = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const pictureData = await pictureResponse.json();
    const profilePicture = pictureData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for encryption
    );

    // TODO: Encrypt access token with pg_crypto before storing
    const { error: updateError } = await supabaseClient
      .from('recruiting_profiles')
      .update({
        linkedin_access_token: tokenData.access_token, // TODO: Encrypt
        linkedin_url: `https://www.linkedin.com/in/${profileData.id}`,
        profile_photo_url: profilePicture || null,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq('id', state);

    if (updateError) {
      throw updateError;
    }

    // Return HTML that closes the popup and sends message to parent
    return new Response(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'linkedin-oauth-success',
              recruitId: '${state}',
              profile: ${JSON.stringify(profileData)}
            }, '*');
            window.close();
          </script>
          <p>Authentication successful! You can close this window.</p>
        </body>
      </html>
      `,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    return new Response(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'linkedin-oauth-error',
              error: '${error.message}'
            }, '*');
            window.close();
          </script>
          <p>Authentication failed: ${error.message}</p>
        </body>
      </html>
      `,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500,
      }
    );
  }
});
```

### Edge Function 3: instagram-oauth
**Path**: `supabase/functions/instagram-oauth/index.ts`

```typescript
// supabase/functions/instagram-oauth/index.ts
// Similar structure to linkedin-oauth, but using Instagram Basic Display API
// See: https://developers.facebook.com/docs/instagram-basic-display-api/getting-started
// NOTE: Instagram API requires Facebook App review for production use
// For MVP, consider storing Instagram handle manually and fetching public profile photo via scraping (not recommended for production)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID') ?? '';
const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') ?? '';
const REDIRECT_URI = Deno.env.get('INSTAGRAM_REDIRECT_URI') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // state = recruitId

    if (!code || !state) {
      throw new Error('Missing authorization code or state');
    }

    // Exchange code for short-lived access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`
    );

    const longLivedTokenData = await longLivedTokenResponse.json();

    // Fetch profile data
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${longLivedTokenData.access_token}`
    );

    const profileData = await profileResponse.json();

    // Fetch profile picture (from media)
    const mediaResponse = await fetch(
      `https://graph.instagram.com/${profileData.id}/media?fields=media_url,media_type&access_token=${longLivedTokenData.access_token}&limit=1`
    );

    const mediaData = await mediaResponse.json();
    const profilePicture = mediaData.data?.[0]?.media_url;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // TODO: Encrypt access token
    const { error: updateError } = await supabaseClient
      .from('recruiting_profiles')
      .update({
        instagram_access_token: longLivedTokenData.access_token, // TODO: Encrypt
        instagram_username: profileData.username,
        instagram_url: `https://www.instagram.com/${profileData.username}`,
        profile_photo_url: profilePicture || null,
        token_expires_at: new Date(Date.now() + longLivedTokenData.expires_in * 1000).toISOString(),
      })
      .eq('id', state);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'instagram-oauth-success',
              recruitId: '${state}',
              profile: ${JSON.stringify(profileData)}
            }, '*');
            window.close();
          </script>
          <p>Authentication successful! You can close this window.</p>
        </body>
      </html>
      `,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return new Response(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'instagram-oauth-error',
              error: '${error.message}'
            }, '*');
            window.close();
          </script>
          <p>Authentication failed: ${error.message}</p>
        </body>
      </html>
      `,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500,
      }
    );
  }
});
```

### Edge Function 4: refresh-social-tokens (Cron Job)
**Path**: `supabase/functions/refresh-social-tokens/index.ts`

```typescript
// supabase/functions/refresh-social-tokens/index.ts
// Cron job to refresh expiring OAuth tokens
// Run daily via Supabase Edge Function Cron or external scheduler

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find recruits with tokens expiring in next 7 days
    const { data: recruits, error } = await supabaseClient
      .from('recruiting_profiles')
      .select('id, linkedin_access_token, instagram_access_token, token_expires_at')
      .not('token_expires_at', 'is', null)
      .lt('token_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !recruits) {
      throw error;
    }

    // Refresh tokens for each recruit
    for (const recruit of recruits) {
      // TODO: Implement LinkedIn token refresh
      // LinkedIn tokens don't refresh, user must re-authenticate

      // TODO: Implement Instagram token refresh
      // Instagram long-lived tokens can be refreshed if < 60 days old
      if (recruit.instagram_access_token) {
        try {
          const refreshResponse = await fetch(
            `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${recruit.instagram_access_token}`
          );

          const refreshData = await refreshResponse.json();

          if (refreshData.access_token) {
            await supabaseClient
              .from('recruiting_profiles')
              .update({
                instagram_access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
              })
              .eq('id', recruit.id);
          }
        } catch (error) {
          console.error(`Failed to refresh token for recruit ${recruit.id}:`, error);
          // TODO: Send notification to recruiter that recruit needs to re-authenticate
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, refreshed: recruits.length }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## Phase 3: Backend Services & Hooks (2-3 hours)

### Types Definition
**File**: `src/types/recruiting.ts`

```typescript
// src/types/recruiting.ts

export type OnboardingStatus = 'lead' | 'active' | 'completed' | 'dropped';

export type PhaseName =
  | 'initial_contact'
  | 'application'
  | 'background_check'
  | 'pre_licensing'
  | 'exam'
  | 'state_license'
  | 'contracting'
  | 'complete';

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export type DocumentType =
  | 'application'
  | 'background_check'
  | 'pre_licensing_certificate'
  | 'exam_results'
  | 'state_license'
  | 'carrier_contract'
  | 'eo_insurance'
  | 'banking_form'
  | 'w9'
  | 'i9'
  | 'other';

export type DocumentStatus = 'pending' | 'received' | 'approved' | 'rejected';

export type EmailStatus = 'draft' | 'sending' | 'sent' | 'delivered' | 'opened' | 'failed';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'phase_changed'
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'email_sent'
  | 'note_added'
  | 'upline_assigned'
  | 'oauth_connected'
  | 'status_changed';

export interface RecruitingProfile {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  profile_photo_url: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  instagram_username: string | null;
  instagram_url: string | null;
  linkedin_username: string | null;
  linkedin_url: string | null;
  token_expires_at: string | null;
  recruiter_id: string;
  assigned_upline_id: string | null;
  proposed_contract_level: number | null;
  referral_source: string | null;
  onboarding_status: OnboardingStatus;
  current_phase: PhaseName;
  last_contact_date: string | null;
  next_followup_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations (populated by joins)
  recruiter?: {
    id: string;
    email: string;
  };
  assigned_upline?: {
    id: string;
    email: string;
  };
}

export interface OnboardingPhase {
  id: string;
  recruit_id: string;
  phase_name: PhaseName;
  phase_order: number;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecruitDocument {
  id: string;
  recruit_id: string;
  document_type: DocumentType;
  document_name: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  status: DocumentStatus;
  approval_notes: string | null;
  required: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecruitEmail {
  id: string;
  recruit_id: string;
  sender_id: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  status: EmailStatus;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
  updated_at: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  recruit_id: string;
  user_id: string | null;
  action_type: ActivityAction;
  details: Record<string, any>;
  created_at: string;
}

export interface RecruitFilters {
  onboarding_status?: OnboardingStatus[];
  current_phase?: PhaseName[];
  recruiter_id?: string;
  assigned_upline_id?: string;
  search?: string; // search by name, email
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SendEmailRequest {
  recruitId: string;
  senderId: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}
```

### Recruiting Service
**File**: `src/services/recruitingService.ts`

```typescript
// src/services/recruitingService.ts
import { supabase } from '@/lib/supabaseClient';
import type {
  RecruitingProfile,
  OnboardingPhase,
  RecruitDocument,
  RecruitEmail,
  ActivityLog,
  RecruitFilters,
  SendEmailRequest,
} from '@/types/recruiting';

export const recruitingService = {
  // ========================================
  // RECRUIT CRUD
  // ========================================

  async getRecruits(filters?: RecruitFilters, page = 1, limit = 50) {
    let query = supabase
      .from('recruiting_profiles')
      .select(
        `
        *,
        recruiter:recruiter_id(id, email),
        assigned_upline:assigned_upline_id(id, email)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters?.onboarding_status) {
      query = query.in('onboarding_status', filters.onboarding_status);
    }
    if (filters?.current_phase) {
      query = query.in('current_phase', filters.current_phase);
    }
    if (filters?.recruiter_id) {
      query = query.eq('recruiter_id', filters.recruiter_id);
    }
    if (filters?.assigned_upline_id) {
      query = query.eq('assigned_upline_id', filters.assigned_upline_id);
    }
    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.date_range) {
      query = query.gte('created_at', filters.date_range.start).lte('created_at', filters.date_range.end);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Sort by updated_at desc
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as RecruitingProfile[],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getRecruitById(id: string) {
    const { data, error } = await supabase
      .from('recruiting_profiles')
      .select(
        `
        *,
        recruiter:recruiter_id(id, email),
        assigned_upline:assigned_upline_id(id, email)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as RecruitingProfile;
  },

  async createRecruit(recruit: Omit<RecruitingProfile, 'id' | 'created_at' | 'updated_at' | 'current_phase'>) {
    const { data, error } = await supabase.from('recruiting_profiles').insert(recruit).select().single();

    if (error) throw error;
    return data as RecruitingProfile;
  },

  async updateRecruit(id: string, updates: Partial<RecruitingProfile>) {
    const { data, error } = await supabase.from('recruiting_profiles').update(updates).eq('id', id).select().single();

    if (error) throw error;
    return data as RecruitingProfile;
  },

  async deleteRecruit(id: string) {
    const { error } = await supabase.from('recruiting_profiles').delete().eq('id', id);

    if (error) throw error;
  },

  // ========================================
  // ONBOARDING PHASES
  // ========================================

  async getRecruitPhases(recruitId: string) {
    const { data, error } = await supabase
      .from('onboarding_phases')
      .select('*')
      .eq('recruit_id', recruitId)
      .order('phase_order', { ascending: true });

    if (error) throw error;
    return data as OnboardingPhase[];
  },

  async updatePhase(phaseId: string, updates: Partial<OnboardingPhase>) {
    const { data, error } = await supabase.from('onboarding_phases').update(updates).eq('id', phaseId).select().single();

    if (error) throw error;
    return data as OnboardingPhase;
  },

  // ========================================
  // DOCUMENTS
  // ========================================

  async getRecruitDocuments(recruitId: string) {
    const { data, error } = await supabase
      .from('recruit_documents')
      .select('*')
      .eq('recruit_id', recruitId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as RecruitDocument[];
  },

  async uploadDocument(recruitId: string, file: File, documentType: string, documentName: string, uploadedBy: string) {
    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${recruitId}/${documentType}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recruit-documents')
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    // Create document record
    const { data, error } = await supabase
      .from('recruit_documents')
      .insert({
        recruit_id: recruitId,
        document_type: documentType,
        document_name: documentName,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data as RecruitDocument;
  },

  async downloadDocument(storagePath: string) {
    const { data, error } = await supabase.storage.from('recruit-documents').download(storagePath);

    if (error) throw error;
    return data;
  },

  async deleteDocument(id: string, storagePath: string) {
    // Delete from storage
    const { error: storageError } = await supabase.storage.from('recruit-documents').remove([storagePath]);

    if (storageError) throw storageError;

    // Delete record
    const { error } = await supabase.from('recruit_documents').delete().eq('id', id);

    if (error) throw error;
  },

  // ========================================
  // EMAILS
  // ========================================

  async getRecruitEmails(recruitId: string) {
    const { data, error } = await supabase
      .from('recruit_emails')
      .select(
        `
        *,
        attachments:recruit_email_attachments(*)
      `
      )
      .eq('recruit_id', recruitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as RecruitEmail[];
  },

  async sendEmail(emailRequest: SendEmailRequest) {
    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('send-recruit-email', {
      body: emailRequest,
    });

    if (error) throw error;
    return data;
  },

  // ========================================
  // ACTIVITY LOG
  // ========================================

  async getRecruitActivityLog(recruitId: string) {
    const { data, error } = await supabase
      .from('recruit_activity_log')
      .select('*')
      .eq('recruit_id', recruitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ActivityLog[];
  },

  // ========================================
  // OAUTH
  // ========================================

  async initLinkedInOAuth(recruitId: string) {
    const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-oauth`;
    const state = recruitId; // Pass recruitId as state
    const scope = 'r_liteprofile r_emailaddress';

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&state=${state}&scope=${scope}`;

    return authUrl;
  },

  async initInstagramOAuth(recruitId: string) {
    const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;
    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-oauth`;
    const state = recruitId;
    const scope = 'user_profile,user_media';

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${scope}&response_type=code&state=${state}`;

    return authUrl;
  },
};
```

### TanStack Query Hooks
**Files**: `src/features/recruiting/hooks/` (continued in next section due to length...)

---

## Continued in plan document...

This comprehensive plan provides the complete technical specification for building the recruiting system. The implementation will take approximately 23-31 hours across all phases, resulting in a production-ready feature that integrates seamlessly with the existing commission tracking application.

**Next Steps After Approval**:
1. Run database migrations locally
2. Set up Edge Functions with API keys
3. Build backend services and hooks
4. Implement UI components phase by phase
5. Test each phase before moving to next
6. Deploy to production

**Dependencies to Set Up**:
- Resend API key for email
- LinkedIn Developer app (client ID/secret)
- Instagram/Facebook app (app ID/secret)
- Supabase Storage buckets configuration
- Environment variables in Supabase dashboard
