-- File: /home/nneessen/projects/commissionTracker/scripts/create-example-workflows.sql
-- Create two complete email automation workflow examples

-- =====================================================
-- EXAMPLE 1: New Recruit Onboarding Sequence
-- =====================================================
-- This workflow automatically sends a series of welcome emails
-- when a new recruit enters the "Application Review" phase

INSERT INTO workflows (
  name,
  description,
  category,
  status,
  trigger_type,
  config,
  conditions,
  actions,
  max_runs_per_recipient,
  cooldown_minutes,
  priority,
  created_by
) VALUES (
  'New Recruit Welcome Sequence',
  'Automated 7-day onboarding email sequence that sends welcome emails, training resources, and next steps to new recruits when they enter the Application Review phase',
  'recruiting',
  'active',
  'event',
  '{
    "trigger_event": "recruit.phase_changed",
    "email_settings": {
      "from_name": "The Standard HQ",
      "reply_to": "recruiting@standard.com"
    }
  }'::jsonb,
  '[
    {
      "field": "new_phase",
      "operator": "equals",
      "value": "Application Review"
    }
  ]'::jsonb,
  '[
    {
      "type": "send_email",
      "order": 0,
      "config": {
        "templateId": "welcome_new_recruit",
        "subject": "Welcome to The Standard - Your Journey Begins!",
        "body": "Hi {{recruit_name}},\n\nCongratulations on taking the first step toward an exciting career with The Standard! We are thrilled to have you join our team.\n\nOver the next few days, you will receive a series of emails to help you get started:\n• Important documents to review\n• Training schedule\n• Team introductions\n• Next steps in your onboarding\n\nIf you have any questions, don''t hesitate to reach out to your recruiter.\n\nBest regards,\nThe Standard Recruiting Team",
        "variables": ["recruit_name", "recruiter_name", "recruiter_email"]
      },
      "delayMinutes": 0
    },
    {
      "type": "send_email",
      "order": 1,
      "config": {
        "templateId": "onboarding_documents",
        "subject": "Important Documents - Please Review",
        "body": "Hi {{recruit_name}},\n\nAs part of your onboarding process, please review and complete the following documents:\n\n1. **Employment Agreement** - Review terms and conditions\n2. **Commission Structure** - Understand your earning potential\n3. **Code of Conduct** - Our professional standards\n4. **Benefits Overview** - Healthcare, retirement, and more\n\n[Access Documents Here]\n\nPlease complete these within 48 hours. Your recruiter {{recruiter_name}} is available at {{recruiter_email}} if you have questions.\n\nBest regards,\nThe Standard Team",
        "variables": ["recruit_name", "recruiter_name", "recruiter_email"]
      },
      "delayMinutes": 1440
    },
    {
      "type": "send_email",
      "order": 2,
      "config": {
        "templateId": "training_schedule",
        "subject": "Your Training Schedule is Ready",
        "body": "Hi {{recruit_name}},\n\nYour personalized training schedule is now available!\n\n**Week 1: Foundation Training**\n• Monday: Company Overview & Culture (9 AM - 12 PM)\n• Tuesday: Product Knowledge Session (10 AM - 2 PM)\n• Wednesday: Sales Methodology Training (9 AM - 1 PM)\n• Thursday: Compliance & Regulations (10 AM - 12 PM)\n• Friday: Systems & Tools Training (9 AM - 3 PM)\n\n**Week 2: Advanced Training**\n• Role-specific training\n• Shadow experienced agents\n• Practice presentations\n\n[View Full Schedule]\n\nWe''re excited to see you grow with us!\n\nBest regards,\nTraining Department",
        "variables": ["recruit_name", "training_start_date"]
      },
      "delayMinutes": 2880
    },
    {
      "type": "send_email",
      "order": 3,
      "config": {
        "templateId": "meet_your_team",
        "subject": "Meet Your New Team",
        "body": "Hi {{recruit_name}},\n\nWe''d like to introduce you to your immediate team members:\n\n**Your Manager:** {{manager_name}}\n{{manager_bio}}\n\n**Your Mentor:** {{mentor_name}}\n{{mentor_bio}}\n\n**Team Members:**\n• Sarah Johnson - Senior Agent (3 years)\n• Mike Chen - Agent (1 year)\n• Lisa Rodriguez - Agent (2 years)\n\nWe''ve scheduled a virtual meet & greet for this Friday at 2 PM. You''ll receive a calendar invite shortly.\n\nLooking forward to having you on the team!\n\nBest regards,\n{{manager_name}}",
        "variables": ["recruit_name", "manager_name", "manager_bio", "mentor_name", "mentor_bio"]
      },
      "delayMinutes": 4320
    },
    {
      "type": "send_email",
      "order": 4,
      "config": {
        "templateId": "first_week_checklist",
        "subject": "Your First Week Checklist",
        "body": "Hi {{recruit_name}},\n\nAs you prepare for your first week, here''s a checklist to ensure you''re ready:\n\n**Before Day 1:**\n☐ Complete all onboarding documents\n☐ Set up your email and system accounts\n☐ Review the employee handbook\n☐ Prepare questions for your manager\n\n**Day 1 Essentials:**\n☐ Bring government-issued ID\n☐ Arrive 15 minutes early\n☐ Business casual attire\n☐ Notebook and pen\n\n**First Week Goals:**\n☐ Complete orientation sessions\n☐ Meet with your manager for goal setting\n☐ Set up your workspace\n☐ Attend team meetings\n☐ Complete initial training modules\n\nYou''re going to do great!\n\nBest regards,\nHR Team",
        "variables": ["recruit_name", "start_date", "office_location"]
      },
      "delayMinutes": 8640
    }
  ]'::jsonb,
  1, -- max_runs_per_recipient: Only run once per recruit
  10080, -- cooldown_minutes: 7 days before it can run again for same recruit
  90, -- priority: High priority
  'd0d3edea-af6d-4990-80b8-1765ba829896'
) ON CONFLICT (name, created_by) DO NOTHING;

