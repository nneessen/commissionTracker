-- supabase/migrations/20260109_006_create_underwriting_guides_bucket.sql
-- Create storage bucket for underwriting guide PDFs

-- Create the bucket (private, not public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'underwriting-guides',
  'underwriting-guides',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for the bucket

-- Policy: Users can upload guides to their own IMO folder
CREATE POLICY "Users can upload guides to their IMO"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'underwriting-guides'
  AND (storage.foldername(name))[1] = (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can view guides from their own IMO
CREATE POLICY "Users can view guides from their IMO"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'underwriting-guides'
  AND (storage.foldername(name))[1] = (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can update guides in their own IMO folder
CREATE POLICY "Users can update guides in their IMO"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'underwriting-guides'
  AND (storage.foldername(name))[1] = (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can delete guides from their own IMO folder
CREATE POLICY "Users can delete guides from their IMO"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'underwriting-guides'
  AND (storage.foldername(name))[1] = (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- Grant service role full access (for edge functions)
CREATE POLICY "Service role has full access to underwriting guides"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'underwriting-guides')
WITH CHECK (bucket_id = 'underwriting-guides');
