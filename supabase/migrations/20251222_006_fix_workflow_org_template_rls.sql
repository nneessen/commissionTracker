-- Fix: Add NULL check to org template RLS policy
-- Prevents matching templates with NULL imo_id when user has no IMO

-- Drop and recreate the IMO members view policy with NULL check
DROP POLICY IF EXISTS "IMO members can view org templates" ON workflows;

CREATE POLICY "IMO members can view org templates" ON workflows
FOR SELECT USING (
  is_org_template = true
  AND imo_id IS NOT NULL
  AND imo_id = get_my_imo_id()
);
