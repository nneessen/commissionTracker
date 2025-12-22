-- Migration: Add organization awareness to expenses
-- Enables managers to view their downline's expenses
-- Enables IMO admins to view/aggregate all expenses in their IMO

-- ============================================================================
-- 1. Add organization columns to expenses
-- ============================================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS imo_id uuid REFERENCES imos(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL;

-- Add indexes for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_expenses_imo_id ON expenses(imo_id) WHERE imo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_agency_id ON expenses(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_imo_date ON expenses(imo_id, date DESC) WHERE imo_id IS NOT NULL;

-- ============================================================================
-- 2. Backfill existing expenses with org IDs from user_profiles
-- ============================================================================

UPDATE expenses e
SET
  imo_id = up.imo_id,
  agency_id = up.agency_id
FROM user_profiles up
WHERE e.user_id = up.id
  AND (e.imo_id IS NULL OR e.agency_id IS NULL);

-- ============================================================================
-- 3. Create trigger to auto-populate org IDs on insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_expense_org_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if not already provided
  IF NEW.imo_id IS NULL OR NEW.agency_id IS NULL THEN
    SELECT imo_id, agency_id INTO NEW.imo_id, NEW.agency_id
    FROM user_profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_expense_org_ids ON expenses;
CREATE TRIGGER trigger_set_expense_org_ids
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_expense_org_ids();

-- ============================================================================
-- 4. Add RLS policies for hierarchy visibility
-- ============================================================================

-- Policy: Uplines can view their direct downlines' expenses
CREATE POLICY "Uplines can view downline expenses" ON expenses FOR SELECT
USING (
  is_upline_of(user_id)
);

-- Policy: IMO admins can view all expenses in their IMO
CREATE POLICY "IMO admins can view all expenses in own IMO" ON expenses FOR SELECT
USING (
  is_imo_admin() AND imo_id = get_my_imo_id()
);

-- Policy: Super admins can view all expenses
CREATE POLICY "Super admins can view all expenses" ON expenses FOR SELECT
USING (is_super_admin());

-- ============================================================================
-- 5. Create function to get downline expenses with aggregation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_downline_expenses(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  owner_name text,
  name varchar(255),
  description text,
  amount numeric(10,2),
  category text,
  date date,
  expense_type expense_type,
  is_tax_deductible boolean,
  is_recurring boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    e.name,
    e.description,
    e.amount,
    e.category,
    e.date,
    e.expense_type,
    e.is_tax_deductible,
    e.is_recurring,
    e.created_at
  FROM expenses e
  INNER JOIN user_profiles up ON e.user_id = up.id
  WHERE
    e.user_id IS NOT NULL
    AND e.user_id IN (
      SELECT target.id
      FROM user_profiles target
      INNER JOIN user_profiles me ON me.id = auth.uid()
      WHERE
        me.agency_id IS NOT NULL
        AND target.agency_id IS NOT NULL
        AND target.agency_id = me.agency_id
        AND target.hierarchy_path IS NOT NULL
        AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
        AND target.id != auth.uid()
    )
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
  ORDER BY e.date DESC, owner_name, e.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_downline_expenses(date, date) TO authenticated;

-- ============================================================================
-- 6. Create function to get downline expense summary by agent
-- ============================================================================

CREATE OR REPLACE FUNCTION get_downline_expense_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  owner_name text,
  total_amount numeric,
  expense_count bigint,
  business_amount numeric,
  personal_amount numeric,
  tax_deductible_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.user_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COUNT(e.id) as expense_count,
    COALESCE(SUM(CASE WHEN e.expense_type = 'business' THEN e.amount ELSE 0 END), 0) as business_amount,
    COALESCE(SUM(CASE WHEN e.expense_type = 'personal' THEN e.amount ELSE 0 END), 0) as personal_amount,
    COALESCE(SUM(CASE WHEN e.is_tax_deductible THEN e.amount ELSE 0 END), 0) as tax_deductible_amount
  FROM expenses e
  INNER JOIN user_profiles up ON e.user_id = up.id
  WHERE
    e.user_id IS NOT NULL
    AND e.user_id IN (
      SELECT target.id
      FROM user_profiles target
      INNER JOIN user_profiles me ON me.id = auth.uid()
      WHERE
        me.agency_id IS NOT NULL
        AND target.agency_id IS NOT NULL
        AND target.agency_id = me.agency_id
        AND target.hierarchy_path IS NOT NULL
        AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
        AND target.id != auth.uid()
    )
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
  GROUP BY e.user_id, up.first_name, up.last_name, up.email
  ORDER BY total_amount DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_downline_expense_summary(date, date) TO authenticated;

-- ============================================================================
-- 7. Create function to get IMO expense summary (for IMO admins)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_expense_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  owner_name text,
  agency_name text,
  total_amount numeric,
  expense_count bigint,
  business_amount numeric,
  personal_amount numeric,
  tax_deductible_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow IMO admins
  IF NOT is_imo_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.user_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    COALESCE(a.name, 'No Agency') as agency_name,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COUNT(e.id) as expense_count,
    COALESCE(SUM(CASE WHEN e.expense_type = 'business' THEN e.amount ELSE 0 END), 0) as business_amount,
    COALESCE(SUM(CASE WHEN e.expense_type = 'personal' THEN e.amount ELSE 0 END), 0) as personal_amount,
    COALESCE(SUM(CASE WHEN e.is_tax_deductible THEN e.amount ELSE 0 END), 0) as tax_deductible_amount
  FROM expenses e
  INNER JOIN user_profiles up ON e.user_id = up.id
  LEFT JOIN agencies a ON up.agency_id = a.id
  WHERE
    e.user_id IS NOT NULL
    AND e.imo_id = get_my_imo_id()
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
  GROUP BY e.user_id, up.first_name, up.last_name, up.email, a.name
  ORDER BY total_amount DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_expense_summary(date, date) TO authenticated;

-- ============================================================================
-- 8. Create function to get IMO expense totals by category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_expense_by_category(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  category text,
  total_amount numeric,
  expense_count bigint,
  avg_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow IMO admins
  IF NOT is_imo_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.category,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COUNT(e.id) as expense_count,
    CASE
      WHEN COUNT(e.id) > 0 THEN COALESCE(SUM(e.amount), 0) / COUNT(e.id)
      ELSE 0
    END as avg_amount
  FROM expenses e
  WHERE
    e.imo_id = get_my_imo_id()
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
  GROUP BY e.category
  ORDER BY total_amount DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_expense_by_category(date, date) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN expenses.imo_id IS 'IMO organization this expense belongs to (inherited from user_profiles)';
COMMENT ON COLUMN expenses.agency_id IS 'Agency this expense belongs to (inherited from user_profiles)';

COMMENT ON FUNCTION set_expense_org_ids() IS
'Trigger function to auto-populate imo_id and agency_id from user_profiles on expense insert';

COMMENT ON FUNCTION get_downline_expenses(date, date) IS
'Returns all expenses from downline agents with optional date filtering';

COMMENT ON FUNCTION get_downline_expense_summary(date, date) IS
'Returns expense totals aggregated by downline agent';

COMMENT ON FUNCTION get_imo_expense_summary(date, date) IS
'Returns expense totals aggregated by user for entire IMO (admin only)';

COMMENT ON FUNCTION get_imo_expense_by_category(date, date) IS
'Returns expense totals aggregated by category for entire IMO (admin only)';
