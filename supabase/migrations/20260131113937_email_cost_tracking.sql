-- supabase/migrations/20260131113937_email_cost_tracking.sql
-- Add cost tracking for Mailgun email sends and configurable budget cap
--
-- This migration:
-- 1. Adds cost_cents column to email_quota_tracking
-- 2. Creates system_settings table for app-wide configuration
-- 3. Inserts mailgun_monthly_budget_cents setting (default $50/month)

-- =============================================================================
-- STEP 1: Add cost_cents column to email_quota_tracking
-- =============================================================================
-- Default cost is 1 cent per email for Mailgun

ALTER TABLE email_quota_tracking
  ADD COLUMN IF NOT EXISTS cost_cents integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN email_quota_tracking.cost_cents IS
  'Cost per email in cents (default 1 cent for Mailgun)';

-- =============================================================================
-- STEP 2: Create system_settings table
-- =============================================================================
-- Simple key-value store for app-wide configuration

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read system settings
CREATE POLICY "Anyone can read system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can modify system settings
CREATE POLICY "Super admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

COMMENT ON TABLE system_settings IS
  'App-wide configuration settings (key-value store)';

-- =============================================================================
-- STEP 3: Insert Mailgun budget setting
-- =============================================================================

INSERT INTO system_settings (key, value, description)
VALUES (
  'mailgun_monthly_budget_cents',
  '5000',
  'Maximum monthly spend on Mailgun emails (in cents). Default $50.00. Set to 0 to disable budget cap.'
)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  setting_exists BOOLEAN;
BEGIN
  -- Check column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_quota_tracking' AND column_name = 'cost_cents'
  ) INTO col_exists;

  -- Check setting exists
  SELECT EXISTS (
    SELECT 1 FROM system_settings WHERE key = 'mailgun_monthly_budget_cents'
  ) INTO setting_exists;

  IF col_exists AND setting_exists THEN
    RAISE NOTICE 'Email cost tracking migration completed successfully';
  ELSE
    RAISE WARNING 'Migration may have failed - col_exists: %, setting_exists: %', col_exists, setting_exists;
  END IF;
END $$;
