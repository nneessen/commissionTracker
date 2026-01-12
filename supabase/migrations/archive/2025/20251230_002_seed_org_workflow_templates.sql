-- Migration: Seed org workflow templates
-- Creates example workflow templates for IMOs to demonstrate functionality

-- ============================================================================
-- Insert example org workflow templates
-- ============================================================================

-- Get the Founders Financial Group IMO ID and admin user ID
DO $$
DECLARE
  v_imo_id uuid;
  v_admin_id uuid;
BEGIN
  -- Get IMO ID
  SELECT id INTO v_imo_id FROM imos WHERE name = 'Founders Financial Group' LIMIT 1;

  -- Get super admin user ID (Nick Neessen)
  SELECT id INTO v_admin_id FROM user_profiles WHERE email LIKE '%neessen%' LIMIT 1;

  IF v_imo_id IS NULL THEN
    RAISE NOTICE 'Founders Financial Group IMO not found, skipping seed data';
    RETURN;
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found, skipping seed data';
    RETURN;
  END IF;

  -- Template 1: New Recruit Welcome Series
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    'New Recruit Welcome Series',
    'Automated email sequence to welcome and onboard new recruits to your team',
    'recruiting',
    'active',
    'event',
    jsonb_build_object(
      'trigger', jsonb_build_object(
        'type', 'event',
        'eventName', 'recruit.created'
      )
    ),
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'send_email',
        'order', 1,
        'delayMinutes', 0,
        'retryOnFailure', true,
        'maxRetries', 3,
        'config', jsonb_build_object(
          'to', '{{recruit.email}}',
          'subject', 'Welcome to {{imo.name}}!',
          'body', 'Hi {{recruit.firstName}},\n\nWelcome to our team! We''re excited to have you join {{imo.name}}.\n\nNext steps:\n1. Complete your onboarding paperwork\n2. Schedule your training sessions\n3. Meet your mentor\n\nWe''re here to support you!\n\nBest regards,\n{{imo.name}} Team'
        )
      ),
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'send_email',
        'order', 2,
        'delayMinutes', 10080,
        'retryOnFailure', true,
        'maxRetries', 3,
        'config', jsonb_build_object(
          'to', '{{recruit.email}}',
          'subject', 'Week 1 Check-in',
          'body', 'Hi {{recruit.firstName}},\n\nHow was your first week? We want to make sure you have everything you need to succeed.\n\nPlease don''t hesitate to reach out if you have any questions.\n\nBest regards,\n{{imo.name}} Team'
        )
      )
    ),
    100,
    1,
    1440,
    50,
    v_admin_id,
    true,
    v_imo_id
  );

  -- Template 2: Policy Renewal Reminder
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    'Policy Renewal Reminder',
    'Automated reminders for policies due for renewal within 30 days',
    'general',
    'active',
    'schedule',
    jsonb_build_object(
      'trigger', jsonb_build_object(
        'type', 'schedule',
        'schedule', jsonb_build_object(
          'frequency', 'daily',
          'time', '09:00',
          'timezone', 'America/New_York'
        )
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'field', 'policy.renewalDate',
        'operator', 'between',
        'value', jsonb_build_array('now', 'now+30days')
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'send_email',
        'order', 1,
        'delayMinutes', 0,
        'retryOnFailure', true,
        'maxRetries', 3,
        'config', jsonb_build_object(
          'to', '{{agent.email}}',
          'subject', 'Policy Renewal Due: {{policy.policyNumber}}',
          'body', 'Hi {{agent.firstName}},\n\nThis is a reminder that policy {{policy.policyNumber}} for {{client.name}} is due for renewal on {{policy.renewalDate}}.\n\nPlease reach out to the client to discuss renewal options.\n\nClient: {{client.name}}\nPolicy: {{policy.policyNumber}}\nCarrier: {{carrier.name}}\nRenewal Date: {{policy.renewalDate}}\n\nBest regards,\nAutomated Workflow System'
        )
      )
    ),
    50,
    NULL,
    0,
    60,
    v_admin_id,
    true,
    v_imo_id
  );

  -- Template 3: Commission Milestone Alert
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    'Commission Milestone Alert',
    'Celebrate when agents reach commission milestones ($10K, $50K, $100K)',
    'commission',
    'active',
    'event',
    jsonb_build_object(
      'trigger', jsonb_build_object(
        'type', 'event',
        'eventName', 'commission.earned'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'field', 'commission.earnedAmount',
        'operator', 'gte',
        'value', 10000
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'send_email',
        'order', 1,
        'delayMinutes', 0,
        'retryOnFailure', true,
        'maxRetries', 3,
        'config', jsonb_build_object(
          'to', '{{agent.email}}',
          'subject', 'Congratulations on Your Commission Milestone!',
          'body', 'Hi {{agent.firstName}},\n\nCongratulations! You''ve just earned ${{commission.earnedAmount}} in commission.\n\nKeep up the great work!\n\nPolicy: {{policy.policyNumber}}\nClient: {{client.name}}\nCommission: ${{commission.earnedAmount}}\n\nBest regards,\n{{imo.name}} Team'
        )
      )
    ),
    200,
    10,
    60,
    70,
    v_admin_id,
    true,
    v_imo_id
  );

  -- Template 4: Weekly Team Performance Report
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    'Weekly Team Performance Report',
    'Automated weekly summary of team performance metrics sent to leadership',
    'general',
    'active',
    'schedule',
    jsonb_build_object(
      'trigger', jsonb_build_object(
        'type', 'schedule',
        'schedule', jsonb_build_object(
          'frequency', 'weekly',
          'dayOfWeek', 'monday',
          'time', '08:00',
          'timezone', 'America/New_York'
        )
      )
    ),
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'send_email',
        'order', 1,
        'delayMinutes', 0,
        'retryOnFailure', true,
        'maxRetries', 3,
        'config', jsonb_build_object(
          'to', '{{imo.adminEmail}}',
          'subject', 'Weekly Team Performance Report - {{week.startDate}}',
          'body', 'Weekly Performance Summary\n\nWeek of: {{week.startDate}} - {{week.endDate}}\n\nKey Metrics:\n- New Policies: {{metrics.newPolicies}}\n- Total Premium: ${{metrics.totalPremium}}\n- Commissions Earned: ${{metrics.commissionsEarned}}\n- New Recruits: {{metrics.newRecruits}}\n- Active Agents: {{metrics.activeAgents}}\n\nTop Performers:\n{{metrics.topAgents}}\n\nThis is an automated report generated by your workflow system.'
        )
      )
    ),
    1,
    NULL,
    0,
    40,
    v_admin_id,
    true,
    v_imo_id
  );

  -- Template 5: Policy Issued Follow-up
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    'Policy Issued Follow-up',
    'Automated follow-up with clients 7 days after policy issuance',
    'general',
    'active',
    'event',
    jsonb_build_object(
      'trigger', jsonb_build_object(
        'type', 'event',
        'eventName', 'policy.issued'
      )
    ),
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', 'send_email',
        'order', 1,
        'delayMinutes', 10080,
        'retryOnFailure', true,
        'maxRetries', 3,
        'config', jsonb_build_object(
          'to', '{{agent.email}}',
          'subject', 'Follow-up: Policy {{policy.policyNumber}}',
          'body', 'Hi {{agent.firstName}},\n\nIt''s been one week since policy {{policy.policyNumber}} was issued for {{client.name}}.\n\nPlease follow up with the client to:\n- Confirm they received their policy documents\n- Answer any questions they may have\n- Discuss additional coverage needs\n\nClient: {{client.name}}\nPolicy: {{policy.policyNumber}}\nIssued: {{policy.issuedDate}}\n\nBest regards,\nAutomated Workflow System'
        )
      )
    ),
    100,
    1,
    1440,
    50,
    v_admin_id,
    true,
    v_imo_id
  );

  RAISE NOTICE 'Successfully created 5 org workflow templates for Founders Financial Group';
END $$;
