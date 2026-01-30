-- supabase/migrations/20260130122627_add_agent_policy_delete_rls.sql
-- Migration: Add RLS DELETE policy for agents on their own policies
--
-- Previously only super admins could delete policies (via FOR ALL policy).
-- This adds explicit DELETE, UPDATE, and INSERT policies for agents to manage
-- their own policies.

-- =============================================================================
-- 1. Add DELETE policy for agents on their own policies
-- =============================================================================

DROP POLICY IF EXISTS "Agents can delete their own policies" ON policies;

CREATE POLICY "Agents can delete their own policies"
ON policies FOR DELETE
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "Agents can delete their own policies" ON policies IS
'Allows agents to delete their own policies. Combined with the fixed cascade
trigger, this safely removes policies without affecting other policies.';

-- =============================================================================
-- 2. Add UPDATE policy for agents on their own policies
-- =============================================================================

DROP POLICY IF EXISTS "Agents can update their own policies" ON policies;

CREATE POLICY "Agents can update their own policies"
ON policies FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Agents can update their own policies" ON policies IS
'Allows agents to update their own policies.';

-- =============================================================================
-- 3. Add INSERT policy for agents on their own policies
-- =============================================================================

DROP POLICY IF EXISTS "Agents can insert their own policies" ON policies;

CREATE POLICY "Agents can insert their own policies"
ON policies FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Agents can insert their own policies" ON policies IS
'Allows agents to insert their own policies.';

-- =============================================================================
-- 4. Add SELECT policy for agents on their own policies
-- =============================================================================

DROP POLICY IF EXISTS "Agents can view their own policies" ON policies;

CREATE POLICY "Agents can view their own policies"
ON policies FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "Agents can view their own policies" ON policies IS
'Allows agents to view their own policies. This is the base visibility policy.';
