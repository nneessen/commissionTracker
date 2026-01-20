-- supabase/migrations/20260120160219_landing_page_settings.sql
-- Public landing page settings for agency customization

-- Create landing_page_settings table
CREATE TABLE IF NOT EXISTS landing_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Hero Section
  hero_headline TEXT DEFAULT 'Build Your Future',
  hero_subheadline TEXT DEFAULT 'Remote sales careers for the ambitious',
  hero_cta_text TEXT DEFAULT 'Start Your Journey',
  hero_cta_link TEXT DEFAULT '/join-the-standard',
  hero_video_url TEXT,
  hero_image_url TEXT,

  -- Stats Section
  stats_enabled BOOLEAN DEFAULT true,
  stats_data JSONB DEFAULT '[
    {"label": "Average First Year", "value": "75000", "prefix": "$", "suffix": "+"},
    {"label": "Team Members", "value": "150", "prefix": "", "suffix": "+"},
    {"label": "States Licensed", "value": "48", "prefix": "", "suffix": ""},
    {"label": "Remote Work", "value": "100", "prefix": "", "suffix": "%"}
  ]'::jsonb,

  -- About Section
  about_enabled BOOLEAN DEFAULT true,
  about_headline TEXT DEFAULT 'Who We Are',
  about_content TEXT DEFAULT 'We are a team of driven professionals redefining what''s possible in insurance sales. Our mission is to empower agents with world-class training, cutting-edge tools, and the support needed to build a thriving career from anywhere.',
  about_video_url TEXT,
  about_image_url TEXT,

  -- Gallery Section
  gallery_enabled BOOLEAN DEFAULT true,
  gallery_headline TEXT DEFAULT 'Our People',
  gallery_subheadline TEXT DEFAULT 'The culture that drives our success',
  gallery_featured_url TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb, -- Array of {url, caption, alt}

  -- Opportunity Section
  opportunity_enabled BOOLEAN DEFAULT true,
  opportunity_headline TEXT DEFAULT 'Your Path',
  opportunity_subheadline TEXT DEFAULT 'From day one to agency ownership',
  opportunity_steps JSONB DEFAULT '[
    {"title": "Join", "description": "Apply and complete onboarding", "icon": "rocket", "detail": "Get licensed and certified"},
    {"title": "Train", "description": "Learn proven systems from top producers", "icon": "book", "detail": "Comprehensive training program"},
    {"title": "Earn", "description": "Start building real income immediately", "icon": "dollar", "detail": "Uncapped commission potential"},
    {"title": "Lead", "description": "Build and mentor your own team", "icon": "users", "detail": "Agency ownership track"}
  ]'::jsonb,

  -- Requirements Section
  requirements_enabled BOOLEAN DEFAULT true,
  requirements_headline TEXT DEFAULT 'What It Takes',
  requirements_subheadline TEXT DEFAULT 'No experience required. Just the right mindset.',
  requirements_items JSONB DEFAULT '[
    {"trait": "Self-Motivated", "description": "You don''t wait to be told what to do", "icon": "flame"},
    {"trait": "Coachable", "description": "You''re hungry to learn and grow", "icon": "lightbulb"},
    {"trait": "Ambitious", "description": "You want more than average results", "icon": "target"},
    {"trait": "People-Person", "description": "You genuinely care about helping others", "icon": "heart"}
  ]'::jsonb,

  -- Tech Section
  tech_enabled BOOLEAN DEFAULT true,
  tech_headline TEXT DEFAULT 'Your Tools',
  tech_subheadline TEXT DEFAULT 'Built for the digital generation',
  tech_features JSONB DEFAULT '[
    {"title": "Smart Dashboard", "description": "Real-time performance tracking and analytics", "icon": "chart"},
    {"title": "Lead Management", "description": "Automated pipeline and follow-up systems", "icon": "users"},
    {"title": "Mobile First", "description": "Work from anywhere with full mobile support", "icon": "smartphone"},
    {"title": "AI Assistant", "description": "Intelligent tools to help you sell smarter", "icon": "brain"}
  ]'::jsonb,

  -- Testimonials Section
  testimonials_enabled BOOLEAN DEFAULT true,
  testimonials_headline TEXT DEFAULT 'Real Stories',
  testimonials_subheadline TEXT DEFAULT 'From our agents',
  testimonials JSONB DEFAULT '[]'::jsonb, -- Array of {name, role, quote, image_url, video_url, earnings}

  -- FAQ Section
  faq_enabled BOOLEAN DEFAULT true,
  faq_headline TEXT DEFAULT 'Quick Answers',
  faq_items JSONB DEFAULT '[
    {"question": "Do I need prior insurance experience?", "answer": "No! We provide comprehensive training for all new agents, regardless of background."},
    {"question": "Is this really 100% remote?", "answer": "Yes. Our entire team works remotely. You can work from home, a coffee shop, or anywhere with internet."},
    {"question": "How does the compensation work?", "answer": "You earn commission on every policy you sell. There''s no cap on your earnings - the more you sell, the more you make."},
    {"question": "What kind of support will I receive?", "answer": "You''ll have access to mentorship, training resources, marketing materials, and a supportive team community."},
    {"question": "How quickly can I start earning?", "answer": "Many agents write their first policy within their first week after completing licensing and training."}
  ]'::jsonb,

  -- Final CTA Section
  final_cta_enabled BOOLEAN DEFAULT true,
  final_cta_headline TEXT DEFAULT 'Ready to Start?',
  final_cta_subheadline TEXT DEFAULT 'Your future is waiting',
  final_cta_text TEXT DEFAULT 'Apply Now',
  final_cta_link TEXT DEFAULT '/join-the-standard',

  -- Footer/Contact
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  social_links JSONB DEFAULT '{}'::jsonb, -- {instagram, linkedin, youtube, tiktok, facebook}

  -- Login Access Configuration
  login_access_type TEXT DEFAULT 'easter_egg' CHECK (login_access_type IN ('easter_egg', 'footer_link', 'both', 'nav_button')),

  -- Global Theme
  primary_color TEXT DEFAULT '#f59e0b' CHECK (primary_color IS NULL OR primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color TEXT DEFAULT '#18181b' CHECK (secondary_color IS NULL OR secondary_color ~* '^#[0-9a-f]{6}$'),
  accent_color TEXT DEFAULT '#6366f1' CHECK (accent_color IS NULL OR accent_color ~* '^#[0-9a-f]{6}$'),

  -- Logo
  logo_light_url TEXT,
  logo_dark_url TEXT,

  -- SEO
  meta_title TEXT DEFAULT 'The Standard - Remote Insurance Sales Careers',
  meta_description TEXT DEFAULT 'Join The Standard and build a thriving career in insurance sales. 100% remote, unlimited earning potential, world-class training.',
  og_image_url TEXT,

  -- Section Order (for reordering sections)
  section_order JSONB DEFAULT '["hero", "stats", "about", "gallery", "opportunity", "requirements", "tech", "testimonials", "faq", "final_cta"]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_landing_page_per_imo UNIQUE (imo_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_landing_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS landing_page_settings_updated_at ON landing_page_settings;
CREATE TRIGGER landing_page_settings_updated_at
  BEFORE UPDATE ON landing_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_landing_page_settings_updated_at();

-- Enable RLS
ALTER TABLE landing_page_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (for landing page display - no auth required)
CREATE POLICY "landing_page_settings_public_read"
  ON landing_page_settings
  FOR SELECT
  USING (true);

-- Policy: Super admin full access
CREATE POLICY "landing_page_settings_super_admin_all"
  ON landing_page_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_landing_page_settings_imo_id ON landing_page_settings(imo_id);

-- Create public RPC to get landing page settings (for unauthenticated access)
CREATE OR REPLACE FUNCTION get_public_landing_page_settings(p_imo_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings JSON;
  v_target_imo_id UUID;
BEGIN
  -- If no IMO ID provided, get the first/default IMO
  IF p_imo_id IS NULL THEN
    SELECT id INTO v_target_imo_id
    FROM imos
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    v_target_imo_id := p_imo_id;
  END IF;

  -- Get settings for the IMO
  SELECT row_to_json(lps.*)
  INTO v_settings
  FROM landing_page_settings lps
  WHERE lps.imo_id = v_target_imo_id;

  -- If no settings found, return defaults
  IF v_settings IS NULL THEN
    SELECT json_build_object(
      'hero_headline', 'Build Your Future',
      'hero_subheadline', 'Remote sales careers for the ambitious',
      'hero_cta_text', 'Start Your Journey',
      'hero_cta_link', '/join-the-standard',
      'stats_enabled', true,
      'stats_data', '[
        {"label": "Average First Year", "value": "75000", "prefix": "$", "suffix": "+"},
        {"label": "Team Members", "value": "150", "prefix": "", "suffix": "+"},
        {"label": "States Licensed", "value": "48", "prefix": "", "suffix": ""},
        {"label": "Remote Work", "value": "100", "prefix": "", "suffix": "%"}
      ]'::jsonb,
      'about_enabled', true,
      'about_headline', 'Who We Are',
      'gallery_enabled', true,
      'gallery_headline', 'Our People',
      'opportunity_enabled', true,
      'opportunity_headline', 'Your Path',
      'requirements_enabled', true,
      'requirements_headline', 'What It Takes',
      'tech_enabled', true,
      'tech_headline', 'Your Tools',
      'testimonials_enabled', true,
      'testimonials_headline', 'Real Stories',
      'faq_enabled', true,
      'faq_headline', 'Quick Answers',
      'final_cta_enabled', true,
      'final_cta_headline', 'Ready to Start?',
      'final_cta_text', 'Apply Now',
      'final_cta_link', '/join-the-standard',
      'primary_color', '#f59e0b',
      'secondary_color', '#18181b',
      'accent_color', '#6366f1',
      'login_access_type', 'easter_egg',
      'meta_title', 'The Standard - Remote Insurance Sales Careers',
      'section_order', '["hero", "stats", "about", "gallery", "opportunity", "requirements", "tech", "testimonials", "faq", "final_cta"]'::jsonb
    ) INTO v_settings;
  END IF;

  RETURN v_settings;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_public_landing_page_settings(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_landing_page_settings(UUID) TO authenticated;

-- Add comment
COMMENT ON TABLE landing_page_settings IS 'Customizable settings for the public-facing landing page';
COMMENT ON FUNCTION get_public_landing_page_settings(UUID) IS 'Get landing page settings for public display (no auth required)';
