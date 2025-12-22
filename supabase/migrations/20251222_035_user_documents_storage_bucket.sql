-- supabase/migrations/20251222_035_user_documents_storage_bucket.sql
-- =============================================================================
-- User Documents Storage Bucket
-- =============================================================================
-- This migration creates the user-documents storage bucket for insurance agent
-- documents (licenses, E&O insurance, exam results, etc.) with strict self-only
-- RLS policies where users can only access their own documents.
-- =============================================================================

-- =============================================================================
-- 1. Create storage bucket
-- =============================================================================

-- User documents bucket (private, self-only access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-documents',
  'user-documents',
  false,  -- Private bucket - requires signed URLs
  26214400,  -- 25MB limit
  ARRAY[
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Images
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- 2. RLS Policies for user-documents bucket (STRICT SELF-ONLY ACCESS)
-- =============================================================================
-- Folder structure: user-documents/{user_id}/{category}/{document_type}/{filename}
-- The first folder segment is always the user's ID (auth.uid())

-- -----------------------------------------------------------------------------
-- SELECT: Users can only view files in their own folder, super admins can view all
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (
    -- Owner: first folder matches user's ID
    (storage.foldername(name))[1] = auth.uid()::text
    -- Super admin bypass
    OR is_super_admin()
  )
);

-- -----------------------------------------------------------------------------
-- INSERT: Users can only upload to their own folder
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND (
    -- Must upload to own folder
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- -----------------------------------------------------------------------------
-- UPDATE: Users can update their own files, super admins can update any
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (
    -- Owner
    (storage.foldername(name))[1] = auth.uid()::text
    -- Super admin bypass
    OR is_super_admin()
  )
)
WITH CHECK (
  bucket_id = 'user-documents'
  AND (
    -- Owner
    (storage.foldername(name))[1] = auth.uid()::text
    -- Super admin bypass
    OR is_super_admin()
  )
);

-- -----------------------------------------------------------------------------
-- DELETE: Users can delete their own files, super admins can delete any
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (
    -- Owner
    (storage.foldername(name))[1] = auth.uid()::text
    -- Super admin bypass
    OR is_super_admin()
  )
);

-- =============================================================================
-- 3. Verification
-- =============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Created storage bucket: user-documents (private, 25MB limit)';
  RAISE NOTICE 'RLS policies: Strict self-only access (owner + super admin only)';
  RAISE NOTICE 'Path structure: {user_id}/{category}/{document_type}/{filename}';
END $$;
