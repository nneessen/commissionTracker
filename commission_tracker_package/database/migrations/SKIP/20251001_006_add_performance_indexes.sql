-- supabase/migrations/20251001_006_add_performance_indexes_FIXED.sql
-- Add indexes for common query patterns to improve performance
-- CORRECTED VERSION: Based on actual database schema

-- =====================================================
-- COMMISSIONS TABLE INDEXES
-- =====================================================

-- Index for user_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_commissions_user_id
ON commissions(user_id)
WHERE user_id IS NOT NULL;

-- Index for policy_id lookups
CREATE INDEX IF NOT EXISTS idx_commissions_policy_id
ON commissions(policy_id)
WHERE policy_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_commissions_status
ON commissions(status);

-- Composite index for user + date range queries
CREATE INDEX IF NOT EXISTS idx_commissions_user_created
ON commissions(user_id, created_at DESC);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_commissions_user_status
ON commissions(user_id, status);

-- Index for payment_date ordering (actual column name)
CREATE INDEX IF NOT EXISTS idx_commissions_payment_date
ON commissions(payment_date DESC)
WHERE payment_date IS NOT NULL;

-- =====================================================
-- POLICIES TABLE INDEXES
-- =====================================================

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_policies_user_id
ON policies(user_id)
WHERE user_id IS NOT NULL;

-- Index for carrier lookups (text field, not carrier_id)
CREATE INDEX IF NOT EXISTS idx_policies_carrier
ON policies(carrier);

-- Index for policy_number lookups (unique searches)
CREATE INDEX IF NOT EXISTS idx_policies_policy_number
ON policies(policy_number);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_policies_status
ON policies(status);

-- Composite index for user + created date
CREATE INDEX IF NOT EXISTS idx_policies_user_created
ON policies(user_id, created_at DESC);

-- Index for client_id lookups (foreign key)
CREATE INDEX IF NOT EXISTS idx_policies_client_id
ON policies(client_id)
WHERE client_id IS NOT NULL;

-- Index for effective_date ordering
CREATE INDEX IF NOT EXISTS idx_policies_effective_date
ON policies(effective_date DESC);

-- Index for renewal_date
CREATE INDEX IF NOT EXISTS idx_policies_renewal_date
ON policies(renewal_date DESC)
WHERE renewal_date IS NOT NULL;

-- =====================================================
-- EXPENSES TABLE INDEXES
-- =====================================================

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_expenses_user_id
ON expenses(user_id)
WHERE user_id IS NOT NULL;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_expenses_category
ON expenses(category);

-- Index for date range queries (actual column name is 'date')
CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses(date DESC);

-- Composite index for user + date queries (using actual column name 'date')
CREATE INDEX IF NOT EXISTS idx_expenses_user_date
ON expenses(user_id, date DESC);

-- =====================================================
-- CHARGEBACKS TABLE INDEXES
-- =====================================================

-- Index for commission_id lookups (foreign key)
CREATE INDEX IF NOT EXISTS idx_chargebacks_commission_id
ON chargebacks(commission_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_chargebacks_status
ON chargebacks(status);

-- Index for chargeback_date ordering
CREATE INDEX IF NOT EXISTS idx_chargebacks_date
ON chargebacks(chargeback_date DESC);

-- Note: chargebacks doesn't have user_id or policy_id columns
-- Access is controlled via the commission_id relationship

-- =====================================================
-- CLIENTS TABLE INDEXES
-- =====================================================

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_clients_user_id
ON clients(user_id)
WHERE user_id IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_clients_email
ON clients(email)
WHERE email IS NOT NULL;

-- Index for name searches (case-insensitive) - single 'name' field
CREATE INDEX IF NOT EXISTS idx_clients_name_lower
ON clients(LOWER(name));

-- =====================================================
-- CARRIERS TABLE INDEXES
-- =====================================================

-- Index for name lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_carriers_name_lower
ON carriers(LOWER(name::text));

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_carriers_code
ON carriers(code)
WHERE code IS NOT NULL;

-- Note: carriers doesn't have is_active column

-- =====================================================
-- COMP_GUIDE TABLE INDEXES
-- =====================================================

-- Composite index for comp guide lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_comp_guide_lookup
ON comp_guide(carrier_id, product_type, comp_level);

-- Index for effective date filtering
CREATE INDEX IF NOT EXISTS idx_comp_guide_effective
ON comp_guide(effective_date DESC);

-- =====================================================
-- SETTINGS TABLE INDEXES
-- =====================================================

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id
ON settings(user_id);

-- =====================================================
-- VACUUM AND ANALYZE
-- =====================================================

-- Update table statistics for query planner
ANALYZE commissions;
ANALYZE policies;
ANALYZE expenses;
ANALYZE chargebacks;
ANALYZE clients;
ANALYZE carriers;
ANALYZE comp_guide;
ANALYZE settings;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'FIXED Performance indexes created successfully!';
  RAISE NOTICE 'This corrected version matches the actual schema.';
  RAISE NOTICE 'Removed indexes for non-existent columns:';
  RAISE NOTICE '- commissions: carrier_id, expected_date, year_earned, month_earned';
  RAISE NOTICE '- policies: carrier_id (using carrier text field instead)';
  RAISE NOTICE '- expenses: expense_date (using date field instead)';
  RAISE NOTICE '- clients: first_name, last_name (using name field instead)';
  RAISE NOTICE '- carriers: is_active';
  RAISE NOTICE '- chargebacks: user_id, policy_id';
  RAISE NOTICE 'Tables analyzed for query optimization.';
  RAISE NOTICE 'Query performance should be significantly improved.';
  RAISE NOTICE '======================================';
END $$;