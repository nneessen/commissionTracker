-- supabase/migrations/20260218142720_recruiting_notification_triggers.sql
-- Recruiting pipeline notification triggers.
-- Creates automatic notifications for phase completions, document events,
-- checklist progress, and recruit graduation.

--------------------------------------------------------------------------------
-- 1. Helper: notify_user
--    SECURITY DEFINER so it bypasses RLS.
--    Wrapped in exception handler so it NEVER fails the parent transaction.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that the target user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE WARNING 'notify_user: user % does not exist, skipping notification', p_user_id;
    RETURN;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata);

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_user failed for user %: % %', p_user_id, SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION notify_user IS
  'Insert a notification for a user. Never raises — logs warnings on failure to avoid breaking parent transactions.';

--------------------------------------------------------------------------------
-- 2. Trigger: Phase completed → notify recruiter
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_phase_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruiter_id UUID;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Look up the recruit's recruiter
  SELECT recruiter_id INTO v_recruiter_id
    FROM user_profiles
   WHERE id = NEW.user_id;

  IF v_recruiter_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM notify_user(
    v_recruiter_id,
    'phase_completed',
    'Phase completed: ' || COALESCE(NEW.phase_name, 'Unknown'),
    NULL,
    jsonb_build_object(
      'recruit_id', NEW.user_id,
      'phase_id', NEW.id,
      'phase_name', COALESCE(NEW.phase_name, ''),
      'phase_order', COALESCE(NEW.phase_order, 0),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_phase_completed ON onboarding_phases;
CREATE TRIGGER trg_notify_phase_completed
  AFTER UPDATE ON onboarding_phases
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_phase_completed();

--------------------------------------------------------------------------------
-- 3. Trigger: Phase advanced (in_progress) → notify recruit
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_phase_advanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes to 'in_progress'
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'in_progress' THEN
    RETURN NEW;
  END IF;

  PERFORM notify_user(
    NEW.user_id,
    'phase_advanced',
    'You''ve advanced to: ' || COALESCE(NEW.phase_name, 'Unknown'),
    NULL,
    jsonb_build_object(
      'phase_id', NEW.id,
      'phase_name', COALESCE(NEW.phase_name, ''),
      'phase_order', COALESCE(NEW.phase_order, 0),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_phase_advanced ON onboarding_phases;
CREATE TRIGGER trg_notify_phase_advanced
  AFTER UPDATE ON onboarding_phases
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_phase_advanced();

--------------------------------------------------------------------------------
-- 4. Trigger: Checklist item completed → notify recruiter
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_checklist_item_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruiter_id UUID;
  v_item_name TEXT;
BEGIN
  -- Only fire when status changes to 'completed' or 'approved'
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('completed', 'approved') THEN
    RETURN NEW;
  END IF;

  -- Look up the recruit's recruiter
  SELECT recruiter_id INTO v_recruiter_id
    FROM user_profiles
   WHERE id = NEW.user_id;

  IF v_recruiter_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the item name
  SELECT item_name INTO v_item_name
    FROM phase_checklist_items
   WHERE id = NEW.checklist_item_id;

  PERFORM notify_user(
    v_recruiter_id,
    'checklist_item_completed',
    'Checklist item completed: ' || COALESCE(v_item_name, 'Unknown'),
    NULL,
    jsonb_build_object(
      'recruit_id', NEW.user_id,
      'checklist_item_id', NEW.checklist_item_id,
      'item_name', COALESCE(v_item_name, ''),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_checklist_item_completed ON recruit_checklist_progress;
CREATE TRIGGER trg_notify_checklist_item_completed
  AFTER UPDATE ON recruit_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_checklist_item_completed();

--------------------------------------------------------------------------------
-- 5. Trigger: Document approved → notify recruit
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_document_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  PERFORM notify_user(
    NEW.user_id,
    'document_approved',
    'Document approved: ' || COALESCE(NEW.document_name, 'Unknown'),
    NULL,
    jsonb_build_object(
      'document_id', NEW.id,
      'document_name', COALESCE(NEW.document_name, ''),
      'document_type', COALESCE(NEW.document_type, ''),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_approved ON user_documents;
CREATE TRIGGER trg_notify_document_approved
  AFTER UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_document_approved();

--------------------------------------------------------------------------------
-- 6. Trigger: Document rejected → notify recruit
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_document_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'rejected' THEN
    RETURN NEW;
  END IF;

  PERFORM notify_user(
    NEW.user_id,
    'document_rejected',
    'Document rejected: ' || COALESCE(NEW.document_name, 'Unknown'),
    NULL,
    jsonb_build_object(
      'document_id', NEW.id,
      'document_name', COALESCE(NEW.document_name, ''),
      'document_type', COALESCE(NEW.document_type, ''),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_rejected ON user_documents;
CREATE TRIGGER trg_notify_document_rejected
  AFTER UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_document_rejected();

--------------------------------------------------------------------------------
-- 7. Trigger: Document uploaded → notify recruiter
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_document_uploaded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruiter_id UUID;
BEGIN
  -- Look up the recruit's recruiter
  SELECT recruiter_id INTO v_recruiter_id
    FROM user_profiles
   WHERE id = NEW.user_id;

  IF v_recruiter_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if the recruiter themselves uploaded it (avoid self-notification)
  IF NEW.uploaded_by = v_recruiter_id THEN
    RETURN NEW;
  END IF;

  PERFORM notify_user(
    v_recruiter_id,
    'document_uploaded',
    'New document uploaded: ' || COALESCE(NEW.document_name, 'Unknown'),
    NULL,
    jsonb_build_object(
      'recruit_id', NEW.user_id,
      'document_id', NEW.id,
      'document_name', COALESCE(NEW.document_name, ''),
      'document_type', COALESCE(NEW.document_type, ''),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_uploaded ON user_documents;
CREATE TRIGGER trg_notify_document_uploaded
  AFTER INSERT ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_document_uploaded();

--------------------------------------------------------------------------------
-- 8. Trigger: Recruit graduated → notify recruiter
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_recruit_graduated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_status IS NOT DISTINCT FROM OLD.onboarding_status THEN
    RETURN NEW;
  END IF;
  IF NEW.onboarding_status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.recruiter_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM notify_user(
    NEW.recruiter_id,
    'recruit_graduated',
    'Recruit graduated: ' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
    NULL,
    jsonb_build_object(
      'recruit_id', NEW.id,
      'recruit_name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
      'link', '/recruiting'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_recruit_graduated ON user_profiles;
CREATE TRIGGER trg_notify_recruit_graduated
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_recruit_graduated();
