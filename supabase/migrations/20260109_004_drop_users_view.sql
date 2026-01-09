-- supabase/migrations/20260109_004_drop_users_view.sql
-- Migration: Drop legacy users view
-- The previous migration (20260109_003) failed to drop this because it's a VIEW, not a TABLE

DROP VIEW IF EXISTS public.users CASCADE;
