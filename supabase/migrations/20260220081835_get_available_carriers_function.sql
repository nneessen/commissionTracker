-- supabase/migrations/20260220081835_get_available_carriers_function.sql
-- Create function to get available carriers for contracting (ordered by priority)

CREATE OR REPLACE FUNCTION get_available_carriers_for_recruit(p_recruit_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
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
    c.logo_url,
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

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, version, description)
VALUES ('get_available_carriers_for_recruit', '20260220081835', 'Created function to get available carriers ordered by priority')
ON CONFLICT (function_name) DO UPDATE SET
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  updated_at = NOW();
