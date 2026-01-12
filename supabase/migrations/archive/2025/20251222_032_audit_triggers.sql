-- Migration: Audit Triggers
-- Phase 11: Audit Trail & Activity Logs
-- Automatic capture of INSERT/UPDATE/DELETE on critical tables

-- ============================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- ============================================

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

    -- Get org from OLD record if not from user
    IF v_imo_id IS NULL AND OLD.imo_id IS NOT NULL THEN
      v_imo_id := OLD.imo_id;
    END IF;
    IF v_agency_id IS NULL AND OLD.agency_id IS NOT NULL THEN
      v_agency_id := OLD.agency_id;
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_action_type := TG_TABLE_NAME || '_created';

    -- Get org from NEW record if not from user
    IF v_imo_id IS NULL AND NEW.imo_id IS NOT NULL THEN
      v_imo_id := NEW.imo_id;
    END IF;
    IF v_agency_id IS NULL AND NEW.agency_id IS NOT NULL THEN
      v_agency_id := NEW.agency_id;
    END IF;

  ELSE -- UPDATE
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_action_type := TG_TABLE_NAME || '_updated';

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

    -- Get org from NEW record if not from user
    IF v_imo_id IS NULL AND NEW.imo_id IS NOT NULL THEN
      v_imo_id := NEW.imo_id;
    END IF;
    IF v_agency_id IS NULL AND NEW.agency_id IS NOT NULL THEN
      v_agency_id := NEW.agency_id;
    END IF;
  END IF;

  -- For user_profiles table, the record itself is the user
  -- Try to get org from the profile record
  IF TG_TABLE_NAME = 'user_profiles' THEN
    IF TG_OP = 'DELETE' THEN
      v_imo_id := COALESCE(v_imo_id, OLD.imo_id);
      v_agency_id := COALESCE(v_agency_id, OLD.agency_id);
    ELSE
      v_imo_id := COALESCE(v_imo_id, NEW.imo_id);
      v_agency_id := COALESCE(v_agency_id, NEW.agency_id);
    END IF;
  END IF;

  -- For policies/commissions, try to get org from agent
  IF TG_TABLE_NAME IN ('policies', 'commissions', 'override_commissions') THEN
    DECLARE
      v_agent_id UUID;
    BEGIN
      IF TG_OP = 'DELETE' THEN
        v_agent_id := OLD.agent_id;
      ELSE
        v_agent_id := NEW.agent_id;
      END IF;

      IF v_agent_id IS NOT NULL AND (v_imo_id IS NULL OR v_agency_id IS NULL) THEN
        SELECT imo_id, agency_id
        INTO v_imo_id, v_agency_id
        FROM user_profiles
        WHERE id = v_agent_id;
      END IF;
    END;
  END IF;

  -- For clients, try to get org from agent
  IF TG_TABLE_NAME = 'clients' THEN
    DECLARE
      v_agent_id UUID;
    BEGIN
      IF TG_OP = 'DELETE' THEN
        v_agent_id := OLD.agent_id;
      ELSE
        v_agent_id := NEW.agent_id;
      END IF;

      IF v_agent_id IS NOT NULL AND (v_imo_id IS NULL OR v_agency_id IS NULL) THEN
        SELECT imo_id, agency_id
        INTO v_imo_id, v_agency_id
        FROM user_profiles
        WHERE id = v_agent_id;
      END IF;
    END;
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

-- ============================================
-- APPLY TRIGGERS TO CRITICAL TABLES
-- ============================================

-- Policies table
DROP TRIGGER IF EXISTS audit_policies ON policies;
CREATE TRIGGER audit_policies
AFTER INSERT OR UPDATE OR DELETE ON policies
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Commissions table
DROP TRIGGER IF EXISTS audit_commissions ON commissions;
CREATE TRIGGER audit_commissions
AFTER INSERT OR UPDATE OR DELETE ON commissions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Clients table
DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients
AFTER INSERT OR UPDATE OR DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User profiles table
DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
CREATE TRIGGER audit_user_profiles
AFTER INSERT OR UPDATE OR DELETE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Override commissions table
DROP TRIGGER IF EXISTS audit_override_commissions ON override_commissions;
CREATE TRIGGER audit_override_commissions
AFTER INSERT OR UPDATE OR DELETE ON override_commissions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION audit_trigger_func() IS 'Generic audit trigger that captures INSERT/UPDATE/DELETE operations with user and org context';
