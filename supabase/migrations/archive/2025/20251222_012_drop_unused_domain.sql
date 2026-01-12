-- Migration: Drop unused max_report_months domain
-- The domain was created in migration 011 but never used.
-- The max months value (24) is hardcoded in validate_report_date_range function.

DROP DOMAIN IF EXISTS max_report_months;
