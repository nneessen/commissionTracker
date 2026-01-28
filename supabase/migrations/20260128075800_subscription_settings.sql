-- supabase/migrations/20260128075800_subscription_settings.sql
-- Create subscription_settings table for admin-controllable temporary access

-- Create subscription_settings table (singleton pattern)
CREATE TABLE subscription_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Temporary Access Control
  temporary_access_enabled BOOLEAN NOT NULL DEFAULT true,
  temporary_access_end_date TIMESTAMPTZ NOT NULL DEFAULT '2026-03-01T00:00:00Z',
  temporary_access_excluded_features TEXT[] NOT NULL DEFAULT ARRAY['recruiting']::TEXT[],
  temporary_access_test_emails TEXT[] NOT NULL DEFAULT ARRAY['nick@nickneessen.com']::TEXT[],

  -- Audit Trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

-- Singleton pattern: ensure only one settings row can exist
CREATE UNIQUE INDEX idx_subscription_settings_singleton ON subscription_settings ((true));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscription_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_settings_updated_at
  BEFORE UPDATE ON subscription_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_settings_updated_at();

-- Enable RLS
ALTER TABLE subscription_settings ENABLE ROW LEVEL SECURITY;

-- Read: All authenticated users (needed for feature access check)
CREATE POLICY "subscription_settings_read_authenticated"
  ON subscription_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: Super admin only (check is_super_admin on user_profiles)
CREATE POLICY "subscription_settings_write_super_admin"
  ON subscription_settings
  FOR UPDATE
  TO authenticated
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

-- Insert default settings row (matches current hardcoded behavior)
INSERT INTO subscription_settings (
  temporary_access_enabled,
  temporary_access_end_date,
  temporary_access_excluded_features,
  temporary_access_test_emails
) VALUES (
  true,
  '2026-03-01T00:00:00Z',
  ARRAY['recruiting']::TEXT[],
  ARRAY['nick@nickneessen.com']::TEXT[]
);

-- Indexes
CREATE INDEX idx_subscription_settings_updated_at ON subscription_settings(updated_at);

-- Comments
COMMENT ON TABLE subscription_settings IS 'System-wide subscription settings (singleton table with one row)';
COMMENT ON COLUMN subscription_settings.temporary_access_enabled IS 'Master toggle for temporary free access period';
COMMENT ON COLUMN subscription_settings.temporary_access_end_date IS 'End date for temporary free access period (UTC)';
COMMENT ON COLUMN subscription_settings.temporary_access_excluded_features IS 'Feature keys excluded from temporary access (still require paid tier)';
COMMENT ON COLUMN subscription_settings.temporary_access_test_emails IS 'Email addresses that bypass temporary access (see real tier gating)';
