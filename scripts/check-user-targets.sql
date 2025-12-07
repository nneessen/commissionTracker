-- Check user_targets for nick.neessen@gmail.com

-- 1. Get user ID
WITH nick_user AS (
    SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
)
SELECT
    'Nick User ID' as info,
    id::text as value
FROM nick_user;

-- 2. Check if any targets exist
SELECT
    'Targets Count' as info,
    COUNT(*)::text as value
FROM user_targets
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com');

-- 3. Show all targets for nick
SELECT *
FROM user_targets
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com');

-- 4. Check RLS policies on user_targets
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_targets'
ORDER BY cmd, policyname;

-- 5. Test if we can insert a target for nick
WITH nick_user AS (
    SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
)
SELECT
    'Can INSERT target?' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM nick_user
        )
        THEN 'YES - User exists and should be able to insert'
        ELSE 'NO - User not found'
    END as result;