-- supabase/migrations/20251126215444_add_user_profile_basic_fields.sql
-- Add missing basic user info fields to user_profiles table

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON user_profiles(user_id)
  WHERE user_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN user_profiles.user_id IS
  'References auth.users.id - can be NULL for recruits who do not have login accounts yet';

COMMENT ON COLUMN user_profiles.first_name IS
  'User first name';

COMMENT ON COLUMN user_profiles.last_name IS
  'User last name';

/*
-- ROLLBACK (if needed):
DROP INDEX IF EXISTS idx_user_profiles_user_id;
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS profile_photo_url,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS user_id;
*/
