-- supabase/migrations/20260209110103_add_imo_submit_totals.sql
-- Flat IMO-level submit totals to avoid double-counting from hierarchical agency rows
-- Used by slack-policy-notification for IMO-level channels (where agency_id is null)

CREATE OR REPLACE FUNCTION get_imo_submit_totals(p_imo_id UUID)
RETURNS TABLE (
  wtd_ap NUMERIC, wtd_policies INTEGER,
  mtd_ap NUMERIC, mtd_policies INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;
  v_week_start := date_trunc('week', v_today)::DATE;
  v_month_start := date_trunc('month', v_today)::DATE;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN p.submit_date >= v_week_start THEN p.annual_premium ELSE 0 END), 0)::NUMERIC,
    COUNT(DISTINCT CASE WHEN p.submit_date >= v_week_start THEN p.id END)::INTEGER,
    COALESCE(SUM(p.annual_premium), 0)::NUMERIC,
    COUNT(DISTINCT p.id)::INTEGER
  FROM policies p
  WHERE p.imo_id = p_imo_id
    AND p.submit_date IS NOT NULL
    AND p.submit_date >= v_month_start
    AND p.submit_date <= v_today;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_submit_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_imo_submit_totals(UUID) TO service_role;
