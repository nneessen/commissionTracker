-- Migration: Add policy for users to view/manage their own targets
-- Purpose: Users should be able to CRUD their own targets
-- Date: 2026-01-13
--
-- The existing user_targets policies only cover:
-- 1. Uplines viewing downline targets
-- 2. IMO admins viewing all targets in their IMO
-- 3. Super admins viewing all targets
--
-- Missing: Users viewing/managing their OWN targets

-- Policy: Users can view their own targets
CREATE POLICY "Users can view own targets" ON user_targets FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can insert their own targets
CREATE POLICY "Users can insert own targets" ON user_targets FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own targets
CREATE POLICY "Users can update own targets" ON user_targets FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own targets (if needed)
CREATE POLICY "Users can delete own targets" ON user_targets FOR DELETE
USING (user_id = auth.uid());

COMMENT ON POLICY "Users can view own targets" ON user_targets IS
'Users can view their own target records';

COMMENT ON POLICY "Users can insert own targets" ON user_targets IS
'Users can create their own target records';

COMMENT ON POLICY "Users can update own targets" ON user_targets IS
'Users can update their own target records';

COMMENT ON POLICY "Users can delete own targets" ON user_targets IS
'Users can delete their own target records';
