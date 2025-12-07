-- Fix nick.neessen@gmail.com approval status

-- 1. Check current approval status
SELECT
    id,
    email,
    is_approved,
    onboarding_status
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- 2. Check is_user_approved function
SELECT
    auth.uid() as current_user_id,
    is_user_approved(
        (SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com')
    ) as is_approved_result;

-- 3. Update nick to be approved
UPDATE user_profiles
SET
    is_approved = true,
    onboarding_status = 'approved'
WHERE email = 'nick.neessen@gmail.com';

-- 4. Verify the fix
SELECT
    email,
    is_approved,
    onboarding_status,
    is_user_approved(id) as function_result
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- 5. Also drop the bad policies and recreate correct ones
DROP POLICY IF EXISTS "Approved users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;

-- Create simple policy that allows users to update their own commissions
CREATE POLICY "commissions_update_own_simple"
  ON commissions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can update all
CREATE POLICY "commissions_update_admin_simple"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND email = 'nick@nickneessen.com'
    )
  );

-- 6. Verify new policies
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'commissions'
  AND cmd = 'UPDATE';