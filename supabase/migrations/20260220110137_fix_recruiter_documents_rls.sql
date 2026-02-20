-- supabase/migrations/20260220110137_fix_recruiter_documents_rls.sql
-- Migration: Fix RLS policy for recruiters viewing recruit documents
-- Problem: Current policy logic is backwards - doesn't properly check if current user is the recruiter

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Recruiters can view their recruits' documents" ON user_documents;

-- Create corrected policy
-- Recruiters can view documents belonging to their recruits
CREATE POLICY "Recruiters can view their recruits' documents"
ON user_documents
FOR SELECT
TO authenticated
USING (
  -- Allow if current user is the recruiter of the document owner
  auth.uid() = (
    SELECT recruiter_id
    FROM user_profiles
    WHERE id = user_documents.user_id
  )
);

COMMENT ON POLICY "Recruiters can view their recruits' documents" ON user_documents IS
  'Allows recruiters to view documents uploaded by their recruits';
