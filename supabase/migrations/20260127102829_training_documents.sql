-- supabase/migrations/20260127102829_training_documents.sql
-- Training Documents: Shared document library for trainers and contracting managers

-- ============================================================================
-- 1. Create training_documents table
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Document metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('training', 'underwriting', 'carrier_form', 'compliance', 'marketing', 'other')),
  tags TEXT[] DEFAULT '{}',

  -- File storage info
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,

  -- Audit fields
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for efficient queries (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_training_documents_category ON training_documents(category);
CREATE INDEX IF NOT EXISTS idx_training_documents_active ON training_documents(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_documents_uploaded_by ON training_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_training_documents_tags ON training_documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_training_documents_created_at ON training_documents(created_at DESC);

-- Enable RLS
ALTER TABLE training_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS Policies for training_documents table
-- ============================================================================

-- Helper function to check if user is staff (trainer, contracting_manager, admin)
CREATE OR REPLACE FUNCTION is_training_hub_staff(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_roles TEXT[];
  user_is_super_admin BOOLEAN;
BEGIN
  SELECT roles, is_super_admin INTO user_roles, user_is_super_admin
  FROM user_profiles
  WHERE id = user_id;

  -- Super admins always have access
  IF user_is_super_admin = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Check for staff roles
  RETURN user_roles && ARRAY['trainer', 'contracting_manager', 'admin']::TEXT[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Staff can view training documents" ON training_documents;
DROP POLICY IF EXISTS "Staff can upload training documents" ON training_documents;
DROP POLICY IF EXISTS "Uploader or admin can update training documents" ON training_documents;
DROP POLICY IF EXISTS "Uploader or admin can delete training documents" ON training_documents;
DROP POLICY IF EXISTS "Staff can update training documents" ON training_documents;
DROP POLICY IF EXISTS "Staff can delete training documents" ON training_documents;

-- SELECT: Staff can view all training documents (filter by is_active in application)
-- Note: We allow seeing inactive docs so that soft-delete RETURNING works
CREATE POLICY "Staff can view training documents"
ON training_documents FOR SELECT
TO authenticated
USING (
  is_training_hub_staff(auth.uid())
);

-- INSERT: Staff can upload training documents
CREATE POLICY "Staff can upload training documents"
ON training_documents FOR INSERT
TO authenticated
WITH CHECK (
  is_training_hub_staff(auth.uid())
  AND uploaded_by = auth.uid()
);

-- UPDATE: Any training hub staff can update documents (shared library)
-- This allows soft delete (is_active = false) by any staff member
CREATE POLICY "Staff can update training documents"
ON training_documents FOR UPDATE
TO authenticated
USING (
  is_training_hub_staff(auth.uid())
)
WITH CHECK (
  is_training_hub_staff(auth.uid())
);

-- DELETE: Any training hub staff can hard delete (rarely used, prefer soft delete)
CREATE POLICY "Staff can delete training documents"
ON training_documents FOR DELETE
TO authenticated
USING (
  is_training_hub_staff(auth.uid())
);

-- ============================================================================
-- 3. Create training-documents storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-documents',
  'training-documents',
  false,  -- Private bucket, requires signed URLs
  52428800,  -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Storage bucket RLS policies
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "training_docs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "training_docs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "training_docs_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "training_docs_storage_delete" ON storage.objects;
-- Also drop old policy names if they exist
DROP POLICY IF EXISTS "Staff can view training documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload training documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update training documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete training documents storage" ON storage.objects;

-- SELECT: Staff can view/download training documents
CREATE POLICY "training_docs_storage_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-documents'
  AND is_training_hub_staff(auth.uid())
);

-- INSERT: Staff can upload to training documents
CREATE POLICY "training_docs_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-documents'
  AND is_training_hub_staff(auth.uid())
);

-- UPDATE: Staff can update their uploads
CREATE POLICY "training_docs_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-documents'
  AND is_training_hub_staff(auth.uid())
);

-- DELETE: Staff can delete training documents storage
CREATE POLICY "training_docs_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-documents'
  AND is_training_hub_staff(auth.uid())
);

-- ============================================================================
-- 5. Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_training_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_documents_updated_at
  BEFORE UPDATE ON training_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_training_documents_updated_at();

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT ALL ON training_documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
