-- Migration: Seed default password reminder automations for all IMOs
-- Creates default 24h and 12h warning automations for password setup reminders
-- These run 48h and 60h after user creation (giving 24h and 12h notice before 72h expiry)

-- =============================================================================
-- Insert default password reminder automations for each IMO
-- =============================================================================

DO $$
DECLARE
  v_imo RECORD;
  v_24h_id UUID;
  v_12h_id UUID;
BEGIN
  -- Loop through all active IMOs and create default automations
  FOR v_imo IN SELECT id, name FROM imos WHERE is_active = true
  LOOP
    -- Generate UUIDs for the automations
    v_24h_id := gen_random_uuid();
    v_12h_id := gen_random_uuid();

    -- Insert 24-hour warning automation (triggers 48h after creation)
    INSERT INTO pipeline_automations (
      id,
      imo_id,
      phase_id,
      checklist_item_id,
      trigger_type,
      communication_type,
      recipients,
      email_subject,
      email_body_html,
      notification_title,
      notification_message,
      sms_message,
      is_active
    ) VALUES (
      v_24h_id,
      v_imo.id,
      NULL,
      NULL,
      'password_not_set_24h',
      'email',
      '[]'::JSONB,  -- Recipients ignored for password reminders (always sends to user)
      '⏰ 24 Hours Left: Complete Your Account Setup',
      E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">Your Account Setup is Almost Expiring</h2>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    Hi {{user_name}},
  </p>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    You have <strong>{{hours_remaining}} hours</strong> remaining to set your password and complete your account setup.
  </p>

  <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="color: #856404; margin: 0; font-size: 14px;">
      <strong>⚠️ Important:</strong> Your invite link will expire in 24 hours. After expiration, you''ll need to request a new invitation from your administrator.
    </p>
  </div>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    Click the link in your original invitation email to set your password, or contact your administrator if you need a new link.
  </p>

  <p style="color: #6c757d; font-size: 14px; margin-top: 32px;">
    If you''ve already set your password, please disregard this message.
  </p>
</div>',
      'Password Setup Reminder',
      'You have 24 hours left to set your password. Please check your email for the invitation link.',
      NULL,  -- No SMS for password reminders by default
      true
    )
    ON CONFLICT DO NOTHING;

    -- Insert 12-hour warning automation (triggers 60h after creation)
    INSERT INTO pipeline_automations (
      id,
      imo_id,
      phase_id,
      checklist_item_id,
      trigger_type,
      communication_type,
      recipients,
      email_subject,
      email_body_html,
      notification_title,
      notification_message,
      sms_message,
      is_active
    ) VALUES (
      v_12h_id,
      v_imo.id,
      NULL,
      NULL,
      'password_not_set_12h',
      'email',
      '[]'::JSONB,  -- Recipients ignored for password reminders (always sends to user)
      '🚨 Final Notice: 12 Hours to Complete Account Setup',
      E'<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #dc3545; margin-bottom: 16px;">Final Reminder: Your Invite Expires Soon!</h2>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    Hi {{user_name}},
  </p>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    This is your <strong>final reminder</strong>. You have only <strong>{{hours_remaining}} hours</strong> left to set your password.
  </p>

  <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="color: #721c24; margin: 0; font-size: 14px;">
      <strong>🚨 Action Required:</strong> Your invitation link will expire in approximately 12 hours. Please complete your account setup immediately to avoid losing access.
    </p>
  </div>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    <strong>What happens if the link expires?</strong><br>
    You''ll need to contact your administrator to request a new invitation, which may delay your onboarding process.
  </p>

  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
    Click the link in your original invitation email to set your password now.
  </p>

  <p style="color: #6c757d; font-size: 14px; margin-top: 32px;">
    If you''ve already set your password, please disregard this message.
  </p>
</div>',
      'URGENT: Password Setup Required',
      'Final reminder! Only 12 hours left to set your password before your invite expires.',
      NULL,  -- No SMS for password reminders by default
      true
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created password reminder automations for IMO: % (%)', v_imo.name, v_imo.id;
  END LOOP;
END $$;

-- =============================================================================
-- Verification query (for debugging)
-- =============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pipeline_automations
  WHERE trigger_type IN ('password_not_set_24h', 'password_not_set_12h');

  RAISE NOTICE 'Total password reminder automations created: %', v_count;
END $$;
