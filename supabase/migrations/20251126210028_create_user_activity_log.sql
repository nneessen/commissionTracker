-- supabase/migrations/20251126210028_create_user_activity_log.sql
-- Create user_activity_log table for complete audit trail
-- Tracks all changes to user profiles, phases, documents, emails

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',
    'updated',
    'deleted',
    'phase_changed',
    'document_uploaded',
    'document_approved',
    'document_rejected',
    'email_sent',
    'status_changed',
    'note_added',
    'other'
  )),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id
  ON user_activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_performed_by
  ON user_activity_log(performed_by);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_created_at
  ON user_activity_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_type
  ON user_activity_log(action_type);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own activity, recruiters can view their recruits' activity
CREATE POLICY "Users can view their own activity log"
  ON user_activity_log FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = user_activity_log.user_id
    )
  );

CREATE POLICY "Recruiters can view their recruits' activity log"
  ON user_activity_log FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = (
        SELECT recruiter_id FROM user_profiles WHERE id = user_activity_log.user_id
      )
    )
  );

CREATE POLICY "Authenticated users can insert activity log entries"
  ON user_activity_log FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE id = user_activity_log.performed_by
    )
  );

-- Function to auto-log important user_profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_performed_by UUID;
  v_details JSONB;
BEGIN
  -- Get current authenticated user
  v_performed_by := (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1);

  -- Build details JSON with before/after values
  v_details := jsonb_build_object(
    'before', row_to_json(OLD),
    'after', row_to_json(NEW),
    'changed_fields', (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
    )
  );

  -- Log significant changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (NEW.id, v_performed_by, 'created', v_details);

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log onboarding status changes
    IF OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.id, v_performed_by, 'status_changed', jsonb_build_object(
        'field', 'onboarding_status',
        'old_value', OLD.onboarding_status,
        'new_value', NEW.onboarding_status
      ));
    END IF;

    -- Log phase changes
    IF OLD.current_onboarding_phase IS DISTINCT FROM NEW.current_onboarding_phase THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.id, v_performed_by, 'phase_changed', jsonb_build_object(
        'old_phase', OLD.current_onboarding_phase,
        'new_phase', NEW.current_onboarding_phase
      ));
    END IF;

    -- Log general updates (if something changed)
    IF v_details->'changed_fields' != '{}'::jsonb THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.id, v_performed_by, 'updated', v_details);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log user_profile changes
DROP TRIGGER IF EXISTS trigger_log_user_profile_changes ON user_profiles;
CREATE TRIGGER trigger_log_user_profile_changes
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_profile_changes();

-- Function to log document changes
CREATE OR REPLACE FUNCTION log_document_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_performed_by UUID;
BEGIN
  v_performed_by := (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (NEW.user_id, v_performed_by, 'document_uploaded', jsonb_build_object(
      'document_id', NEW.id,
      'document_type', NEW.document_type,
      'document_name', NEW.document_name,
      'file_name', NEW.file_name
    ));

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.user_id, v_performed_by, 'document_approved', jsonb_build_object(
        'document_id', NEW.id,
        'document_type', NEW.document_type,
        'document_name', NEW.document_name
      ));
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.user_id, v_performed_by, 'document_rejected', jsonb_build_object(
        'document_id', NEW.id,
        'document_type', NEW.document_type,
        'document_name', NEW.document_name,
        'notes', NEW.notes
      ));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log document changes
DROP TRIGGER IF EXISTS trigger_log_document_changes ON user_documents;
CREATE TRIGGER trigger_log_document_changes
  AFTER INSERT OR UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_changes();

-- Function to log email events
CREATE OR REPLACE FUNCTION log_email_events()
RETURNS TRIGGER AS $$
DECLARE
  v_performed_by UUID;
BEGIN
  v_performed_by := (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1);

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'sent' AND NEW.status = 'sent') THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (NEW.user_id, v_performed_by, 'email_sent', jsonb_build_object(
      'email_id', NEW.id,
      'subject', NEW.subject,
      'sent_at', NEW.sent_at
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log email events
DROP TRIGGER IF EXISTS trigger_log_email_events ON user_emails;
CREATE TRIGGER trigger_log_email_events
  AFTER INSERT OR UPDATE OF status ON user_emails
  FOR EACH ROW
  EXECUTE FUNCTION log_email_events();

-- Add comments
COMMENT ON TABLE user_activity_log IS
  'Complete audit trail for all user/recruit actions. Auto-populated by triggers + manual entries.';

COMMENT ON COLUMN user_activity_log.details IS
  'JSONB field with action-specific data (before/after values, changed fields, etc.)';

/*
-- ROLLBACK (if needed):
DROP TRIGGER IF EXISTS trigger_log_email_events ON user_emails;
DROP TRIGGER IF EXISTS trigger_log_document_changes ON user_documents;
DROP TRIGGER IF EXISTS trigger_log_user_profile_changes ON user_profiles;
DROP FUNCTION IF EXISTS log_email_events();
DROP FUNCTION IF EXISTS log_document_changes();
DROP FUNCTION IF EXISTS log_user_profile_changes();
DROP TABLE IF EXISTS user_activity_log CASCADE;
*/
