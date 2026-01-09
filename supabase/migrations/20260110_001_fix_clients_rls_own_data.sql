-- supabase/migrations/20260110_001_fix_clients_rls_own_data.sql
-- Migration: Fix clients RLS - Add policy for users to view their own clients
-- This was missing from 20251222_001_clients_hierarchy_visibility.sql
-- which only added policies for uplines, IMO admins, and super admins

-- ============================================================================
-- 1. Add RLS policy for users to view clients on their own policies
-- ============================================================================

-- Allow users to view clients associated with their own policies
-- This fixes the 406 error when editing a policy and trying to fetch client data
CREATE POLICY "Users can view clients on their own policies" ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM policies
    WHERE policies.client_id = clients.id
    AND policies.user_id = auth.uid()
  )
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can view clients on their own policies" ON clients IS
'Allows users to view client data for their own policies. This complements the hierarchy visibility policies by ensuring agents can access their own client data.';
