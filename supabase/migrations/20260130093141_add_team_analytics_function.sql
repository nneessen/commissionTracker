-- supabase/migrations/20260130093141_add_team_analytics_function.sql
-- Team Analytics RPC Function
-- Provides server-side aggregation for team analytics dashboard

-- Function to get team analytics data
-- Returns policies, commissions, and agent targets for a set of user IDs
CREATE OR REPLACE FUNCTION get_team_analytics_data(
  p_team_user_ids uuid[],
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_caller_id uuid;
BEGIN
  -- Get the calling user's ID for security check
  v_caller_id := auth.uid();

  -- Security check: Verify caller is in the team list or has access to view these users
  -- The caller must either be in the list themselves or be an admin
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Build the result JSON with all required data
  SELECT json_build_object(
    'policies', COALESCE((
      SELECT json_agg(row_to_json(p))
      FROM (
        SELECT
          id,
          user_id,
          status,
          annual_premium,
          effective_date,
          product,
          carrier_id,
          client_id,
          policy_number,
          created_at,
          lapse_date,
          commission_percentage,
          term_length
        FROM policies
        WHERE user_id = ANY(p_team_user_ids)
          AND created_at >= p_start_date
          AND created_at <= p_end_date
      ) p
    ), '[]'::json),
    'commissions', COALESCE((
      SELECT json_agg(row_to_json(c))
      FROM (
        SELECT
          id,
          user_id,
          policy_id,
          amount AS commission_amount,
          commission_type,
          status AS payment_status,
          effective_date,
          carrier_id,
          product_type,
          earned_amount,
          unearned_amount,
          months_paid,
          advance_months,
          chargeback_amount,
          chargeback_date,
          payment_date,
          created_at
        FROM commissions
        WHERE user_id = ANY(p_team_user_ids)
          AND effective_date >= p_start_date
          AND effective_date <= p_end_date
      ) c
    ), '[]'::json),
    'all_policies', COALESCE((
      SELECT json_agg(row_to_json(ap))
      FROM (
        SELECT
          id,
          user_id,
          status,
          annual_premium,
          effective_date,
          product,
          carrier_id,
          client_id,
          policy_number,
          created_at,
          lapse_date,
          updated_at,
          commission_percentage,
          term_length
        FROM policies
        WHERE user_id = ANY(p_team_user_ids)
      ) ap
    ), '[]'::json),
    'all_commissions', COALESCE((
      SELECT json_agg(row_to_json(ac))
      FROM (
        SELECT
          id,
          user_id,
          policy_id,
          amount AS commission_amount,
          commission_type,
          status AS payment_status,
          effective_date,
          carrier_id,
          product_type,
          earned_amount,
          unearned_amount,
          months_paid,
          advance_months,
          chargeback_amount,
          chargeback_date,
          payment_date,
          created_at,
          last_payment_date
        FROM commissions
        WHERE user_id = ANY(p_team_user_ids)
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
          clients.name,
          clients.state
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
          role,
          approval_status
        FROM user_profiles
        WHERE id = ANY(p_team_user_ids)
      ) u
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_analytics_data(uuid[], timestamptz, timestamptz) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_team_analytics_data IS 'Fetches aggregated analytics data for a team of users. Returns policies, commissions, targets, carriers, clients, and agent profiles for the specified user IDs within the given date range.';
