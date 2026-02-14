-- supabase/migrations/20260212165109_fix_audit_trigger_columns.sql
-- Fix: audit_trigger_func() references columns that don't exist on policies,
-- commissions, override_commissions, and clients tables.
-- This causes EXCEPTION subtransactions on every write, which under load
-- cascades into connection exhaustion and 522 timeouts.
--
-- Fix: Use JSONB field access (to_jsonb(NEW)->>'col') instead of direct
-- column access (NEW.col). Returns NULL when column doesn't exist instead
-- of throwing an exception.

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed_fields TEXT[];
  v_imo_id UUID;
  v_agency_id UUID;
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_record_id UUID;
  v_action_type TEXT;
  v_row_jsonb JSONB;
  v_agent_id UUID;
BEGIN
  -- Get current user from session
  v_user_id := auth.uid();

  -- Get user details for denormalization
  IF v_user_id IS NOT NULL THEN
    SELECT
      COALESCE(first_name || ' ' || last_name, email),
      email,
      imo_id,
      agency_id
    INTO v_user_name, v_user_email, v_imo_id, v_agency_id
    FROM user_profiles
    WHERE id = v_user_id;
  END IF;

  -- Determine record ID, old/new data, and org context based on operation
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_action_type := TG_TABLE_NAME || '_deleted';
    v_row_jsonb := v_old_data;

    -- Get org from OLD record if not from user (JSONB access - safe for any table)
    IF v_imo_id IS NULL THEN
      v_imo_id := (v_row_jsonb->>'imo_id')::UUID;
    END IF;
    IF v_agency_id IS NULL THEN
      v_agency_id := (v_row_jsonb->>'agency_id')::UUID;
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_action_type := TG_TABLE_NAME || '_created';
    v_row_jsonb := v_new_data;

    -- Get org from NEW record if not from user (JSONB access - safe for any table)
    IF v_imo_id IS NULL THEN
      v_imo_id := (v_row_jsonb->>'imo_id')::UUID;
    END IF;
    IF v_agency_id IS NULL THEN
      v_agency_id := (v_row_jsonb->>'agency_id')::UUID;
    END IF;

  ELSE -- UPDATE
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_action_type := TG_TABLE_NAME || '_updated';
    v_row_jsonb := v_new_data;

    -- Calculate which fields changed
    SELECT array_agg(key ORDER BY key)
    INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(v_new_data) new_vals
      FULL OUTER JOIN jsonb_each(v_old_data) old_vals USING (key)
      WHERE new_vals.value IS DISTINCT FROM old_vals.value
        -- Exclude timestamp fields from changed list
        AND key NOT IN ('updated_at', 'created_at')
    ) changed;

    -- Skip if no meaningful changes (only timestamps changed)
    IF v_changed_fields IS NULL OR array_length(v_changed_fields, 1) = 0 THEN
      RETURN NEW;
    END IF;

    -- Get org from NEW record if not from user (JSONB access - safe for any table)
    IF v_imo_id IS NULL THEN
      v_imo_id := (v_row_jsonb->>'imo_id')::UUID;
    END IF;
    IF v_agency_id IS NULL THEN
      v_agency_id := (v_row_jsonb->>'agency_id')::UUID;
    END IF;
  END IF;

  -- For user_profiles table, the record itself is the user
  -- user_profiles HAS imo_id and agency_id columns, but JSONB access works fine here too
  IF TG_TABLE_NAME = 'user_profiles' THEN
    v_imo_id := COALESCE(v_imo_id, (v_row_jsonb->>'imo_id')::UUID);
    v_agency_id := COALESCE(v_agency_id, (v_row_jsonb->>'agency_id')::UUID);
  END IF;

  -- For policies/commissions/override_commissions, try to get org from agent
  -- These tables use different column names: agent_id, user_id, or base_agent_id
  IF TG_TABLE_NAME IN ('policies', 'commissions', 'override_commissions') THEN
    v_agent_id := COALESCE(
      (v_row_jsonb->>'agent_id')::UUID,
      (v_row_jsonb->>'user_id')::UUID,
      (v_row_jsonb->>'base_agent_id')::UUID
    );

    IF v_agent_id IS NOT NULL AND (v_imo_id IS NULL OR v_agency_id IS NULL) THEN
      SELECT imo_id, agency_id
      INTO v_imo_id, v_agency_id
      FROM user_profiles
      WHERE id = v_agent_id;
    END IF;
  END IF;

  -- For clients, try to get org from agent
  -- clients table uses user_id, not agent_id
  IF TG_TABLE_NAME = 'clients' THEN
    v_agent_id := COALESCE(
      (v_row_jsonb->>'agent_id')::UUID,
      (v_row_jsonb->>'user_id')::UUID
    );

    IF v_agent_id IS NOT NULL AND (v_imo_id IS NULL OR v_agency_id IS NULL) THEN
      SELECT imo_id, agency_id
      INTO v_imo_id, v_agency_id
      FROM user_profiles
      WHERE id = v_agent_id;
    END IF;
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    imo_id,
    agency_id,
    table_name,
    record_id,
    action,
    performed_by,
    performed_by_name,
    performed_by_email,
    old_data,
    new_data,
    changed_fields,
    source,
    action_type
  ) VALUES (
    v_imo_id,
    v_agency_id,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP::audit_action,
    v_user_id,
    v_user_name,
    v_user_email,
    v_old_data,
    v_new_data,
    v_changed_fields,
    'trigger',
    v_action_type
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the operation
  RAISE WARNING 'Audit trigger error on %: %', TG_TABLE_NAME, SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION audit_trigger_func() IS 'Generic audit trigger that captures INSERT/UPDATE/DELETE operations with user and org context. Uses JSONB field access for schema-agnostic column resolution.';
