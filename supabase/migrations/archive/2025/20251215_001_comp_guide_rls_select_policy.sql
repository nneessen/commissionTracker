-- supabase/migrations/20251215_001_comp_guide_rls_select_policy.sql
-- Add RLS SELECT policy for comp_guide table
-- This allows authenticated users to read commission rates for auto-calculation

-- First ensure RLS is enabled (idempotent)
ALTER TABLE public.comp_guide ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to read comp_guide" ON public.comp_guide;

-- Create SELECT policy for authenticated users
-- All authenticated users need to read comp_guide data to calculate commissions
CREATE POLICY "Allow authenticated users to read comp_guide"
ON public.comp_guide
FOR SELECT
TO authenticated
USING (true);

-- Note: INSERT/UPDATE/DELETE operations should remain restricted to admins
-- This migration only adds SELECT access for commission calculations
