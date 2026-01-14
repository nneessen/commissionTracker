-- supabase/migrations/20260114_001_recruiting_page_settings.sql
-- Per-user branding settings for public recruiting pages
-- Precedence: User settings -> IMO defaults -> Platform defaults

-- ============================================================================
-- TABLE: recruiting_page_settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS recruiting_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Display & Branding
  display_name TEXT,                    -- e.g., "The Standard - Tampa"
  headline TEXT,                        -- Hero headline
  subheadline TEXT,                     -- Hero subheadline
  about_text TEXT,                      -- Optional about paragraph

  -- Colors (hex format, e.g., "#0ea5e9")
  primary_color TEXT CHECK (primary_color IS NULL OR primary_color ~* '^#[0-9a-f]{6}$'),
  accent_color TEXT CHECK (accent_color IS NULL OR accent_color ~* '^#[0-9a-f]{6}$'),

  -- Assets (public bucket URLs)
  logo_light_url TEXT,                  -- Logo for dark backgrounds
  logo_dark_url TEXT,                   -- Logo for light backgrounds
  hero_image_url TEXT,                  -- Optional hero/background image

  -- CTA & Actions
  cta_text TEXT DEFAULT 'Apply Now',    -- Button text
  calendly_url TEXT,                    -- Booking link
  support_phone TEXT,                   -- "Text us" number

  -- Social Links (JSONB for flexibility)
  -- Expected structure: { "facebook": "url", "instagram": "url", "linkedin": "url", "twitter": "url", "youtube": "url" }
  social_links JSONB DEFAULT '{}'::jsonb,

  -- Compliance
  disclaimer_text TEXT,                 -- Optional footer disclaimer

  -- Feature Flags (JSONB for flexibility)
  -- Expected structure: { "show_stats": true, "show_testimonials": false, "collect_phone": true, "show_location": true }
  enabled_features JSONB DEFAULT '{}'::jsonb,

  -- Location defaults
  default_city TEXT,
  default_state TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE recruiting_page_settings IS 'Per-user branding settings for public recruiting pages. Supports custom logos, colors, headlines, and social links.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recruiting_page_settings_user_id
  ON recruiting_page_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_recruiting_page_settings_imo_id
  ON recruiting_page_settings(imo_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger (reuse existing function if available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_recruiting_page_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_recruiting_page_settings_updated_at
      BEFORE UPDATE ON recruiting_page_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE recruiting_page_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own branding settings"
  ON recruiting_page_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own branding settings"
  ON recruiting_page_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own branding settings"
  ON recruiting_page_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own branding settings"
  ON recruiting_page_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Super admins can view all settings
CREATE POLICY "Super admins can view all branding settings"
  ON recruiting_page_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- PUBLIC RPC: get_public_recruiting_theme
-- Returns branding theme for a recruiter by slug (no auth required)
-- Merges: user settings -> IMO defaults -> platform defaults
-- ============================================================================

CREATE OR REPLACE FUNCTION get_public_recruiting_theme(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_imo_id UUID;
  v_settings RECORD;
  v_imo RECORD;
  v_profile RECORD;
  v_calendly_url TEXT;
  v_result JSON;
BEGIN
  -- Validate input
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN NULL;
  END IF;

  -- Get user by slug (must be approved)
  SELECT id, imo_id, first_name, last_name, custom_permissions
  INTO v_profile
  FROM user_profiles
  WHERE recruiter_slug = lower(trim(p_slug))
    AND approval_status = 'approved';

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  v_user_id := v_profile.id;
  v_imo_id := v_profile.imo_id;

  -- Extract calendly_url from custom_permissions JSONB
  v_calendly_url := v_profile.custom_permissions->>'calendly_url';

  -- Get user's custom branding settings (may not exist)
  SELECT * INTO v_settings
  FROM recruiting_page_settings
  WHERE user_id = v_user_id;

  -- Get IMO defaults (must be active)
  SELECT name, logo_url, primary_color, secondary_color, description, is_active
  INTO v_imo
  FROM imos
  WHERE id = v_imo_id;

  -- Check IMO is active
  IF v_imo IS NULL OR NOT v_imo.is_active THEN
    RETURN NULL;
  END IF;

  -- Build response with precedence: user settings -> IMO defaults -> platform defaults
  v_result := json_build_object(
    -- Identity
    'recruiter_first_name', COALESCE(v_profile.first_name, ''),
    'recruiter_last_name', COALESCE(v_profile.last_name, ''),

    -- Branding (user -> IMO -> platform default)
    'display_name', COALESCE(v_settings.display_name, v_imo.name, 'Insurance Agency'),
    'headline', COALESCE(v_settings.headline, 'Join Our Team'),
    'subheadline', COALESCE(v_settings.subheadline, 'Build your career in insurance'),
    'about_text', v_settings.about_text,

    -- Colors (user -> IMO -> platform default)
    'primary_color', COALESCE(v_settings.primary_color, v_imo.primary_color, '#0ea5e9'),
    'accent_color', COALESCE(v_settings.accent_color, v_imo.secondary_color, '#22c55e'),

    -- Logos (user -> IMO -> null)
    'logo_light_url', COALESCE(v_settings.logo_light_url, v_imo.logo_url),
    'logo_dark_url', COALESCE(v_settings.logo_dark_url, v_imo.logo_url),
    'hero_image_url', v_settings.hero_image_url,

    -- CTA & Actions
    'cta_text', COALESCE(v_settings.cta_text, 'Apply Now'),
    'calendly_url', COALESCE(v_settings.calendly_url, v_calendly_url),
    'support_phone', v_settings.support_phone,

    -- Social & Compliance
    'social_links', COALESCE(v_settings.social_links, '{}'::jsonb),
    'disclaimer_text', v_settings.disclaimer_text,

    -- Features
    'enabled_features', COALESCE(v_settings.enabled_features, '{"show_stats": true, "collect_phone": true}'::jsonb),

    -- Location
    'default_city', v_settings.default_city,
    'default_state', v_settings.default_state
  );

  RETURN v_result;
END;
$$;

-- Grant execute to anon (public access)
GRANT EXECUTE ON FUNCTION get_public_recruiting_theme(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_recruiting_theme(TEXT) TO authenticated;

COMMENT ON FUNCTION get_public_recruiting_theme IS 'Returns public branding theme for a recruiter by slug. Merges user settings with IMO defaults and platform defaults.';
