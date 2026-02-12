-- supabase/migrations/20260211195843_lead_vendor_heat_metrics_v2.sql
--
-- NEUTRALIZED: This migration originally attempted to create get_lead_vendor_heat_metrics
-- but had an alias collision bug that caused CREATE to fail. The DROP of
-- get_lead_vendor_weekly_activity succeeded before the failure.
-- The working version is in 20260211195938_fix_lead_vendor_heat_metrics.sql.
--
-- Replaced with no-op to keep migration chain clean during replay.

SELECT 1; -- no-op
