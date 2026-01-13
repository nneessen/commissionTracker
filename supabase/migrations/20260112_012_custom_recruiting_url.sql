-- Add custom_recruiting_url column to user_profiles
-- Allows users to display their own custom domain URL for recruiting

ALTER TABLE user_profiles
ADD COLUMN custom_recruiting_url TEXT;

COMMENT ON COLUMN user_profiles.custom_recruiting_url IS
  'Optional custom URL for recruiting. If set, displayed instead of default thestandardhq.com URL. User is responsible for setting up their own domain redirect.';
