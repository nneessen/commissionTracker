-- =============================================================================
-- IMO/Agency Storage Buckets
-- =============================================================================
-- This migration creates storage buckets for IMO and agency branding assets
-- with proper RLS policies for access control.
-- =============================================================================

-- =============================================================================
-- 1. Create storage buckets
-- =============================================================================

-- IMO assets bucket (logos, branding)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imo-assets',
  'imo-assets',
  true,  -- Public bucket for logos
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Agency assets bucket (logos, branding)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-assets',
  'agency-assets',
  true,  -- Public bucket for logos
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. RLS Policies for imo-assets bucket
-- =============================================================================
-- Folder structure: imo-assets/{imo_id}/logo.png

-- IMO members can view assets in their IMO folder
DROP POLICY IF EXISTS "IMO members can view imo assets" ON storage.objects;
CREATE POLICY "IMO members can view imo assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'imo-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_imo_id()
);

-- IMO admins can upload to their IMO folder
DROP POLICY IF EXISTS "IMO admins can upload imo assets" ON storage.objects;
CREATE POLICY "IMO admins can upload imo assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'imo-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_imo_id()
  AND is_imo_admin()
);

-- IMO admins can update assets in their IMO folder
DROP POLICY IF EXISTS "IMO admins can update imo assets" ON storage.objects;
CREATE POLICY "IMO admins can update imo assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'imo-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_imo_id()
  AND is_imo_admin()
);

-- IMO admins can delete assets in their IMO folder
DROP POLICY IF EXISTS "IMO admins can delete imo assets" ON storage.objects;
CREATE POLICY "IMO admins can delete imo assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'imo-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_imo_id()
  AND is_imo_admin()
);

-- =============================================================================
-- 3. RLS Policies for agency-assets bucket
-- =============================================================================
-- Folder structure: agency-assets/{agency_id}/logo.png

-- Agency members can view assets in their agency folder
DROP POLICY IF EXISTS "Agency members can view agency assets" ON storage.objects;
CREATE POLICY "Agency members can view agency assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_agency_id()
);

-- Agency owners and IMO admins can upload to their agency folder
DROP POLICY IF EXISTS "Agency owners can upload agency assets" ON storage.objects;
CREATE POLICY "Agency owners can upload agency assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agency-assets'
  AND (
    (storage.foldername(name))[1]::uuid = get_my_agency_id()
    AND (is_agency_owner() OR is_imo_admin())
  )
);

-- Agency owners and IMO admins can update assets
DROP POLICY IF EXISTS "Agency owners can update agency assets" ON storage.objects;
CREATE POLICY "Agency owners can update agency assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_agency_id()
  AND (is_agency_owner() OR is_imo_admin())
);

-- Agency owners and IMO admins can delete assets
DROP POLICY IF EXISTS "Agency owners can delete agency assets" ON storage.objects;
CREATE POLICY "Agency owners can delete agency assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND (storage.foldername(name))[1]::uuid = get_my_agency_id()
  AND (is_agency_owner() OR is_imo_admin())
);

-- =============================================================================
-- 4. Allow public read access for logos (they're meant to be displayed)
-- =============================================================================
-- Since buckets are public, anyone can view the files via the public URL.
-- The policies above control who can upload/update/delete.

DO $$ BEGIN
  RAISE NOTICE 'Created storage buckets: imo-assets, agency-assets';
END $$;
