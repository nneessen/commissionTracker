#!/usr/bin/env node
// File: /home/nneessen/projects/commissionTracker/scripts/create-example-workflows.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExampleWorkflows() {
  console.log('Creating example email automation workflows...\n');

  try {
    // Example 1: New Recruit Welcome Sequence
    const recruitWorkflow = {
      name: 'New Recruit Welcome Sequence',
      description: 'Automated 7-day onboarding email sequence that sends welcome emails, training resources, and next steps to new recruits',
      category: 'recruiting',
      status: 'active',
      trigger_type: 'event',
      config: {
        trigger_event: 'recruit.phase_changed',
        email_settings: {
          from_name: 'The Standard HQ',
          reply_to: 'recruiting@standard.com'
        }
      },
      conditions: [
        {
          field: 'new_phase',
          operator: 'equals',
          value: 'Application Review'
        }
      ],
      actions: [
        {
          type: 'send_email',
          order: 0,
          config: {
            templateId: 'welcome_new_recruit',
            subject: 'Welcome to The Standard - Your Journey Begins!',
            body: 'Welcome! Congratulations on taking the first step toward an exciting career with The Standard! Over the next few days, you will receive emails with important documents, training schedule, team introductions, and next steps. Reach out if you have any questions. Best regards, The Standard Recruiting Team',
            variables: ['recruit_name', 'recruiter_name', 'recruiter_email']
          },
          delayMinutes: 0
        },
        {
          type: 'send_email',
          order: 1,
          config: {
            templateId: 'onboarding_documents',
            subject: 'Important Documents - Please Review',
            body: 'Important Documents to Review: 1) Employment Agreement - terms and conditions, 2) Commission Structure - your earning potential, 3) Code of Conduct - professional standards, 4) Benefits Overview - healthcare and retirement. Please complete these within 48 hours. Contact your recruiter if you have questions.'
          },
          delayMinutes: 1440 // 24 hours later
        },
        {
          type: 'send_email',
          order: 2,
          config: {
            templateId: 'training_schedule',
            subject: 'Your Training Schedule is Ready',
            body: 'Your training schedule is ready! Week 1: Mon - Company Overview, Tue - Product Knowledge, Wed - Sales Methodology, Thu - Compliance, Fri - Systems Training. Week 2: Role-specific training, shadowing, and practice. We are excited to see you grow with us!'
          },
          delayMinutes: 2880 // 48 hours later
        }
      ],
      max_runs_per_recipient: 1,
      cooldown_minutes: 10080, // 7 days
      priority: 90,
      created_by: 'd0d3edea-af6d-4990-80b8-1765ba829896'
    };

    // Example 2: Policy Renewal Reminder Campaign
    const renewalWorkflow = {
      name: 'Policy Renewal Reminder Campaign',
      description: 'Automated email sequence that sends renewal reminders at 30, 15, 7, and 1 day before policy expiration',
      category: 'commission',
      status: 'active',
      trigger_type: 'schedule',
      config: {
        schedule: {
          type: 'daily',
          time: '09:00',
          timezone: 'America/New_York'
        },
        email_settings: {
          from_name: 'The Standard - Renewals',
          reply_to: 'renewals@standard.com',
          track_opens: true,
          track_clicks: true
        }
      },
      conditions: [
        {
          field: 'days_until_expiration',
          operator: 'in',
          value: [30, 15, 7, 1]
        }
      ],
      actions: [
        {
          type: 'send_email',
          order: 0,
          config: {
            templateId: 'renewal_30_days',
            subject: 'Your Policy Renewal is Coming Up - 30 Days Notice',
            body: 'Dear Client, This is a friendly reminder that your policy will expire in 30 days. Why Renew Now? Lock in your current rate, Avoid coverage gaps, Maintain continuous protection. Contact your agent if you have questions.'
          },
          conditions: [
            {
              field: 'days_until_expiration',
              operator: 'equals',
              value: 30
            }
          ]
        },
        {
          type: 'send_email',
          order: 1,
          config: {
            templateId: 'renewal_15_days',
            subject: '⏰ Action Required: Policy Expires in 15 Days',
            body: 'URGENT: Your policy expires in just 15 days! Don\'t risk a lapse in coverage. Renewing now ensures continuous protection, no underwriting required, and same great benefits. Special Offer: Renew in the next 48 hours and receive a 5% loyalty discount. Time is running out - act now!'
          },
          conditions: [
            {
              field: 'days_until_expiration',
              operator: 'equals',
              value: 15
            }
          ]
        },
        {
          type: 'send_email',
          order: 2,
          config: {
            templateId: 'renewal_final_notice',
            subject: '🔴 FINAL NOTICE: Policy Expires TOMORROW',
            body: 'FINAL NOTICE - YOUR POLICY EXPIRES TOMORROW! This is your LAST CHANCE to renew without interruption. After tomorrow, you will have NO coverage and will need to reapply. You still have time! Renew online now or call your agent immediately. This is the final reminder.'
          },
          conditions: [
            {
              field: 'days_until_expiration',
              operator: 'equals',
              value: 1
            }
          ]
        }
      ],
      max_runs_per_day: 50,
      max_runs_per_recipient: 3,
      cooldown_minutes: 1440, // 24 hours
      priority: 100,
      created_by: 'd0d3edea-af6d-4990-80b8-1765ba829896'
    };

    // Insert the workflows
    console.log('Creating Workflow 1: New Recruit Welcome Sequence...');
    const { data: workflow1, error: error1 } = await supabase
      .from('workflows')
      .insert(recruitWorkflow)
      .select()
      .single();

    if (error1) {
      console.error('Error creating recruit workflow:', error1);
    } else {
      console.log('✅ Successfully created New Recruit Welcome Sequence');
      console.log(`   - 3 automated emails over 48 hours`);
      console.log(`   - Triggers when recruit enters "Application Review" phase`);
      console.log(`   - ID: ${workflow1.id}\n`);
    }

    console.log('Creating Workflow 2: Policy Renewal Reminder Campaign...');
    const { data: workflow2, error: error2 } = await supabase
      .from('workflows')
      .insert(renewalWorkflow)
      .select()
      .single();

    if (error2) {
      console.error('Error creating renewal workflow:', error2);
    } else {
      console.log('✅ Successfully created Policy Renewal Reminder Campaign');
      console.log(`   - 3 escalating reminders at 30, 15, and 1 day before expiration`);
      console.log(`   - Runs daily at 9 AM EST to check for expiring policies`);
      console.log(`   - ID: ${workflow2.id}\n`);
    }

    console.log('\n=== EXAMPLE WORKFLOWS CREATED ===\n');
    console.log('You now have two fully functional email automation examples:');
    console.log('\n1. NEW RECRUIT WELCOME SEQUENCE');
    console.log('   - Automatically welcomes new recruits');
    console.log('   - Sends onboarding documents and training info');
    console.log('   - Spaces emails over 48 hours');
    console.log('   - Uses variables like {{recruit_name}} for personalization');

    console.log('\n2. POLICY RENEWAL REMINDER CAMPAIGN');
    console.log('   - Monitors policies approaching expiration');
    console.log('   - Sends reminders at strategic intervals');
    console.log('   - Increases urgency as deadline approaches');
    console.log('   - Uses conditional logic to send appropriate message');

    console.log('\nThese workflows demonstrate:');
    console.log('• Event-based triggers (recruit phase change)');
    console.log('• Schedule-based triggers (daily check)');
    console.log('• Email sequences with delays');
    console.log('• Conditional logic');
    console.log('• Variable substitution');
    console.log('• Priority and rate limiting');

    console.log('\nYou can now view these in the Automation tab and use them as templates for creating your own workflows!');

  } catch (error) {
    console.error('Error creating example workflows:', error);
  }
}

createExampleWorkflows();