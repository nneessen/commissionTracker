-- Migration: Create instagram-media storage bucket for caching Instagram profile pictures and message media
-- This bucket stores cached copies of Instagram media to avoid 403 errors from expired Meta URLs

-- Create storage bucket for Instagram media caching
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instagram-media',
  'instagram-media',
  true,  -- Public for avatar/media access without auth
  10485760,  -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Service role can upload (from edge functions)
CREATE POLICY "Service role can upload instagram media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'instagram-media');

-- RLS Policy: Service role can update (for re-caching)
CREATE POLICY "Service role can update instagram media"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'instagram-media')
WITH CHECK (bucket_id = 'instagram-media');

-- RLS Policy: Service role can delete (for cleanup)
CREATE POLICY "Service role can delete instagram media"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'instagram-media');

-- RLS Policy: Public read for cached media (avatars and message media)
-- This allows the frontend to load cached images without authentication
CREATE POLICY "Public read for instagram media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'instagram-media');
