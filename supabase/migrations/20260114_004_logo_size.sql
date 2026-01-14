-- supabase/migrations/20260114_004_logo_size.sql
-- Add logo_size column and update RPC to include it

-- ============================================================================
-- ADD LOGO_SIZE COLUMN
-- ============================================================================

ALTER TABLE recruiting_page_settings
ADD COLUMN IF NOT EXISTS logo_size TEXT DEFAULT 'medium'
CHECK (logo_size IN ('small', 'medium', 'large', 'xlarge'));

COMMENT ON COLUMN recruiting_page_settings.logo_size IS 'Logo size: small (40px), medium (56px), large (72px), xlarge (96px)';

-- ============================================================================
-- UPDATE get_public_recruiting_theme RPC TO INCLUDE logo_size
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

    -- Layout settings
    'layout_variant', COALESCE(v_settings.layout_variant, 'split-panel'),
    'logo_size', COALESCE(v_settings.logo_size, 'medium'),

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

    -- Features (includes show_display_name)
    'enabled_features', COALESCE(v_settings.enabled_features, '{"show_stats": true, "collect_phone": true, "show_display_name": true}'::jsonb),

    -- Location
    'default_city', v_settings.default_city,
    'default_state', v_settings.default_state
  );

  RETURN v_result;
END;
$$;
