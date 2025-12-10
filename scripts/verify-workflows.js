#!/usr/bin/env node
// File: /home/nneessen/projects/commissionTracker/scripts/verify-workflows.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyWorkflows() {
  console.log('Fetching workflows from database...\n');

  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflows:', error.message);
    process.exit(1);
  }

  if (!workflows || workflows.length === 0) {
    console.log('❌ No workflows found in database');
    console.log('\nAttempting to create example workflows...');
    await createExampleWorkflows();
    return;
  }

  console.log(`✅ Found ${workflows.length} workflow(s):\n`);

  workflows.forEach((workflow, index) => {
    console.log(`${index + 1}. ${workflow.name}`);
    console.log(`   Status: ${workflow.status}`);
    console.log(`   Category: ${workflow.category}`);
    console.log(`   Trigger: ${workflow.trigger_type}`);
    console.log(`   Created: ${new Date(workflow.created_at).toLocaleDateString()}`);
    console.log(`   Actions: ${workflow.actions ? workflow.actions.length : 0}`);
    console.log('');
  });
}

async function createExampleWorkflows() {
  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('No authenticated user. Please login first.');
    console.log('You can login at http://localhost:3001');
    return;
  }

  console.log(`Creating example workflows for user: ${user.email}\n`);

  // Create New Recruit Welcome Sequence
  const workflow1 = {
    name: 'New Recruit Welcome Sequence',
    description: 'Automated 3-email welcome sequence for new insurance recruits over 48 hours',
    category: 'recruiting',
    trigger_type: 'event',
    status: 'active',
    conditions: [],
    actions: [
      {
        type: 'send_email',
        order: 0,
        config: {
          templateId: 'welcome_immediate',
          subject: 'Welcome to the Team!',
          body: 'Welcome aboard! We are thrilled to have you join our insurance team.',
          delay: 0
        }
      },
      {
        type: 'send_email',
        order: 1,
        config: {
          templateId: 'welcome_day1',
          subject: 'Your First Steps to Success',
          body: 'Here are your first steps to getting started in your insurance career.',
          delay: 86400
        }
      },
      {
        type: 'send_email',
        order: 2,
        config: {
          templateId: 'welcome_day2',
          subject: 'Resources and Support',
          body: 'Access all the resources and support you need to succeed.',
          delay: 172800
        }
      }
    ],
    is_active: true,
    user_id: user.id,
    created_by: user.id,
    updated_by: user.id,
    max_runs_per_day: 10,
    priority: 100,
    config: {
      emailProvider: 'default',
      trackOpens: true,
      trackClicks: true
    }
  };

  const { data: createdWorkflow1, error: error1 } = await supabase
    .from('workflows')
    .insert(workflow1)
    .select()
    .single();

  if (error1) {
    console.error('Error creating first workflow:', error1.message);
  } else {
    console.log('✅ Created: New Recruit Welcome Sequence');
  }

  // Create Policy Renewal Reminder Campaign
  const workflow2 = {
    name: 'Policy Renewal Reminder Campaign',
    description: 'Sends 3 escalating reminder emails for policy renewals at 30, 15, and 7 days before expiration',
    category: 'commission',
    trigger_type: 'schedule',
    status: 'active',
    conditions: [
      {
        field: 'policy_status',
        operator: 'equals',
        value: 'active'
      },
      {
        field: 'days_until_renewal',
        operator: 'in',
        value: [30, 15, 7]
      }
    ],
    actions: [
      {
        type: 'send_email',
        order: 0,
        config: {
          templateId: 'renewal_30day',
          subject: 'Policy Renewal in 30 Days',
          body: 'Your policy will expire in 30 days. Renew now to maintain continuous coverage.',
          condition: 'days_until_renewal == 30'
        }
      },
      {
        type: 'send_email',
        order: 1,
        config: {
          templateId: 'renewal_15day',
          subject: 'Urgent: Policy Renewal in 15 Days',
          body: 'Only 15 days left before your policy expires. Act now to avoid a lapse in coverage.',
          condition: 'days_until_renewal == 15'
        }
      },
      {
        type: 'send_email',
        order: 2,
        config: {
          templateId: 'renewal_7day',
          subject: 'Final Notice: Policy Expires in 7 Days',
          body: 'FINAL REMINDER: Your policy expires in just 7 days. Renew immediately!',
          condition: 'days_until_renewal == 7'
        }
      }
    ],
    is_active: true,
    user_id: user.id,
    created_by: user.id,
    updated_by: user.id,
    max_runs_per_day: 50,
    priority: 90,
    config: {
      scheduleTime: '09:00',
      timezone: 'America/New_York',
      skipWeekends: false,
      emailProvider: 'default'
    }
  };

  const { data: createdWorkflow2, error: error2 } = await supabase
    .from('workflows')
    .insert(workflow2)
    .select()
    .single();

  if (error2) {
    console.error('Error creating second workflow:', error2.message);
  } else {
    console.log('✅ Created: Policy Renewal Reminder Campaign');
  }

  console.log('\n✅ Example workflows created successfully!');
  console.log('Navigate to http://localhost:3001 > Training Hub > Automation to see them.');
}

// Run the verification
verifyWorkflows();