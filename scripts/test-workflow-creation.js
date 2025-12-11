// /home/nneessen/projects/commissionTracker/scripts/test-workflow-creation.js
// Test workflow creation to see what's happening

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzEwOTIsImV4cCI6MjA3MzU0NzA5Mn0.4p4k0ysuStPsqWzVQhlWona0mQaebdbX_lEvrFUJxZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWorkflowCreation() {
  console.log('🧪 Testing Workflow Creation');
  console.log('=' .repeat(50));

  // Check if authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    console.log('\n❌ Not authenticated. Creating a workflow requires authentication.');
    console.log('   This is likely why workflows aren\'t saving!');
    console.log('\n📝 Solution:');
    console.log('1. Make sure you\'re logged in when using the UI');
    console.log('2. Check if authentication is working properly');
    return;
  }

  console.log('\n✅ Authenticated as:', user.email);
  console.log('   User ID:', user.id);

  // Get an email template (create one if none exists)
  let templateId;
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, name')
    .limit(1);

  if (!templates || templates.length === 0) {
    console.log('\n📧 No email templates found. Creating one...');
    const { data: newTemplate, error: tmplError } = await supabase
      .from('email_templates')
      .insert({
        name: 'Test Template',
        subject: 'Test Subject',
        body: '<p>Hello {{recruit_first_name}},</p><p>Welcome!</p>',
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (tmplError) {
      console.error('❌ Failed to create template:', tmplError);
      return;
    }
    templateId = newTemplate.id;
  } else {
    templateId = templates[0].id;
    console.log('\n📧 Using existing template:', templates[0].name);
  }

  // Create a simple test workflow
  const workflowData = {
    name: `Test Workflow ${Date.now()}`,
    description: 'Testing workflow creation',
    category: 'general',
    trigger_type: 'manual',
    status: 'active',
    config: {
      trigger: { type: 'manual' },
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
          recipientEmail: user.email
        },
        delayMinutes: 0,
        conditions: [],
        retryOnFailure: true,
        maxRetries: 3
      }
    ],
    max_runs_per_day: 50,
    priority: 50,
    created_by: user.id
  };

  console.log('\n📝 Creating workflow...');
  console.log('   Name:', workflowData.name);

  const { data: workflow, error: wfError } = await supabase
    .from('workflows')
    .insert(workflowData)
    .select()
    .single();

  if (wfError) {
    console.error('\n❌ Failed to create workflow:', wfError);

    if (wfError.message?.includes('permission')) {
      console.log('\n⚠️ This looks like a permissions issue!');
      console.log('   Check if Row Level Security (RLS) is blocking inserts.');
    }

    if (wfError.message?.includes('violates check constraint')) {
      console.log('\n⚠️ This looks like a validation issue!');
      console.log('   One of the fields doesn\'t meet the database constraints.');
    }

    return;
  }

  console.log('\n✅ Workflow created successfully!');
  console.log('   ID:', workflow.id);
  console.log('   Name:', workflow.name);

  // Verify it exists
  const { data: check, error: checkError } = await supabase
    .from('workflows')
    .select('id, name')
    .eq('id', workflow.id)
    .single();

  if (!checkError && check) {
    console.log('\n✅ Verified: Workflow exists in database!');
  } else {
    console.log('\n❌ Verification failed:', checkError);
  }

  // Check total count
  const { count } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total workflows in database: ${count}`);
}

testWorkflowCreation().catch(console.error);