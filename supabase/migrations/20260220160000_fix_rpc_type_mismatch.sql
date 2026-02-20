-- supabase/migrations/20260220160000_fix_rpc_type_mismatch.sql
-- Fix type mismatch: carriers.name is VARCHAR(255), not TEXT

DROP FUNCTION IF EXISTS get_available_carriers_for_recruit(UUID);

CREATE OR REPLACE FUNCTION get_available_carriers_for_recruit(p_recruit_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  contracting_metadata JSONB,
  priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.contracting_metadata,
    COALESCE((c.contracting_metadata->>'priority')::int, 999) AS priority
  FROM carriers c
  WHERE c.is_active = true
  AND c.id NOT IN (
    SELECT carrier_id
    FROM carrier_contract_requests
    WHERE recruit_id = p_recruit_id
  )
  ORDER BY priority ASC, c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_carriers_for_recruit(UUID) TO authenticated;

COMMENT ON FUNCTION get_available_carriers_for_recruit IS 'Returns carriers available for contracting (not yet requested by recruit), ordered by priority';
