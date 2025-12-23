-- Fix user_documents INSERT RLS policy
-- The existing policy has incorrect logic that doesn't allow recruiters to insert documents for their recruits

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Recruiters can insert documents for their recruits" ON user_documents;

-- Create corrected INSERT policy for recruiters
-- Recruiters can insert documents where the user_id belongs to one of their recruits
CREATE POLICY "Recruiters can insert documents for their recruits"
ON user_documents FOR INSERT
TO public
WITH CHECK (
  auth.uid() = (
    SELECT recruiter_id
    FROM user_profiles
    WHERE id = user_documents.user_id
  )
);

-- Also allow users to insert their own documents
CREATE POLICY "Users can insert their own documents"
ON user_documents FOR INSERT
TO public
WITH CHECK (
  auth.uid() = (
    SELECT id
    FROM user_profiles
    WHERE id = user_documents.user_id
  )
);

-- Allow users to update their own documents
CREATE POLICY "Users can update their own documents"
ON user_documents FOR UPDATE
TO public
USING (
  auth.uid() = (
    SELECT id
    FROM user_profiles
    WHERE id = user_documents.user_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT id
    FROM user_profiles
    WHERE id = user_documents.user_id
  )
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON user_documents FOR DELETE
TO public
USING (
  auth.uid() = (
    SELECT id
    FROM user_profiles
    WHERE id = user_documents.user_id
  )
);
