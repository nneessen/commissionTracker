-- supabase/migrations/20260211195938_fix_lead_vendor_heat_metrics.sql
--
-- Fix: previous migration had alias collision (lp.pack_id should be lp.id)
-- Also drops get_lead_vendor_weekly_activity (was in the now-neutralized 195843 migration).

-- Drop the old weekly activity function (safe if already dropped)
DROP FUNCTION IF EXISTS get_lead_vendor_weekly_activity();

CREATE OR REPLACE FUNCTION get_lead_vendor_heat_metrics()
RETURNS TABLE (
  vendor_id uuid,
  median_days_to_first_sale numeric,
  avg_days_to_first_sale numeric,
  packs_with_sales integer,
  avg_days_between_sales numeric,
  agents_purchased_30d integer,
  agents_with_sales_30d integer,
  avg_policies_per_pack numeric,
  days_since_last_sale integer,
  sales_last_30d integer,
  sales_last_90d integer,
  total_packs_90d integer,
  total_leads_90d integer,
  total_policies_all_time integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH vendor_scope AS (
    SELECT id FROM lead_vendors WHERE imo_id = get_my_imo_id()
  ),

  -- All lead purchases in last 90 days for scoped vendors
  recent_packs AS (
    SELECT
      lp.id as pack_id,
      lp.vendor_id,
      lp.user_id,
      lp.purchase_date,
      lp.lead_count
    FROM lead_purchases lp
    WHERE lp.vendor_id IN (SELECT id FROM vendor_scope)
      AND lp.purchase_date >= (CURRENT_DATE - INTERVAL '90 days')
  ),

  -- All policies linked to ANY lead purchase from scoped vendors
  linked_policies AS (
    SELECT
      p.id as policy_id,
      p.submit_date,
      p.user_id as agent_id,
      lp.id as pack_id,
      lp.vendor_id,
      lp.purchase_date as pack_purchase_date
    FROM policies p
    INNER JOIN lead_purchases lp ON lp.id = p.lead_purchase_id
    WHERE lp.vendor_id IN (SELECT id FROM vendor_scope)
  ),

  -- Time-to-first-sale per pack (90d packs only)
  pack_first_sale AS (
    SELECT
      rp.vendor_id,
      rp.pack_id,
      (MIN(lkp.submit_date)::date - rp.purchase_date::date) as days_to_first_sale
    FROM recent_packs rp
    INNER JOIN linked_policies lkp ON lkp.pack_id = rp.pack_id
    GROUP BY rp.vendor_id, rp.pack_id, rp.purchase_date
  ),

  vendor_first_sale_stats AS (
    SELECT
      vendor_id,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY days_to_first_sale) as median_days_to_first_sale,
      AVG(days_to_first_sale) as avg_days_to_first_sale,
      COUNT(*) as packs_with_sales
    FROM pack_first_sale
    GROUP BY vendor_id
  ),

  -- Inter-sale cadence: for packs with 2+ policies, avg gap between consecutive sales
  pack_policy_ranked AS (
    SELECT
      lkp.vendor_id,
      lkp.pack_id,
      lkp.submit_date,
      ROW_NUMBER() OVER (PARTITION BY lkp.pack_id ORDER BY lkp.submit_date) as rn
    FROM linked_policies lkp
    WHERE lkp.pack_id IN (SELECT pack_id FROM recent_packs)
  ),
  inter_sale_gaps AS (
    SELECT
      a.vendor_id,
      (b.submit_date::date - a.submit_date::date) as gap_days
    FROM pack_policy_ranked a
    INNER JOIN pack_policy_ranked b ON b.pack_id = a.pack_id AND b.rn = a.rn + 1
  ),
  vendor_cadence AS (
    SELECT
      vendor_id,
      AVG(gap_days) as avg_days_between_sales
    FROM inter_sale_gaps
    WHERE gap_days >= 0
    GROUP BY vendor_id
  ),

  -- Active agents last 30 days
  recent_purchasers AS (
    SELECT DISTINCT vendor_id, user_id
    FROM lead_purchases
    WHERE vendor_id IN (SELECT id FROM vendor_scope)
      AND purchase_date >= (CURRENT_DATE - INTERVAL '30 days')
  ),
  recent_sellers AS (
    SELECT DISTINCT lkp.vendor_id, lkp.agent_id as user_id
    FROM linked_policies lkp
    WHERE lkp.submit_date >= (CURRENT_DATE - INTERVAL '30 days')
  ),
  agents_30d AS (
    SELECT
      rp.vendor_id,
      COUNT(DISTINCT rp.user_id) as agents_purchased,
      COUNT(DISTINCT rs.user_id) as agents_with_sales
    FROM recent_purchasers rp
    LEFT JOIN recent_sellers rs ON rs.vendor_id = rp.vendor_id AND rs.user_id = rp.user_id
    GROUP BY rp.vendor_id
  ),

  -- Policies per pack (90d packs only)
  pack_policy_counts AS (
    SELECT
      rp.vendor_id,
      rp.pack_id,
      COUNT(lkp.policy_id) as policy_count
    FROM recent_packs rp
    LEFT JOIN linked_policies lkp ON lkp.pack_id = rp.pack_id
    GROUP BY rp.vendor_id, rp.pack_id
  ),
  vendor_pack_efficiency AS (
    SELECT
      vendor_id,
      AVG(policy_count)::numeric as avg_policies_per_pack
    FROM pack_policy_counts
    GROUP BY vendor_id
  ),

  -- Recency
  vendor_recency AS (
    SELECT
      vendor_id,
      COALESCE(CURRENT_DATE - MAX(submit_date)::date, 999) as days_since_last_sale
    FROM linked_policies
    GROUP BY vendor_id
  ),

  -- Freshness distribution
  vendor_freshness AS (
    SELECT
      vendor_id,
      COUNT(*) FILTER (WHERE submit_date >= (CURRENT_DATE - INTERVAL '30 days')) as sales_last_30d,
      COUNT(*) FILTER (WHERE submit_date >= (CURRENT_DATE - INTERVAL '90 days')) as sales_last_90d
    FROM linked_policies
    GROUP BY vendor_id
  ),

  -- Volume context
  vendor_volume AS (
    SELECT
      vendor_id,
      COUNT(*) as total_packs_90d,
      COALESCE(SUM(lead_count), 0) as total_leads_90d
    FROM recent_packs
    GROUP BY vendor_id
  ),
  vendor_total_policies AS (
    SELECT
      vendor_id,
      COUNT(*) as total_policies_all_time
    FROM linked_policies
    GROUP BY vendor_id
  )

  SELECT
    vs.id as vendor_id,
    COALESCE(vfs.median_days_to_first_sale, -1) as median_days_to_first_sale,
    COALESCE(vfs.avg_days_to_first_sale, -1) as avg_days_to_first_sale,
    COALESCE(vfs.packs_with_sales, 0)::integer as packs_with_sales,
    COALESCE(vc.avg_days_between_sales, -1) as avg_days_between_sales,
    COALESCE(a30.agents_purchased, 0)::integer as agents_purchased_30d,
    COALESCE(a30.agents_with_sales, 0)::integer as agents_with_sales_30d,
    COALESCE(vpe.avg_policies_per_pack, 0) as avg_policies_per_pack,
    COALESCE(vr.days_since_last_sale, 999)::integer as days_since_last_sale,
    COALESCE(vf.sales_last_30d, 0)::integer as sales_last_30d,
    COALESCE(vf.sales_last_90d, 0)::integer as sales_last_90d,
    COALESCE(vv.total_packs_90d, 0)::integer as total_packs_90d,
    COALESCE(vv.total_leads_90d, 0)::integer as total_leads_90d,
    COALESCE(vtp.total_policies_all_time, 0)::integer as total_policies_all_time
  FROM vendor_scope vs
  LEFT JOIN vendor_first_sale_stats vfs ON vfs.vendor_id = vs.id
  LEFT JOIN vendor_cadence vc ON vc.vendor_id = vs.id
  LEFT JOIN agents_30d a30 ON a30.vendor_id = vs.id
  LEFT JOIN vendor_pack_efficiency vpe ON vpe.vendor_id = vs.id
  LEFT JOIN vendor_recency vr ON vr.vendor_id = vs.id
  LEFT JOIN vendor_freshness vf ON vf.vendor_id = vs.id
  LEFT JOIN vendor_volume vv ON vv.vendor_id = vs.id
  LEFT JOIN vendor_total_policies vtp ON vtp.vendor_id = vs.id;
$$;

GRANT EXECUTE ON FUNCTION get_lead_vendor_heat_metrics() TO authenticated;

COMMENT ON FUNCTION get_lead_vendor_heat_metrics() IS
'Returns per-vendor heat metrics: time-to-first-sale, inter-sale cadence, active agent ratios, pack efficiency, recency, and freshness for client-side heat score computation.';
