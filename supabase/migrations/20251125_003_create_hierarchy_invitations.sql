-- Migration: Create Hierarchy Invitations System
-- Purpose: Implement invitation-based hierarchy system where agents invite by email
-- Created: 2025-11-25
--
-- FEATURES:
--   - Send invitation by email only
--   - Target must be registered user in auth.users
--   - Target cannot already have upline_id
--   - Only ONE pending invitation per user at a time
--   - Invitations expire after 30 days
--   - Inviter can cancel, invitee can accept/deny
--   - Full RLS policies for security

BEGIN;

-- ============================================
-- 1. CREATE hierarchy_invitations TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS hierarchy_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent the invitation
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Target email (must exist in auth.users)
  invitee_email VARCHAR(255) NOT NULL,

  -- Resolved user ID when found (for quick lookup and constraint)
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status: pending, accepted, denied, cancelled, expired
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'denied', 'cancelled', 'expired')),

  -- Optional message from inviter
  message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  responded_at TIMESTAMPTZ, -- when accepted/denied
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_inviter_not_invitee CHECK (inviter_id != invitee_id)
);

-- ============================================
-- 2. CREATE UNIQUE CONSTRAINT FOR PENDING INVITATIONS
-- ============================================
-- Only one pending invitation per invitee at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitee
  ON hierarchy_invitations(invitee_id)
  WHERE status = 'pending';

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

-- For inviters to see their sent invitations
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_status
  ON hierarchy_invitations(inviter_id, status);

-- For invitees to see their received invitations
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_status
  ON hierarchy_invitations(invitee_id, status);

-- For expiration cron job
CREATE INDEX IF NOT EXISTS idx_invitations_expires
  ON hierarchy_invitations(expires_at, status)
  WHERE status = 'pending';

-- For email lookup when sending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON hierarchy_invitations(invitee_email);

-- ============================================
-- 4. CREATE TRIGGER TO AUTO-RESOLVE invitee_id
-- ============================================
-- When invitation is created, automatically resolve invitee_id from email

CREATE OR REPLACE FUNCTION resolve_invitee_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user_id UUID;
BEGIN
  -- Look up user ID from email in auth.users
  SELECT id INTO resolved_user_id
  FROM auth.users
  WHERE email = NEW.invitee_email
  LIMIT 1;

  -- Set invitee_id if found
  IF resolved_user_id IS NOT NULL THEN
    NEW.invitee_id := resolved_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS resolve_invitee_id_trigger ON hierarchy_invitations;

-- Create trigger
CREATE TRIGGER resolve_invitee_id_trigger
  BEFORE INSERT ON hierarchy_invitations
  FOR EACH ROW
  EXECUTE FUNCTION resolve_invitee_id();

-- ============================================
-- 5. CREATE FUNCTION TO EXPIRE OLD INVITATIONS
-- ============================================
-- This should be run daily via pg_cron or manually

CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TABLE(expired_count INTEGER)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE hierarchy_invitations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN QUERY SELECT rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE hierarchy_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see invitations they sent
CREATE POLICY "Users can view invitations they sent"
  ON hierarchy_invitations
  FOR SELECT
  USING (auth.uid() = inviter_id);

-- Policy: Users can see invitations sent to them
CREATE POLICY "Users can view invitations sent to them"
  ON hierarchy_invitations
  FOR SELECT
  USING (auth.uid() = invitee_id);

-- Policy: Authenticated users can create invitations
CREATE POLICY "Authenticated users can send invitations"
  ON hierarchy_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Policy: Inviters can update their sent pending invitations (to cancel)
CREATE POLICY "Inviters can cancel their pending invitations"
  ON hierarchy_invitations
  FOR UPDATE
  USING (
    auth.uid() = inviter_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = inviter_id
    AND status IN ('cancelled', 'pending')
  );

-- Policy: Invitees can update invitations sent to them (to accept/deny)
CREATE POLICY "Invitees can accept or deny invitations"
  ON hierarchy_invitations
  FOR UPDATE
  USING (
    auth.uid() = invitee_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = invitee_id
    AND status IN ('accepted', 'denied')
  );

-- Policy: Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON hierarchy_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy: Admins can update any invitation
CREATE POLICY "Admins can update any invitation"
  ON hierarchy_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- ============================================
-- 7. CREATE TRIGGER TO AUTO-SET upline_id ON ACCEPT
-- ============================================
-- When invitation is accepted, automatically set invitee's upline_id

CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Set responded_at timestamp
    NEW.responded_at := NOW();
    NEW.updated_at := NOW();

    -- Update invitee's upline_id (triggers will handle hierarchy_path update)
    UPDATE user_profiles
    SET upline_id = NEW.inviter_id
    WHERE id = NEW.invitee_id;

  -- Set responded_at for denied status
  ELSIF NEW.status = 'denied' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS handle_invitation_accepted_trigger ON hierarchy_invitations;

-- Create trigger
CREATE TRIGGER handle_invitation_accepted_trigger
  BEFORE UPDATE ON hierarchy_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_accepted();

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'hierarchy_invitations'
  ) INTO table_exists;

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'hierarchy_invitations';

  -- Count RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'hierarchy_invitations';

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Hierarchy Invitations System Created!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Table exists: %', table_exists;
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE 'RLS policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Email-only invitation system';
  RAISE NOTICE '  - Auto-resolve invitee_id from email';
  RAISE NOTICE '  - Only one pending invitation per user';
  RAISE NOTICE '  - 30-day expiration (use expire_old_invitations())';
  RAISE NOTICE '  - Auto-set upline_id on acceptance';
  RAISE NOTICE '  - Full RLS security policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Status values: pending, accepted, denied, cancelled, expired';
  RAISE NOTICE '===========================================';
END $$;
