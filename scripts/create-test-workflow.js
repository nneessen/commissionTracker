// /home/nneessen/projects/commissionTracker/scripts/create-test-workflow.js
// Script to create a test workflow directly in the database

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzEwOTIsImV4cCI6MjA3MzU0NzA5Mn0.4p4k0ysuStPsqWzVQhlWona0mQaebdbX_lEvrFUJxZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestWorkflow() {
  console.log('🚀 Creating Test Workflow\n');
  console.log('=' .repeat(50));

  // Need to authenticate first
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('❌ Not authenticated. Please log in first.');
    console.log('   You need to be logged in to create workflows.');
    return;
  }

  console.log('✅ Authenticated as:', user.email);
  console.log('   User ID:', user.id);

  // First, get an email template ID
  const { data: templates, error: tmplError } = await supabase
    .from('email_templates')
    .select('id, name')
    .limit(1);

  const templateId = templates?.[0]?.id || 'test-template-id';
  console.log('\n📧 Using template:', templates?.[0]?.name || 'None found');

  // Create a test workflow
  const workflowData = {
    name: 'New Recruit Welcome Sequence',
    description: 'Automated welcome email sequence for new recruits',
    category: 'recruiting',
    trigger_type: 'event',
    status: 'active',
    config: {
      trigger: {
        type: 'event',
        eventName: 'recruit.status_changed'
      },
      continueOnError: false
    },
    conditions: [],
    actions: [
      {
        type: 'send_email',
        order: 0,
        config: {
          templateId: templateId,
          recipientType: 'specific',
          recipientEmail: user.email,
          subject: 'Welcome to Our Team!',
          sender: {
            name: 'Your Agency',
            email: user.email
          }
        },
        delayMinutes: 0,
        conditions: [],
        retryOnFailure: true,
        maxRetries: 3
      },
      {
        type: 'send_email',
        order: 1,
        config: {
          templateId: templateId,
          recipientType: 'specific',
          recipientEmail: user.email,
          subject: 'Day 3 - Getting Started',
          sender: {
            name: 'Your Agency',
            email: user.email
          }
        },
        delayMinutes: 4320, // 3 days
        conditions: [],
        retryOnFailure: true,
        maxRetries: 3
      }
    ],
    max_runs_per_day: 50,
    max_runs_per_recipient: 1,
    cooldown_minutes: 1440, // 24 hours
    priority: 50,
    created_by: user.id
  };

  console.log('\n📝 Creating workflow:', workflowData.name);

  const { data: workflow, error: wfError } = await supabase
    .from('workflows')
    .insert(workflowData)
    .select()
    .single();

  if (wfError) {
    console.error('\n❌ Error creating workflow:', wfError);
    return;
  }

  console.log('\n✅ Workflow created successfully!');
  console.log('   ID:', workflow.id);
  console.log('   Name:', workflow.name);
  console.log('   Status:', workflow.status);
  console.log('   Actions:', workflow.actions?.length || 0);

  // Verify it exists
  const { data: verify, error: verifyError } = await supabase
    .from('workflows')
    .select('id, name')
    .eq('id', workflow.id)
    .single();

  if (!verifyError && verify) {
    console.log('\n✅ Verified - workflow exists in database!');
  } else {
    console.log('\n❌ Verification failed:', verifyError);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Refresh your browser to see the new workflow');
  console.log('2. Click the gear icon to test it');
  console.log('3. Check the workflow runs to see if it executed');
}

createTestWorkflow().catch(console.error);