-- Debug script to check commission RLS policies and permissions

-- 1. Check all RLS policies on commissions table
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'commissions'
ORDER BY policyname;

-- 2. Check if the new policies exist
SELECT COUNT(*) as new_policies_count
FROM pg_policies
WHERE tablename = 'commissions'
  AND policyname IN ('commissions_update_own', 'commissions_update_all');

-- 3. Check what commission records exist for nick.neessen@gmail.com
-- First get the user ID
WITH user_info AS (
    SELECT id, email
    FROM auth.users
    WHERE email = 'nick.neessen@gmail.com'
)
SELECT
    c.id as commission_id,
    c.user_id,
    c.status,
    c.amount,
    u.email as user_email,
    p.policy_number
FROM commissions c
JOIN user_info u ON c.user_id = u.id
LEFT JOIN policies p ON c.policy_id = p.id;

-- 4. Check has_permission function with actual user
WITH user_info AS (
    SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
)
SELECT
    has_permission(id, 'commissions.update.own') as can_update_own,
    has_permission(id, 'commissions.read.own') as can_read_own,
    has_permission(id, 'commissions.update.all') as can_update_all,
    is_admin_user(id) as is_admin
FROM user_info;

-- 5. Check the actual permissions table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'permissions'
ORDER BY ordinal_position;

-- 6. Test what happens when we try to select a commission as nick
-- This will show if the issue is with SELECT or UPDATE
WITH test_user AS (
    SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
),
test_commission AS (
    SELECT c.id
    FROM commissions c
    JOIN test_user u ON c.user_id = u.id
    LIMIT 1
)
SELECT
    'Can user see their own commission?' as test,
    CASE
        WHEN EXISTS (SELECT 1 FROM test_commission)
        THEN 'YES - User can SELECT their commission'
        ELSE 'NO - User cannot even SELECT their commission'
    END as result;