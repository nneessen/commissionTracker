-- Migration: Contact Favorites for Email Compose
-- Creates contact_favorites table to store user's favorite contacts
-- Supports both team members (user_profiles) and clients

-- ============================================================================
-- contact_favorites table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Polymorphic reference - either contact_user_id OR client_id is set
  contact_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one of the two foreign keys is set
  CONSTRAINT contact_favorites_one_reference CHECK (
    (contact_user_id IS NOT NULL AND client_id IS NULL) OR
    (contact_user_id IS NULL AND client_id IS NOT NULL)
  ),

  -- Prevent duplicate favorites for same user/contact pair
  CONSTRAINT contact_favorites_unique_user_contact UNIQUE (user_id, contact_user_id),
  CONSTRAINT contact_favorites_unique_user_client UNIQUE (user_id, client_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_contact_favorites_user_id
  ON public.contact_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_contact_favorites_contact_user_id
  ON public.contact_favorites(contact_user_id)
  WHERE contact_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_favorites_client_id
  ON public.contact_favorites(client_id)
  WHERE client_id IS NOT NULL;

-- Index for role-based filtering on user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles_gin
  ON public.user_profiles USING GIN (roles);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower
  ON public.user_profiles (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_clients_email_lower
  ON public.clients (LOWER(email))
  WHERE email IS NOT NULL;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.contact_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.contact_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can only insert their own favorites
CREATE POLICY "Users can insert own favorites"
  ON public.contact_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON public.contact_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Helper function to check if a contact is favorited
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_contact_favorited(
  p_user_id UUID,
  p_contact_user_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_contact_user_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.contact_favorites
      WHERE user_id = p_user_id AND contact_user_id = p_contact_user_id
    );
  ELSIF p_client_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.contact_favorites
      WHERE user_id = p_user_id AND client_id = p_client_id
    );
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON TABLE public.contact_favorites IS 'Stores user favorite contacts for quick access in email compose';
COMMENT ON COLUMN public.contact_favorites.contact_user_id IS 'Reference to team member (user_profiles)';
COMMENT ON COLUMN public.contact_favorites.client_id IS 'Reference to client';
