-- supabase/migrations/20260217101458_fix_remaining_view_security_invoker.sql
-- Set security_invoker = true on remaining commission views

BEGIN;

ALTER VIEW commission_chargeback_summary SET (security_invoker = true);
ALTER VIEW commission_earning_detail SET (security_invoker = true);
ALTER VIEW commission_earning_status SET (security_invoker = true);
ALTER VIEW commission_earning_summary SET (security_invoker = true);
ALTER VIEW unearned_commission_summary SET (security_invoker = true);

COMMIT;
