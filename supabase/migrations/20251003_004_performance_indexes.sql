-- Performance Indexes for Pagination and Common Queries
-- Date: 2025-10-03
-- Purpose: Optimize queries for large datasets and cursor-based pagination

BEGIN;

-- ============================================
-- POLICIES TABLE INDEXES
-- ============================================

-- Primary cursor pagination index (id + created_at for ordering)
CREATE INDEX IF NOT EXISTS idx_policies_cursor_pagination
ON policies(created_at DESC, id);

-- User-based queries (for agent dashboards)
CREATE INDEX IF NOT EXISTS idx_policies_user_status_created
ON policies(user_id, status, created_at DESC)
WHERE user_id IS NOT NULL;

-- Carrier and product filtering
CREATE INDEX IF NOT EXISTS idx_policies_carrier_product_status
ON policies(carrier_id, product_id, status);

-- Date range queries (for reports and analytics)
CREATE INDEX IF NOT EXISTS idx_policies_effective_date_status
ON policies(effective_date DESC, status)
WHERE status = 'active';

-- Policy number lookup (unique for fast lookups)
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_policy_number_unique
ON policies(policy_number);

-- Commission calculations (annual premium queries)
CREATE INDEX IF NOT EXISTS idx_policies_premium_calc
ON policies(status, annual_premium)
WHERE status = 'active' AND annual_premium > 0;

-- ============================================
-- PRODUCTS TABLE INDEXES
-- ============================================

-- Carrier product lookup (common join pattern)
CREATE INDEX IF NOT EXISTS idx_products_carrier_active
ON products(carrier_id, is_active)
WHERE is_active = true;

-- Product type filtering
CREATE INDEX IF NOT EXISTS idx_products_type_active
ON products(product_type, is_active)
WHERE is_active = true;

-- Name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_products_name_lower
ON products(LOWER(name));

-- ============================================
-- CARRIERS TABLE INDEXES
-- ============================================

-- Name lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_carriers_name_lower
ON carriers(LOWER(name));

-- Code lookup (unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_carriers_code_unique
ON carriers(UPPER(code));

-- ============================================
-- COMP_GUIDE TABLE INDEXES
-- ============================================

-- Commission rate lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_comp_guide_lookup
ON comp_guide(carrier_id, product_type, comp_level, effective_date DESC);

-- Date-based commission queries
CREATE INDEX IF NOT EXISTS idx_comp_guide_effective_dates
ON comp_guide(effective_date DESC, expiration_date);

-- ============================================
-- COMMISSIONS TABLE INDEXES
-- ============================================

-- User commission queries
CREATE INDEX IF NOT EXISTS idx_commissions_user_payment_date
ON commissions(user_id, payment_date DESC)
WHERE user_id IS NOT NULL;

-- Policy-based commission lookups (skip if exists)
CREATE INDEX IF NOT EXISTS idx_commissions_policy
ON commissions(policy_id);

-- Status filtering for pending/paid commissions
CREATE INDEX IF NOT EXISTS idx_commissions_status_payment_date
ON commissions(status, payment_date DESC);

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update table statistics for query optimizer
ANALYZE policies;
ANALYZE products;
ANALYZE carriers;
ANALYZE comp_guide;
ANALYZE commissions;

-- ============================================
-- CREATE HELPER FUNCTIONS FOR PERFORMANCE
-- ============================================

-- Function to get policy count efficiently
CREATE OR REPLACE FUNCTION get_policy_count(
    p_status TEXT DEFAULT NULL,
    p_carrier_id UUID DEFAULT NULL,
    p_product_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM policies
    WHERE
        (p_status IS NULL OR status = p_status)
        AND (p_carrier_id IS NULL OR carrier_id = p_carrier_id)
        AND (p_product_id IS NULL OR product_id = p_product_id)
        AND (p_user_id IS NULL OR user_id = p_user_id);

    RETURN v_count;
END;
$$ LANGUAGE plpgsql
STABLE
PARALLEL SAFE;

-- Function for cursor-based pagination
CREATE OR REPLACE FUNCTION get_policies_paginated(
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_status TEXT DEFAULT NULL,
    p_carrier_id UUID DEFAULT NULL,
    p_product_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    policy_number VARCHAR,
    status policy_status,
    client JSONB,
    carrier_id UUID,
    product_id UUID,
    user_id UUID,
    product product_type,
    effective_date DATE,
    annual_premium DECIMAL,
    commission_percentage DECIMAL,
    payment_frequency payment_frequency,
    created_at TIMESTAMP WITH TIME ZONE,
    product_name VARCHAR,
    carrier_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.policy_number,
        p.status,
        p.client,
        p.carrier_id,
        p.product_id,
        p.user_id,
        p.product,
        p.effective_date,
        p.annual_premium,
        p.commission_percentage,
        p.payment_frequency,
        p.created_at,
        prod.name as product_name,
        c.name as carrier_name
    FROM policies p
    LEFT JOIN products prod ON p.product_id = prod.id
    LEFT JOIN carriers c ON p.carrier_id = c.id
    WHERE
        (p_cursor IS NULL OR p.created_at < p_cursor)
        AND (p_status IS NULL OR p.status = p_status::policy_status)
        AND (p_carrier_id IS NULL OR p.carrier_id = p_carrier_id)
        AND (p_product_id IS NULL OR p.product_id = p_product_id)
        AND (p_user_id IS NULL OR p.user_id = p_user_id)
    ORDER BY p.created_at DESC, p.id
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql
STABLE
PARALLEL SAFE;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('policies', 'products', 'carriers', 'comp_guide', 'commissions');

    RAISE NOTICE 'Performance optimization complete:';
    RAISE NOTICE '  Total indexes: %', index_count;
    RAISE NOTICE '  Tables analyzed: 5';
    RAISE NOTICE '  Helper functions created: 2';
END $$;

COMMIT;