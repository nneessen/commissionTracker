-- supabase/migrations/20260214133328_lead_vendor_admin_v2.sql
-- Lead Vendor Admin V2: Pack-level tables, conversion-focused heat, recent policies, workflow events

-- ============================================================================
-- 1A. get_lead_pack_list: Pack-level rows with vendor/agent names + total_premium
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_pack_list(
  p_imo_id uuid DEFAULT NULL,
  p_freshness text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  pack_id uuid,
  purchase_name varchar,
  vendor_id uuid,
  vendor_name varchar,
  agent_id uuid,
  agent_name text,
  purchase_date date,
  lead_freshness text,
  lead_count integer,
  total_cost numeric,
  cost_per_lead numeric,
  policies_sold integer,
  commission_earned numeric,
  roi_percentage numeric,
  total_premium numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lp.id as pack_id,
    lp.purchase_name,
    lp.vendor_id,
    lv.name as vendor_name,
    lp.user_id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') as agent_name,
    lp.purchase_date,
    lp.lead_freshness::text,
    lp.lead_count,
    lp.total_cost,
    lp.cost_per_lead,
    lp.policies_sold,
    lp.commission_earned,
    lp.roi_percentage,
    COALESCE((
      SELECT SUM(p.annual_premium)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
    ), 0) as total_premium
  FROM lead_purchases lp
  INNER JOIN lead_vendors lv ON lv.id = lp.vendor_id
  LEFT JOIN user_profiles up ON up.id = lp.user_id
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id())
    AND (p_freshness IS NULL OR lp.lead_freshness::text = p_freshness)
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date)
  ORDER BY lp.purchase_date DESC;
$$;

-- ============================================================================
-- 1B. get_lead_recent_policies: Recent policies from lead packs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_recent_policies(
  p_imo_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  policy_id uuid,
  effective_date date,
  submit_date date,
  policy_number varchar,
  client_name text,
  product text,
  annual_premium numeric,
  agent_id uuid,
  agent_name text,
  vendor_id uuid,
  vendor_name varchar,
  pack_id uuid,
  pack_name varchar,
  lead_freshness text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id as policy_id,
    p.effective_date,
    p.submit_date,
    p.policy_number,
    COALESCE(c.first_name || ' ' || c.last_name, 'Unknown') as client_name,
    COALESCE(pr.name, '') as product,
    p.annual_premium,
    p.user_id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') as agent_name,
    lv.id as vendor_id,
    lv.name as vendor_name,
    lp.id as pack_id,
    lp.purchase_name as pack_name,
    lp.lead_freshness::text,
    p.status::text
  FROM policies p
  INNER JOIN lead_purchases lp ON lp.id = p.lead_purchase_id
  INNER JOIN lead_vendors lv ON lv.id = lp.vendor_id
  LEFT JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN products pr ON pr.id = p.product_id
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id())
  ORDER BY COALESCE(p.effective_date, p.submit_date) DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- 1C. get_lead_pack_heat_metrics: Per-pack heat data for new algorithm
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_pack_heat_metrics(
  p_imo_id uuid DEFAULT NULL
)
RETURNS TABLE (
  pack_id uuid,
  vendor_id uuid,
  total_premium numeric,
  total_cost numeric,
  lead_count integer,
  policies_sold integer,
  commission_earned numeric,
  days_since_purchase integer,
  days_since_last_sale integer,
  sales_last_30d integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lp.id as pack_id,
    lp.vendor_id,
    COALESCE((
      SELECT SUM(p.annual_premium)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
    ), 0) as total_premium,
    lp.total_cost,
    lp.lead_count,
    lp.policies_sold,
    lp.commission_earned,
    (CURRENT_DATE - lp.purchase_date)::integer as days_since_purchase,
    COALESCE((
      SELECT (CURRENT_DATE - MAX(p.submit_date)::date)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
    ), 999)::integer as days_since_last_sale,
    COALESCE((
      SELECT COUNT(*)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
        AND p.submit_date >= (CURRENT_DATE - INTERVAL '30 days')
    ), 0)::integer as sales_last_30d
  FROM lead_purchases lp
  INNER JOIN lead_vendors lv ON lv.id = lp.vendor_id
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id());
$$;

-- ============================================================================
-- 1D. Update get_lead_vendor_admin_overview to include total_premium
-- ============================================================================
DROP FUNCTION IF EXISTS get_lead_vendor_admin_overview(uuid, date, date);

