-- supabase/migrations/20260114_003_recruiting_settings_url_validation.sql
-- Security hardening: Add URL validation constraints to prevent XSS via javascript: URLs

-- ============================================================================
-- URL VALIDATION CONSTRAINTS
-- Prevent stored XSS attacks via malicious URL schemes (javascript:, data:, etc.)
-- ============================================================================

-- Add CHECK constraint for calendly_url
-- Must be NULL or start with http:// or https://
ALTER TABLE recruiting_page_settings
DROP CONSTRAINT IF EXISTS recruiting_page_settings_calendly_url_check;

ALTER TABLE recruiting_page_settings
ADD CONSTRAINT recruiting_page_settings_calendly_url_check
CHECK (calendly_url IS NULL OR calendly_url ~* '^https?://');

-- ============================================================================
-- JSONB URL VALIDATION FUNCTION
-- Validates that all values in a JSONB object are valid HTTP(S) URLs
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_social_links_urls(links JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- NULL or empty object is valid
  IF links IS NULL OR links = '{}'::JSONB THEN
    RETURN TRUE;
  END IF;

  -- Check each value in the object
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(links)
  LOOP
    -- Skip NULL or empty values
    IF v_value IS NULL OR v_value = '' THEN
      CONTINUE;
    END IF;

    -- Validate URL format (must start with http:// or https://)
    IF NOT (v_value ~* '^https?://') THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- Add CHECK constraint for social_links JSONB
ALTER TABLE recruiting_page_settings
DROP CONSTRAINT IF EXISTS recruiting_page_settings_social_links_check;

ALTER TABLE recruiting_page_settings
ADD CONSTRAINT recruiting_page_settings_social_links_check
CHECK (validate_social_links_urls(social_links));

-- ============================================================================
-- VALIDATE EXISTING DATA
-- Log any existing invalid data (should be none for new table)
-- ============================================================================

DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  -- Check for invalid calendly URLs
  SELECT COUNT(*) INTO v_invalid_count
  FROM recruiting_page_settings
  WHERE calendly_url IS NOT NULL
    AND NOT (calendly_url ~* '^https?://');

  IF v_invalid_count > 0 THEN
    RAISE WARNING 'Found % rows with invalid calendly_url values', v_invalid_count;
  END IF;

  -- Check for invalid social links
  SELECT COUNT(*) INTO v_invalid_count
  FROM recruiting_page_settings
  WHERE NOT validate_social_links_urls(social_links);

  IF v_invalid_count > 0 THEN
    RAISE WARNING 'Found % rows with invalid social_links values', v_invalid_count;
  END IF;
END $$;

COMMENT ON FUNCTION validate_social_links_urls IS 'Validates that all URLs in a JSONB object use HTTP(S) scheme to prevent XSS attacks';
