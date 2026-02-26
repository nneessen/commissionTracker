-- supabase/migrations/20260226090544_fix_top_performers_report_overload.sql
-- Fix: Drop duplicate get_top_performers_report overload causing PostgREST ambiguity
--
-- Problem: Two overloads exist with the same param names in different order:
--   1. get_top_performers_report(p_start_date date, p_end_date date, p_limit integer)
--   2. get_top_performers_report(p_limit integer, p_start_date date, p_end_date date)
--
-- PostgREST sends named parameters, so it matches BOTH and returns:
--   "Could not choose the best candidate function between..."
--
-- Root cause: Migration 20260204153334 used CREATE OR REPLACE with param order
-- (p_start_date, p_end_date, p_limit) while the original was (p_limit, p_start_date, p_end_date).
-- PostgreSQL treats different parameter ORDER as a new overload.
--
-- Fix: Drop the (p_start_date, p_end_date, p_limit) version.
-- Keep the (p_limit, p_start_date, p_end_date) version which includes agent_email in return type.

DROP FUNCTION IF EXISTS get_top_performers_report(date, date, integer);

-- Verify only one overload remains
-- Expected: get_top_performers_report(p_limit integer, p_start_date date, p_end_date date)