CREATE OR REPLACE FUNCTION get_lead_vendor_admin_overview(
  p_imo_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name varchar,
  contact_name varchar,
  contact_email varchar,
  contact_phone varchar,
  website varchar,
  notes text,
  created_at timestamptz,
  last_purchase_date date,
  total_purchases bigint,
  total_leads integer,
  total_spent numeric,
  total_policies integer,
  total_commission numeric,
  avg_cost_per_lead numeric,
  avg_roi numeric,
  conversion_rate numeric,
  unique_users bigint,
  fresh_leads integer,
  aged_leads integer,
  fresh_spent numeric,
  aged_spent numeric,
  total_premium numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lv.id as vendor_id,
    lv.name as vendor_name,
    lv.contact_name,
    lv.contact_email,
    lv.contact_phone,
    lv.website,
    lv.notes,
    lv.created_at,
    MAX(lp.purchase_date) as last_purchase_date,
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
    END as conversion_rate,
    COUNT(DISTINCT lp.user_id)::bigint as unique_users,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'fresh' THEN lp.lead_count ELSE 0 END), 0)::integer as fresh_leads,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'aged' THEN lp.lead_count ELSE 0 END), 0)::integer as aged_leads,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'fresh' THEN lp.total_cost ELSE 0 END), 0) as fresh_spent,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'aged' THEN lp.total_cost ELSE 0 END), 0) as aged_spent,
    COALESCE((
      SELECT SUM(p.annual_premium)
      FROM policies p
      INNER JOIN lead_purchases lp2 ON lp2.id = p.lead_purchase_id
      WHERE lp2.vendor_id = lv.id
        AND (p_start_date IS NULL OR lp2.purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR lp2.purchase_date <= p_end_date)
    ), 0) as total_premium
  FROM lead_vendors lv
  LEFT JOIN lead_purchases lp ON lp.vendor_id = lv.id
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date)
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id())
  GROUP BY lv.id, lv.name, lv.contact_name, lv.contact_email,
           lv.contact_phone, lv.website, lv.notes, lv.created_at
  ORDER BY total_spent DESC NULLS LAST;
$$;

-- ============================================================================
-- 1E. Seed trigger_event_types for lead events
-- ============================================================================
INSERT INTO trigger_event_types (event_name, category, description, available_variables, is_active)
VALUES
  (
    'lead.pack_purchased',
    'lead',
    'Fired when a new lead pack is purchased',
    '{"vendor_name": "Name of the lead vendor", "agent_name": "Name of the purchasing agent", "lead_count": "Number of leads in the pack", "total_cost": "Total cost of the pack", "lead_freshness": "Fresh or Aged", "cost_per_lead": "Cost per lead", "purchase_name": "Name of the lead pack"}'::jsonb,
    true
  ),
  (
    'lead.conversion_threshold',
    'lead',
    'Fired when a lead pack crosses 15% conversion rate',
    '{"agent_name": "Name of the agent", "vendor_name": "Name of the vendor", "pack_name": "Name of the lead pack", "conversion_rate": "Current conversion rate percentage", "policies_sold": "Number of policies sold", "lead_count": "Total leads in the pack"}'::jsonb,
    true
  )
ON CONFLICT (event_name) DO NOTHING;

-- ============================================================================
-- 1F. Conversion threshold DB trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION check_lead_pack_conversion_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversion_rate numeric;
  v_vendor_name varchar;
  v_agent_name text;
  v_pack_name varchar;
  v_lead_count integer;
  v_old_rate numeric;
BEGIN
  -- Only proceed if policies_sold increased
  IF NEW.policies_sold <= OLD.policies_sold THEN
    RETURN NEW;
  END IF;

  -- Must have leads to compute rate
  IF NEW.lead_count <= 0 THEN
    RETURN NEW;
  END IF;

  v_conversion_rate := (NEW.policies_sold::numeric / NEW.lead_count) * 100;
  v_old_rate := (OLD.policies_sold::numeric / NEW.lead_count) * 100;

  -- Only fire if crossing 15% threshold upward
  IF v_old_rate >= 15 OR v_conversion_rate < 15 THEN
    RETURN NEW;
  END IF;

  -- Look up context
  SELECT lv.name INTO v_vendor_name
  FROM lead_vendors lv WHERE lv.id = NEW.vendor_id;

  SELECT COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') INTO v_agent_name
  FROM user_profiles up WHERE up.id = NEW.user_id;

  v_pack_name := COALESCE(NEW.purchase_name, 'Unnamed Pack');
  v_lead_count := NEW.lead_count;

  -- Record the event for the client-side workflow emitter
  INSERT INTO workflow_events (event_name, context, fired_at, workflows_triggered)
  VALUES (
    'lead.conversion_threshold',
    jsonb_build_object(
      'agentName', v_agent_name,
      'vendorName', v_vendor_name,
      'packName', v_pack_name,
      'conversionRate', ROUND(v_conversion_rate, 1),
      'policiesSold', NEW.policies_sold,
      'leadCount', v_lead_count,
      'packId', NEW.id
    ),
    NOW(),
    0
  );

  -- Create pending workflow runs for matching workflows
  INSERT INTO workflow_runs (workflow_id, trigger_source, status, context)
  SELECT
    w.id,
    'event:lead.conversion_threshold',
    'pending',
    jsonb_build_object(
      'eventName', 'lead.conversion_threshold',
      'agentName', v_agent_name,
      'vendorName', v_vendor_name,
      'packName', v_pack_name,
      'conversionRate', ROUND(v_conversion_rate, 1),
      'policiesSold', NEW.policies_sold,
      'leadCount', v_lead_count,
      'triggeredBy', 'system',
      'triggeredAt', NOW()
    )
  FROM workflows w
  WHERE w.status = 'active'
    AND w.trigger_type = 'event'
    AND w.config->'trigger'->>'eventName' = 'lead.conversion_threshold';

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_lead_pack_conversion_threshold ON lead_purchases;

CREATE TRIGGER trg_lead_pack_conversion_threshold
  AFTER UPDATE OF policies_sold ON lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION check_lead_pack_conversion_threshold();
