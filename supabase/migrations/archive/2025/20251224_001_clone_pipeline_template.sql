-- ============================================================================
-- Clone Pipeline Template RPC Function
-- ============================================================================
-- Creates a full copy of a pipeline template including:
-- - The template itself (with new name)
-- - All phases (with correct phase_order)
-- - All checklist items for each phase
-- - All automations (both phase and item level)
-- ============================================================================

BEGIN;

-- Create the clone function
CREATE OR REPLACE FUNCTION clone_pipeline_template(
  p_template_id uuid,
  p_new_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_template RECORD;
  v_new_template_id uuid;
  v_user_id uuid;
  v_imo_id uuid;
  v_phase RECORD;
  v_new_phase_id uuid;
  v_item RECORD;
  v_new_item_id uuid;
  v_automation RECORD;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get the user's IMO
  v_imo_id := get_my_imo_id();

  -- Validate new name is not empty
  IF p_new_name IS NULL OR trim(p_new_name) = '' THEN
    RAISE EXCEPTION 'Template name cannot be empty';
  END IF;

  -- Validate new name is unique within the IMO
  IF EXISTS (
    SELECT 1 FROM pipeline_templates
    WHERE name = trim(p_new_name)
    AND (
      (imo_id = v_imo_id)
      OR (imo_id IS NULL AND v_imo_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'A template with this name already exists';
  END IF;

  -- Get source template (must be in user's IMO or shared)
  SELECT * INTO v_source_template
  FROM pipeline_templates
  WHERE id = p_template_id
    AND (
      imo_id = v_imo_id
      OR imo_id IS NULL
    );

  IF v_source_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or not accessible';
  END IF;

  -- 1. Clone the template
  INSERT INTO pipeline_templates (
    name,
    description,
    is_active,
    is_default,
    imo_id,
    created_by
  ) VALUES (
    trim(p_new_name),
    v_source_template.description,
    v_source_template.is_active,
    false,  -- Never clone as default
    v_imo_id,
    v_user_id
  )
  RETURNING id INTO v_new_template_id;

  -- 2. Clone all phases
  FOR v_phase IN
    SELECT * FROM pipeline_phases
    WHERE template_id = p_template_id
    ORDER BY phase_order
  LOOP
    INSERT INTO pipeline_phases (
      template_id,
      phase_name,
      phase_description,
      phase_order,
      estimated_days,
      auto_advance,
      required_approver_role,
      is_active,
      visible_to_recruit
    ) VALUES (
      v_new_template_id,
      v_phase.phase_name,
      v_phase.phase_description,
      v_phase.phase_order,
      v_phase.estimated_days,
      v_phase.auto_advance,
      v_phase.required_approver_role,
      v_phase.is_active,
      v_phase.visible_to_recruit
    )
    RETURNING id INTO v_new_phase_id;

    -- Clone phase-level automations
    FOR v_automation IN
      SELECT * FROM pipeline_automations
      WHERE phase_id = v_phase.id
    LOOP
      INSERT INTO pipeline_automations (
        phase_id,
        checklist_item_id,
        trigger_type,
        communication_type,
        delay_days,
        recipients,
        email_template_id,
        email_subject,
        email_body_html,
        notification_title,
        notification_message,
        sms_message,
        is_active
      ) VALUES (
        v_new_phase_id,
        NULL,  -- Phase-level automation has no checklist_item_id
        v_automation.trigger_type,
        v_automation.communication_type,
        v_automation.delay_days,
        v_automation.recipients,
        v_automation.email_template_id,
        v_automation.email_subject,
        v_automation.email_body_html,
        v_automation.notification_title,
        v_automation.notification_message,
        v_automation.sms_message,
        v_automation.is_active
      );
    END LOOP;

    -- 3. Clone checklist items for this phase
    FOR v_item IN
      SELECT * FROM phase_checklist_items
      WHERE phase_id = v_phase.id
      ORDER BY item_order
    LOOP
      INSERT INTO phase_checklist_items (
        phase_id,
        item_type,
        item_name,
        item_description,
        item_order,
        is_required,
        can_be_completed_by,
        requires_verification,
        verification_by,
        external_link,
        document_type,
        metadata,
        is_active,
        visible_to_recruit
      ) VALUES (
        v_new_phase_id,
        v_item.item_type,
        v_item.item_name,
        v_item.item_description,
        v_item.item_order,
        v_item.is_required,
        v_item.can_be_completed_by,
        v_item.requires_verification,
        v_item.verification_by,
        v_item.external_link,
        v_item.document_type,
        v_item.metadata,
        v_item.is_active,
        v_item.visible_to_recruit
      )
      RETURNING id INTO v_new_item_id;

      -- Clone checklist item-level automations
      FOR v_automation IN
        SELECT * FROM pipeline_automations
        WHERE checklist_item_id = v_item.id
      LOOP
        INSERT INTO pipeline_automations (
          phase_id,
          checklist_item_id,
          trigger_type,
          communication_type,
          delay_days,
          recipients,
          email_template_id,
          email_subject,
          email_body_html,
          notification_title,
          notification_message,
          sms_message,
          is_active
        ) VALUES (
          NULL,  -- Checklist item-level automation has no phase_id
          v_new_item_id,
          v_automation.trigger_type,
          v_automation.communication_type,
          v_automation.delay_days,
          v_automation.recipients,
          v_automation.email_template_id,
          v_automation.email_subject,
          v_automation.email_body_html,
          v_automation.notification_title,
          v_automation.notification_message,
          v_automation.sms_message,
          v_automation.is_active
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_new_template_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clone_pipeline_template(uuid, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION clone_pipeline_template IS
'Clones a pipeline template with all phases, checklist items, and automations.
Parameters:
  - p_template_id: UUID of the template to clone
  - p_new_name: Name for the new template (must be unique within IMO)
Returns: UUID of the newly created template
Raises exception if:
  - User is not authenticated
  - New name is empty or already exists
  - Source template is not accessible';

COMMIT;
