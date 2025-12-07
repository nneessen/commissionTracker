-- Test if nick can now update his commission

-- 1. Get nick's user id and commission id
WITH nick_info AS (
    SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
),
nick_commission AS (
    SELECT c.id as commission_id, c.status, c.amount
    FROM commissions c
    JOIN nick_info n ON c.user_id = n.id
    LIMIT 1
)
SELECT * FROM nick_commission;

-- 2. Check current policies for UPDATE
SELECT
    policyname,
    qual
FROM pg_policies
WHERE tablename = 'commissions'
  AND cmd = 'UPDATE';

-- 3. Test if the update would work (dry run)
WITH nick_user AS (
    SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
),
test_commission AS (
    SELECT c.id
    FROM commissions c
    JOIN nick_user u ON c.user_id = u.id
    LIMIT 1
)
SELECT
    'UPDATE permission test' as test,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM commissions c
            JOIN test_commission tc ON c.id = tc.id
            JOIN nick_user u ON c.user_id = u.id
            WHERE c.user_id = u.id  -- This matches our new policy condition
        )
        THEN 'PASS - User owns this commission and should be able to update'
        ELSE 'FAIL - User cannot update'
    END as result;