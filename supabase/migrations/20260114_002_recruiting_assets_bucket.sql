-- supabase/migrations/20260114_002_recruiting_assets_bucket.sql
-- Public storage bucket for recruiting page assets (logos, hero images)

-- ============================================================================
-- BUCKET: recruiting-assets
-- Public bucket for recruiting page branding assets
-- Path structure: {user_id}/logo-light.png, {user_id}/logo-dark.png, {user_id}/hero.jpg
-- ============================================================================

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recruiting-assets',
  'recruiting-assets',
  true,  -- Public bucket (no signed URLs needed for reads)
  5242880,  -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "recruiting_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "recruiting_assets_user_upload" ON storage.objects;
DROP POLICY IF EXISTS "recruiting_assets_user_update" ON storage.objects;
DROP POLICY IF EXISTS "recruiting_assets_user_delete" ON storage.objects;

-- Public read access (bucket is public, but explicit policy for clarity)
CREATE POLICY "recruiting_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recruiting-assets');

-- Authenticated users can upload to their own folder only
-- Path must start with their user_id: {user_id}/filename.ext
CREATE POLICY "recruiting_assets_user_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recruiting-assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own assets
CREATE POLICY "recruiting_assets_user_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recruiting-assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'recruiting-assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own assets
CREATE POLICY "recruiting_assets_user_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recruiting-assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON TABLE storage.buckets IS 'recruiting-assets: Public bucket for recruiting page logos and hero images. Path structure: {user_id}/{filename}';
