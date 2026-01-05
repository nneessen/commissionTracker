-- Migration: Lead Vendors and Lead Purchases Tables
-- Enables tracking of life insurance lead pack purchases with ROI calculation
-- Lead vendors are IMO-shared, lead purchases follow expense visibility rules

-- ============================================================================
-- 1. Create lead_freshness enum for lead type
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_freshness') THEN
    CREATE TYPE lead_freshness AS ENUM ('fresh', 'aged');
  END IF;
END
$$;

COMMENT ON TYPE lead_freshness IS 'Indicates whether leads are fresh (high-intent) or aged';

-- ============================================================================
-- 2. Create lead_vendors table (IMO-shared)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Vendor info
  name varchar(255) NOT NULL,
  contact_name varchar(255),
  contact_email varchar(255),
  contact_phone varchar(50),
  website varchar(500),
  notes text,

  -- Status
  is_active boolean NOT NULL DEFAULT true,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique vendor name per IMO
  CONSTRAINT lead_vendors_imo_name_unique UNIQUE (imo_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_vendors_imo_id ON lead_vendors(imo_id);
CREATE INDEX IF NOT EXISTS idx_lead_vendors_name ON lead_vendors(name);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_lead_vendors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_lead_vendors_updated_at ON lead_vendors;
CREATE TRIGGER trigger_lead_vendors_updated_at
  BEFORE UPDATE ON lead_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_vendors_updated_at();

-- ============================================================================
-- 3. RLS Policies for lead_vendors (IMO-shared visibility)
-- ============================================================================

ALTER TABLE lead_vendors ENABLE ROW LEVEL SECURITY;

-- All users in the same IMO can view vendors
CREATE POLICY "Users can view vendors in their IMO"
  ON lead_vendors FOR SELECT
  TO authenticated
  USING (imo_id = get_my_imo_id());

-- All users in the same IMO can create vendors
CREATE POLICY "Users can create vendors in their IMO"
  ON lead_vendors FOR INSERT
  TO authenticated
  WITH CHECK (imo_id = get_my_imo_id());

-- Only the creator or IMO admin can update vendors
CREATE POLICY "Creator or admin can update vendors"
  ON lead_vendors FOR UPDATE
  TO authenticated
  USING (
    imo_id = get_my_imo_id()
    AND (created_by = auth.uid() OR is_imo_admin())
  )
  WITH CHECK (imo_id = get_my_imo_id());

-- Only IMO admin can delete vendors
CREATE POLICY "IMO admin can delete vendors"
  ON lead_vendors FOR DELETE
  TO authenticated
  USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- Super admins can do anything
CREATE POLICY "Super admins can manage all vendors"
  ON lead_vendors FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- 4. Create lead_purchases table
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imo_id uuid REFERENCES imos(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,

  -- Link to expense record
  expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,

  -- Link to vendor
  vendor_id uuid NOT NULL REFERENCES lead_vendors(id) ON DELETE RESTRICT,

  -- Purchase details
  purchase_name varchar(255), -- Optional label like "March 2024 Lead Pack"
  lead_freshness lead_freshness NOT NULL DEFAULT 'fresh',
  lead_count integer NOT NULL CHECK (lead_count > 0),
  total_cost numeric(10,2) NOT NULL CHECK (total_cost >= 0),

  -- Auto-calculated cost per lead
  cost_per_lead numeric(10,2) GENERATED ALWAYS AS (
    CASE WHEN lead_count > 0 THEN total_cost / lead_count ELSE 0 END
  ) STORED,

  -- Dates
  purchase_date date NOT NULL,

  -- ROI tracking (manual entry)
  policies_sold integer NOT NULL DEFAULT 0 CHECK (policies_sold >= 0),
  commission_earned numeric(10,2) NOT NULL DEFAULT 0 CHECK (commission_earned >= 0),

  -- Auto-calculated ROI percentage: ((commission - cost) / cost) * 100
  roi_percentage numeric(10,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_cost > 0 THEN ((commission_earned - total_cost) / total_cost) * 100
      ELSE 0
    END
  ) STORED,

  -- Notes
  notes text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_purchases_user_id ON lead_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_imo_id ON lead_purchases(imo_id) WHERE imo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_purchases_vendor_id ON lead_purchases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_expense_id ON lead_purchases(expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_purchases_purchase_date ON lead_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_user_date ON lead_purchases(user_id, purchase_date DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_lead_purchases_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_lead_purchases_updated_at ON lead_purchases;
CREATE TRIGGER trigger_lead_purchases_updated_at
  BEFORE UPDATE ON lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_purchases_updated_at();

-- ============================================================================
-- 5. Auto-populate org IDs from user_profiles on insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_lead_purchase_org_ids()
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

DROP TRIGGER IF EXISTS trigger_set_lead_purchase_org_ids ON lead_purchases;
CREATE TRIGGER trigger_set_lead_purchase_org_ids
  BEFORE INSERT ON lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION set_lead_purchase_org_ids();

-- ============================================================================
-- 6. RLS Policies for lead_purchases (same as expenses)
-- ============================================================================

ALTER TABLE lead_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own lead purchases
CREATE POLICY "Users can view own lead purchases"
  ON lead_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own lead purchases
CREATE POLICY "Users can create own lead purchases"
  ON lead_purchases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own lead purchases
CREATE POLICY "Users can update own lead purchases"
  ON lead_purchases FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own lead purchases
CREATE POLICY "Users can delete own lead purchases"
  ON lead_purchases FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Uplines can view downline lead purchases
CREATE POLICY "Uplines can view downline lead purchases"
  ON lead_purchases FOR SELECT
  TO authenticated
  USING (is_upline_of(user_id));

-- IMO admins can view all lead purchases in their IMO
CREATE POLICY "IMO admins can view IMO lead purchases"
  ON lead_purchases FOR SELECT
  TO authenticated
  USING (is_imo_admin() AND imo_id = get_my_imo_id());

-- Super admins can view all
CREATE POLICY "Super admins can view all lead purchases"
  ON lead_purchases FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- ============================================================================
-- 7. Add lead_purchase_id FK to expenses table
-- ============================================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS lead_purchase_id uuid REFERENCES lead_purchases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_lead_purchase_id
  ON expenses(lead_purchase_id) WHERE lead_purchase_id IS NOT NULL;

-- ============================================================================
-- 8. Helper function: Get lead purchase stats for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_purchase_stats(
  p_user_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_purchases bigint,
  total_leads integer,
  total_spent numeric,
  total_policies integer,
  total_commission numeric,
  avg_cost_per_lead numeric,
  avg_roi numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Default to current user if not specified
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_purchases,
    COALESCE(SUM(lp.lead_count), 0)::integer as total_leads,
    COALESCE(SUM(lp.total_cost), 0) as total_spent,
    COALESCE(SUM(lp.policies_sold), 0)::integer as total_policies,
    COALESCE(SUM(lp.commission_earned), 0) as total_commission,
    CASE
      WHEN SUM(lp.lead_count) > 0 THEN SUM(lp.total_cost) / SUM(lp.lead_count)
      ELSE 0
    END as avg_cost_per_lead,
    CASE
      WHEN SUM(lp.total_cost) > 0 THEN ((SUM(lp.commission_earned) - SUM(lp.total_cost)) / SUM(lp.total_cost)) * 100
      ELSE 0
    END as avg_roi,
    CASE
      WHEN SUM(lp.lead_count) > 0 THEN (SUM(lp.policies_sold)::numeric / SUM(lp.lead_count)) * 100
      ELSE 0
    END as conversion_rate
  FROM lead_purchases lp
  WHERE lp.user_id = v_user_id
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date);
END;
$$;

GRANT EXECUTE ON FUNCTION get_lead_purchase_stats(uuid, date, date) TO authenticated;

-- ============================================================================
-- 9. Helper function: Get lead purchase stats by vendor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_stats_by_vendor(
  p_user_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name varchar,
  total_purchases bigint,
  total_leads integer,
  total_spent numeric,
  total_policies integer,
  total_commission numeric,
  avg_cost_per_lead numeric,
  avg_roi numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    lv.id as vendor_id,
    lv.name as vendor_name,
    COUNT(lp.id)::bigint as total_purchases,
    COALESCE(SUM(lp.lead_count), 0)::integer as total_leads,
    COALESCE(SUM(lp.total_cost), 0) as total_spent,
    COALESCE(SUM(lp.policies_sold), 0)::integer as total_policies,
    COALESCE(SUM(lp.commission_earned), 0) as total_commission,
    CASE
      WHEN SUM(lp.lead_count) > 0 THEN SUM(lp.total_cost) / SUM(lp.lead_count)
      ELSE 0
    END as avg_cost_per_lead,
    CASE
      WHEN SUM(lp.total_cost) > 0 THEN ((SUM(lp.commission_earned) - SUM(lp.total_cost)) / SUM(lp.total_cost)) * 100
      ELSE 0
    END as avg_roi,
    CASE
      WHEN SUM(lp.lead_count) > 0 THEN (SUM(lp.policies_sold)::numeric / SUM(lp.lead_count)) * 100
      ELSE 0
    END as conversion_rate
  FROM lead_vendors lv
  LEFT JOIN lead_purchases lp ON lp.vendor_id = lv.id
    AND lp.user_id = v_user_id
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date)
  WHERE lv.imo_id = (SELECT imo_id FROM user_profiles WHERE id = v_user_id)
  GROUP BY lv.id, lv.name
  ORDER BY total_spent DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_lead_stats_by_vendor(uuid, date, date) TO authenticated;

-- ============================================================================
-- 10. Comments
-- ============================================================================

COMMENT ON TABLE lead_vendors IS
'Lead vendors shared across an IMO. Users can add vendors, admins can delete.';

COMMENT ON TABLE lead_purchases IS
'Tracks life insurance lead pack purchases with ROI calculation. Links to expenses.';

COMMENT ON COLUMN lead_purchases.lead_freshness IS
'Indicates if leads are fresh (high-intent, recently generated) or aged (older leads, typically cheaper)';

COMMENT ON COLUMN lead_purchases.cost_per_lead IS
'Auto-calculated: total_cost / lead_count';

COMMENT ON COLUMN lead_purchases.roi_percentage IS
'Auto-calculated: ((commission_earned - total_cost) / total_cost) * 100';

COMMENT ON COLUMN expenses.lead_purchase_id IS
'Optional link to lead_purchases record when expense category is Life Insurance Leads';

COMMENT ON FUNCTION get_lead_purchase_stats(uuid, date, date) IS
'Returns aggregate lead purchase statistics for a user with optional date filtering';

COMMENT ON FUNCTION get_lead_stats_by_vendor(uuid, date, date) IS
'Returns lead purchase statistics grouped by vendor';
