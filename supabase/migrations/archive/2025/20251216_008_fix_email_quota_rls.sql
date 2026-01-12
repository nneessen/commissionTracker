-- supabase/migrations/20251216_008_fix_email_quota_rls.sql
-- Migration: Fix email_quota_tracking RLS policies to allow INSERT/UPDATE
-- Issue: Users cannot track their email quota because INSERT/UPDATE policies are missing

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view own quota" ON email_quota_tracking;
DROP POLICY IF EXISTS "Users can insert own quota" ON email_quota_tracking;
DROP POLICY IF EXISTS "Users can update own quota" ON email_quota_tracking;

-- Recreate SELECT policy
CREATE POLICY "Users can view own quota" ON email_quota_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Add INSERT policy - users can insert their own quota records
CREATE POLICY "Users can insert own quota" ON email_quota_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy - users can update their own quota records
CREATE POLICY "Users can update own quota" ON email_quota_tracking
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add admin policies
CREATE POLICY "Admins can view all quotas" ON email_quota_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage all quotas" ON email_quota_tracking
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Verify email_quota_tracking table exists with correct schema
-- (If it doesn't exist, create it)
CREATE TABLE IF NOT EXISTS email_quota_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'resend',
  date date NOT NULL DEFAULT CURRENT_DATE,
  emails_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, date)
);

-- Enable RLS if not already enabled
ALTER TABLE email_quota_tracking ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_quota_tracking_user_date
  ON email_quota_tracking(user_id, date);
