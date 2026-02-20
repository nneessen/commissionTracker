-- supabase/migrations/20260220180000_fix_ambiguous_id_column.sql
-- Fix ambiguous "id" column reference in get_available_carriers_for_recruit
--
-- ISSUE: RETURNS TABLE creates PL/pgSQL variables (id, name, etc.) that conflict
-- with column names in queries. This causes "column reference 'id' is ambiguous" errors.
--
-- FIX: Qualify ALL column references with table names/aliases.

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
DECLARE
  v_recruit_imo_id UUID;
BEGIN
  -- SECURITY: Get recruit's IMO to ensure tenant isolation
  -- FIX: Qualify all column references to avoid conflict with RETURNS TABLE variables
  SELECT up.imo_id INTO v_recruit_imo_id
  FROM user_profiles up
  WHERE up.id = p_recruit_id;

  IF v_recruit_imo_id IS NULL THEN
    RAISE EXCEPTION 'Recruit not found or has no IMO';
  END IF;

  -- SECURITY: Verify caller has permission to access this recruit's data
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles up2
    WHERE up2.id = auth.uid()
    AND (
      -- Same recruit
      up2.id = p_recruit_id
      -- Or staff in same IMO
      OR (
        up2.imo_id = v_recruit_imo_id
        AND (up2.roles @> ARRAY['trainer']::text[]
             OR up2.roles @> ARRAY['contracting_manager']::text[]
             OR up2.is_admin = true)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.contracting_metadata,
    COALESCE((c.contracting_metadata->>'priority')::int, 999) AS priority
  FROM carriers c
  WHERE c.is_active = true
  AND c.imo_id = v_recruit_imo_id  -- IMO ISOLATION
  AND c.id NOT IN (
    SELECT ccr.carrier_id
    FROM carrier_contract_requests ccr
    WHERE ccr.recruit_id = p_recruit_id
  )
  ORDER BY priority ASC, c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_carriers_for_recruit(UUID) TO authenticated;

COMMENT ON FUNCTION get_available_carriers_for_recruit IS 'Returns carriers available for contracting (not yet requested by recruit), filtered by IMO, ordered by priority. Includes auth and tenant isolation checks. Fixed: qualified all column references to avoid ambiguity with RETURNS TABLE variables.';

-- Update function version tracking
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_available_carriers_for_recruit', '20260220180000')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
