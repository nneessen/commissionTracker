-- supabase/migrations/20260202142045_slack_workspace_logo.sql
-- Add workspace_logo_url column to slack_integrations table

ALTER TABLE slack_integrations
ADD COLUMN workspace_logo_url TEXT;

COMMENT ON COLUMN slack_integrations.workspace_logo_url IS 'Custom uploaded logo URL for workspace (512x512)';

-- Create storage bucket for workspace logos if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for workspace-logos bucket
-- Allow authenticated users to read any logo (public bucket)
CREATE POLICY "workspace_logos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workspace-logos');

-- Allow authenticated users to upload to their IMO's folder
CREATE POLICY "workspace_logos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update their IMO's files
CREATE POLICY "workspace_logos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete their IMO's files
CREATE POLICY "workspace_logos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT imo_id::text FROM user_profiles WHERE id = auth.uid()
  )
);
