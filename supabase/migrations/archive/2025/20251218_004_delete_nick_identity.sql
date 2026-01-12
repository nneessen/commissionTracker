-- supabase/migrations/20251218_004_delete_nick_identity.sql
-- Remove the nick@nickneessen.com identity from nickneessen@thestandardhq.com user
-- This allows nick@nickneessen.com to be used for a new user

DELETE FROM auth.identities
WHERE id = 'd86eb973-201a-47c7-b019-5dbcf8bbf79e'
  AND identity_data->>'email' = 'nick@nickneessen.com';