-- =====================================================
-- EXAMPLE 2: Policy Renewal Reminder Campaign
-- =====================================================
-- This workflow sends escalating reminders for upcoming policy renewals
-- at 30, 15, 7, and 1 day before expiration

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
  created_by
) VALUES (
  'Policy Renewal Reminder Campaign',
  'Automated email sequence that sends renewal reminders at 30, 15, 7, and 1 day before policy expiration with increasing urgency',
  'policies',
  'active',
  'schedule',
  '{
    "schedule": {
      "type": "daily",
      "time": "09:00",
      "timezone": "America/New_York"
    },
    "email_settings": {
      "from_name": "The Standard - Renewals",
      "reply_to": "renewals@standard.com",
      "track_opens": true,
      "track_clicks": true
    }
  }'::jsonb,
  '[
    {
      "field": "days_until_expiration",
      "operator": "in",
      "value": [30, 15, 7, 1]
    }
  ]'::jsonb,
  '[
    {
      "type": "branch",
      "order": 0,
      "config": {
        "branchConditions": [
          {
            "field": "days_until_expiration",
            "operator": "equals",
            "value": 30
          }
        ]
      }
    },
    {
      "type": "send_email",
      "order": 1,
      "config": {
        "templateId": "renewal_30_days",
        "subject": "Your Policy Renewal is Coming Up - 30 Days Notice",
        "body": "Dear {{client_name}},\n\nThis is a friendly reminder that your {{policy_type}} policy (#{{policy_number}}) will expire in 30 days on {{expiration_date}}.\n\n**Current Coverage:**\n• Premium: ${{current_premium}}/month\n• Coverage Amount: ${{coverage_amount}}\n• Deductible: ${{deductible}}\n\n**Why Renew Now?**\n✓ Lock in your current rate\n✓ Avoid coverage gaps\n✓ Maintain continuous protection\n✓ Quick and easy online renewal\n\n[Renew Now] [Review Coverage] [Contact Agent]\n\nIf you have any questions about your coverage or would like to explore different options, I''m here to help.\n\nBest regards,\n{{agent_name}}\n{{agent_phone}}\n{{agent_email}}",
        "variables": ["client_name", "policy_type", "policy_number", "expiration_date", "current_premium", "coverage_amount", "deductible", "agent_name", "agent_phone", "agent_email"],
        "importance": "normal"
      },
      "conditions": [
        {
          "field": "days_until_expiration",
          "operator": "equals",
          "value": 30
        }
      ]
    },
    {
      "type": "send_email",
      "order": 2,
      "config": {
        "templateId": "renewal_15_days",
        "subject": "⏰ Action Required: Policy Expires in 15 Days",
        "body": "Dear {{client_name}},\n\n**Your policy expires in just 15 days!**\n\nPolicy: {{policy_type}} (#{{policy_number}})\nExpiration Date: {{expiration_date}}\n\nDon''t risk a lapse in coverage. Renewing now ensures:\n• Continuous protection for you and your family\n• No underwriting required\n• Same great benefits\n\n**Special Offer:** Renew in the next 48 hours and receive a 5% loyalty discount on your first renewed term.\n\n[Renew Now - Save 5%]\n\nNeed to make changes to your coverage? Let''s talk:\n📞 Call: {{agent_phone}}\n📧 Email: {{agent_email}}\n\nTime is running out - act now to maintain your coverage.\n\nUrgently,\n{{agent_name}}\nYour Insurance Agent",
        "variables": ["client_name", "policy_type", "policy_number", "expiration_date", "agent_name", "agent_phone", "agent_email"],
        "importance": "high"
      },
      "conditions": [
        {
          "field": "days_until_expiration",
          "operator": "equals",
          "value": 15
        }
      ]
    },
    {
      "type": "send_email",
      "order": 3,
      "config": {
        "templateId": "renewal_7_days",
        "subject": "🚨 URGENT: Only 7 Days Until Your Policy Expires",
        "body": "Dear {{client_name}},\n\n**THIS IS AN URGENT NOTICE**\n\nYour {{policy_type}} policy expires in just 7 DAYS!\n\nPolicy Number: {{policy_number}}\nExpiration: {{expiration_date}}\n\n**What Happens If You Don''t Renew:**\n❌ Complete loss of coverage\n❌ Potential waiting periods for new coverage\n❌ Possible higher rates if you reapply\n❌ Risk of being uninsured during critical times\n\n**Renew Today and Keep:**\n✅ Your current rate: ${{current_premium}}/month\n✅ All existing benefits\n✅ No medical exams needed\n✅ Peace of mind\n\n[RENEW NOW - TAKES 5 MINUTES]\n\nI''m available immediately to help:\n📞 Direct Line: {{agent_phone}}\n📱 Text: {{agent_mobile}}\n📧 Email: {{agent_email}}\n\nDon''t wait - protect yourself and your loved ones.\n\n{{agent_name}}\nThe Standard Insurance",
        "variables": ["client_name", "policy_type", "policy_number", "expiration_date", "current_premium", "agent_name", "agent_phone", "agent_mobile", "agent_email"],
        "importance": "urgent"
      },
      "conditions": [
        {
          "field": "days_until_expiration",
          "operator": "equals",
          "value": 7
        }
      ]
    },
    {
      "type": "send_email",
      "order": 4,
      "config": {
        "templateId": "renewal_final_notice",
        "subject": "🔴 FINAL NOTICE: Policy Expires TOMORROW - Immediate Action Required",
        "body": "Dear {{client_name}},\n\n**FINAL NOTICE - YOUR POLICY EXPIRES TOMORROW**\n\nThis is your LAST CHANCE to renew without interruption.\n\nPolicy: {{policy_number}}\nExpires: {{expiration_date}} at 11:59 PM\n\n**After tomorrow, you will:**\n• Have NO coverage\n• Need to reapply from scratch\n• Possibly face higher rates\n• May require medical underwriting\n\n**You still have time!**\n\n[RENEW NOW ONLINE - INSTANT APPROVAL]\n\nOr call me IMMEDIATELY:\n📞 {{agent_phone}} (Available until 8 PM)\n📱 {{agent_mobile}} (Text for fastest response)\n\n**Online renewal takes less than 5 minutes.**\n\nThis is my final attempt to reach you. Please don''t let your coverage lapse.\n\n{{agent_name}}\nThe Standard Insurance\n\nP.S. If you''ve already renewed or wish to cancel, please disregard this notice or let me know to update our records.",
        "variables": ["client_name", "policy_number", "expiration_date", "agent_name", "agent_phone", "agent_mobile"],
        "importance": "critical",
        "mark_as_urgent": true
      },
      "conditions": [
        {
          "field": "days_until_expiration",
          "operator": "equals",
          "value": 1
        }
      ]
    }
  ]'::jsonb,
  50, -- max_runs_per_day: Can check up to 50 policies per day
  4, -- max_runs_per_recipient: Run up to 4 times (for each reminder stage)
  1440, -- cooldown_minutes: 24 hours between runs
  100, -- priority: Highest priority - renewals are critical
  'd0d3edea-af6d-4990-80b8-1765ba829896'
) ON CONFLICT (name, created_by) DO NOTHING;

