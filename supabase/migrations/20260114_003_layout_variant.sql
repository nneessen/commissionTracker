-- supabase/migrations/20260114_003_layout_variant.sql
-- Add layout_variant field to recruiting_page_settings for multiple layout options

-- ============================================================================
-- ADD LAYOUT_VARIANT COLUMN
-- ============================================================================

-- Add the column with a check constraint for valid values
ALTER TABLE recruiting_page_settings
ADD COLUMN IF NOT EXISTS layout_variant TEXT DEFAULT 'split-panel'
CHECK (layout_variant IN ('split-panel', 'centered-card', 'hero-slide', 'multi-section'));

-- Add comment
COMMENT ON COLUMN recruiting_page_settings.layout_variant IS
  'Layout variant for the public recruiting page. Options: split-panel (default), centered-card, hero-slide, multi-section';

-- ============================================================================
-- UPDATE get_public_recruiting_theme RPC
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

    -- Layout variant (new field)
    'layout_variant', COALESCE(v_settings.layout_variant, 'split-panel'),

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

-- Grants remain unchanged (already set in original migration)
