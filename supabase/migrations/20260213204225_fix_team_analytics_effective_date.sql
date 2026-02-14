-- Fix get_team_analytics_data to use effective_date instead of submit_date/created_at
-- This aligns with the established design decision:
--   Total AP = ALL submissions with effective_date in the selected date range
--   Policy date filtering always uses effective_date, never submit_date or created_at

-- Function version: 20260213204225
DROP FUNCTION IF EXISTS get_team_analytics_data(uuid[], timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_team_analytics_data(
  p_team_user_ids uuid[],
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_result json;
  v_caller_id uuid;
BEGIN
  -- Get the calling user's ID for security check
  v_caller_id := auth.uid();

  -- Security check: Verify caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Build the result JSON with all required data
  SELECT json_build_object(
    'policies', COALESCE((
      SELECT json_agg(row_to_json(p))
      FROM (
        SELECT
          pol.id,
          pol.user_id,
          pol.status,
          pol.lifecycle_status,
          pol.annual_premium,
          pol.effective_date,
          pol.product,
          pol.carrier_id,
          pol.client_id,
          pol.policy_number,
          pol.created_at,
          pol.submit_date,
          pol.cancellation_date,
          pol.commission_percentage,
          pol.term_length,
          -- Handle both JSON and plain text formats for address
          CASE
            WHEN cl.address IS NULL THEN 'Unknown'
            WHEN cl.address LIKE '{%' THEN COALESCE((cl.address::jsonb)->>'state', 'Unknown')
            ELSE cl.address
          END AS client_state
        FROM policies pol
        LEFT JOIN clients cl ON cl.id = pol.client_id
        WHERE pol.user_id = ANY(p_team_user_ids)
          AND pol.effective_date >= p_start_date::date
          AND pol.effective_date <= p_end_date::date
      ) p
    ), '[]'::json),
    'commissions', COALESCE((
      SELECT json_agg(row_to_json(c))
      FROM (
        SELECT
          c.id,
          c.user_id,
          c.policy_id,
          c.amount AS commission_amount,
          c.type AS commission_type,
          c.status AS payment_status,
          COALESCE(c.payment_date, c.created_at::date) AS effective_date,
          p.carrier_id,
          p.product AS product_type,
          c.earned_amount,
          c.unearned_amount,
          c.months_paid,
          c.advance_months,
          c.chargeback_amount,
          c.chargeback_date,
          c.payment_date,
          c.created_at
        FROM commissions c
        LEFT JOIN policies p ON p.id = c.policy_id
        WHERE c.user_id = ANY(p_team_user_ids)
          AND c.created_at >= p_start_date
          AND c.created_at <= p_end_date
      ) c
    ), '[]'::json),
    'all_policies', COALESCE((
      SELECT json_agg(row_to_json(ap))
      FROM (
        SELECT
          pol.id,
          pol.user_id,
          pol.status,
          pol.lifecycle_status,
          pol.annual_premium,
          pol.effective_date,
          pol.product,
          pol.carrier_id,
          pol.client_id,
          pol.policy_number,
          pol.created_at,
          pol.submit_date,
          pol.cancellation_date,
          pol.updated_at,
          pol.commission_percentage,
          pol.term_length,
          -- Handle both JSON and plain text formats for address
          CASE
            WHEN cl.address IS NULL THEN 'Unknown'
            WHEN cl.address LIKE '{%' THEN COALESCE((cl.address::jsonb)->>'state', 'Unknown')
            ELSE cl.address
          END AS client_state
        FROM policies pol
        LEFT JOIN clients cl ON cl.id = pol.client_id
        WHERE pol.user_id = ANY(p_team_user_ids)
      ) ap
    ), '[]'::json),
    'all_commissions', COALESCE((
      SELECT json_agg(row_to_json(ac))
      FROM (
        SELECT
          c.id,
          c.user_id,
          c.policy_id,
          c.amount AS commission_amount,
          c.type AS commission_type,
          c.status AS payment_status,
          COALESCE(c.payment_date, c.created_at::date) AS effective_date,
          p.carrier_id,
          p.product AS product_type,
          c.earned_amount,
          c.unearned_amount,
          c.months_paid,
          c.advance_months,
          c.chargeback_amount,
          c.chargeback_date,
          c.payment_date,
          c.created_at,
          c.last_payment_date
        FROM commissions c
        LEFT JOIN policies p ON p.id = c.policy_id
        WHERE c.user_id = ANY(p_team_user_ids)
      ) ac
    ), '[]'::json),
    'agent_targets', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          user_id,
          annual_policies_target,
          avg_premium_target,
          annual_income_target,
          monthly_income_target,
          monthly_expense_target
        FROM user_targets
        WHERE user_id = ANY(p_team_user_ids)
      ) t
    ), '[]'::json),
    'carriers', COALESCE((
      SELECT json_agg(row_to_json(cr))
      FROM (
        SELECT DISTINCT ON (carriers.id)
          carriers.id,
          carriers.name
        FROM carriers
        INNER JOIN policies ON policies.carrier_id = carriers.id
        WHERE policies.user_id = ANY(p_team_user_ids)
      ) cr
    ), '[]'::json),
    'clients', COALESCE((
      SELECT json_agg(row_to_json(cl))
      FROM (
        SELECT DISTINCT ON (clients.id)
          clients.id,
          clients.name
        FROM clients
        INNER JOIN policies ON policies.client_id = clients.id
        WHERE policies.user_id = ANY(p_team_user_ids)
      ) cl
    ), '[]'::json),
    'agent_profiles', COALESCE((
      SELECT json_agg(row_to_json(u))
      FROM (
        SELECT
          id,
          first_name,
          last_name,
          email,
          contract_level,
          roles,
          approval_status,
          COALESCE(state, resident_state) AS state
        FROM user_profiles
        WHERE id = ANY(p_team_user_ids)
      ) u
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_analytics_data(uuid[], timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION get_team_analytics_data IS
'Fetches aggregated analytics data for a team of users.
Returns policies, commissions, targets, carriers, clients, and agent profiles.
Policy date filtering uses effective_date for accurate time-period filtering.
all_policies returns ALL policies (no date filter) for persistency calculations.';