-- Add corresponding workflow triggers for the event-based workflow
INSERT INTO workflow_triggers (
  workflow_id,
  trigger_type,
  event_config,
  is_active
)
SELECT
  id,
  'event',
  '{
    "event_name": "recruit.phase_changed",
    "filters": {
      "new_phase": "Application Review"
    }
  }'::jsonb,
  true
FROM workflows
WHERE name = 'New Recruit Welcome Sequence'
  AND created_by = 'd0d3edea-af6d-4990-80b8-1765ba829896'
ON CONFLICT DO NOTHING;

-- Add corresponding workflow triggers for the schedule-based workflow
INSERT INTO workflow_triggers (
  workflow_id,
  trigger_type,
  schedule_config,
  is_active,
  next_trigger_at
)
SELECT
  id,
  'time',
  '{
    "cron_expression": "0 9 * * *",
    "timezone": "America/New_York",
    "description": "Daily at 9:00 AM EST"
  }'::jsonb,
  true,
  CURRENT_DATE + INTERVAL '1 day' + TIME '09:00:00'
FROM workflows
WHERE name = 'Policy Renewal Reminder Campaign'
  AND created_by = 'd0d3edea-af6d-4990-80b8-1765ba829896'
ON CONFLICT DO NOTHING;

-- Output success message
SELECT 'Successfully created 2 example workflows:
1. New Recruit Welcome Sequence - 5 emails over 7 days
2. Policy Renewal Reminder Campaign - 4 escalating reminders' as result;