-- Migration: Create example workflows for demonstration
-- Description: Adds two complete email automation workflows as examples

-- Get any existing user ID to associate workflows with
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get first user ID from auth.users
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- Only proceed if we have a user
    IF v_user_id IS NOT NULL THEN
        -- Delete any existing example workflows to avoid duplicates
        DELETE FROM workflows
        WHERE name IN ('New Recruit Welcome Sequence', 'Policy Renewal Reminder Campaign');

        -- Insert New Recruit Welcome Sequence workflow
        INSERT INTO workflows (
            name,
            description,
            category,
            trigger_type,
            status,
            conditions,
            actions,
            is_active,
            user_id,
            created_by,
            updated_by,
            max_runs_per_day,
            priority,
            config
        ) VALUES (
            'New Recruit Welcome Sequence',
            'Automated 3-email welcome sequence for new insurance recruits over 48 hours',
            'recruiting',
            'event',
            'active',
            '[]'::jsonb,
            '[
                {
                    "type": "send_email",
                    "order": 0,
                    "config": {
                        "templateId": "welcome_immediate",
                        "subject": "Welcome to the Team!",
                        "body": "Welcome aboard! We are thrilled to have you join our insurance team.",
                        "delay": 0
                    }
                },
                {
                    "type": "send_email",
                    "order": 1,
                    "config": {
                        "templateId": "welcome_day1",
                        "subject": "Your First Steps to Success",
                        "body": "Here are your first steps to getting started in your insurance career.",
                        "delay": 86400
                    }
                },
                {
                    "type": "send_email",
                    "order": 2,
                    "config": {
                        "templateId": "welcome_day2",
                        "subject": "Resources and Support",
                        "body": "Access all the resources and support you need to succeed.",
                        "delay": 172800
                    }
                }
            ]'::jsonb,
            true,
            v_user_id,
            v_user_id,
            v_user_id,
            10,
            100,
            '{
                "emailProvider": "default",
                "trackOpens": true,
                "trackClicks": true
            }'::jsonb
        );

        -- Insert Policy Renewal Reminder Campaign workflow
        INSERT INTO workflows (
            name,
            description,
            category,
            trigger_type,
            status,
            conditions,
            actions,
            is_active,
            user_id,
            created_by,
            updated_by,
            max_runs_per_day,
            priority,
            config
        ) VALUES (
            'Policy Renewal Reminder Campaign',
            'Sends 3 escalating reminder emails for policy renewals at 30, 15, and 7 days before expiration',
            'commission',
            'schedule',
            'active',
            '[
                {
                    "field": "policy_status",
                    "operator": "equals",
                    "value": "active"
                },
                {
                    "field": "days_until_renewal",
                    "operator": "in",
                    "value": [30, 15, 7]
                }
            ]'::jsonb,
            '[
                {
                    "type": "send_email",
                    "order": 0,
                    "config": {
                        "templateId": "renewal_30day",
                        "subject": "Policy Renewal in 30 Days",
                        "body": "Your policy will expire in 30 days. Renew now to maintain continuous coverage.",
                        "condition": "days_until_renewal == 30"
                    }
                },
                {
                    "type": "send_email",
                    "order": 1,
                    "config": {
                        "templateId": "renewal_15day",
                        "subject": "Urgent: Policy Renewal in 15 Days",
                        "body": "Only 15 days left before your policy expires. Act now to avoid a lapse in coverage.",
                        "condition": "days_until_renewal == 15"
                    }
                },
                {
                    "type": "send_email",
                    "order": 2,
                    "config": {
                        "templateId": "renewal_7day",
                        "subject": "Final Notice: Policy Expires in 7 Days",
                        "body": "FINAL REMINDER: Your policy expires in just 7 days. Renew immediately!",
                        "condition": "days_until_renewal == 7"
                    }
                }
            ]'::jsonb,
            true,
            v_user_id,
            v_user_id,
            v_user_id,
            50,
            90,
            '{
                "scheduleTime": "09:00",
                "timezone": "America/New_York",
                "skipWeekends": false,
                "emailProvider": "default"
            }'::jsonb
        );

        RAISE NOTICE 'Successfully created example workflows for user %', v_user_id;
    ELSE
        RAISE NOTICE 'No users found in database. Workflows not created.';
    END IF;
END $$;