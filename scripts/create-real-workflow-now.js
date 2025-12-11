// /home/nneessen/projects/commissionTracker/scripts/create-real-workflow-now.js
// Create a REAL workflow in the database NOW

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
// Using SERVICE ROLE key to bypass RLS
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createRealWorkflow() {
  console.log('🚀 Creating REAL Workflow in Database NOW');
  console.log('=' .repeat(50));

  // First get an email template
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, name')
    .limit(1);

  let templateId;

  if (!templates || templates.length === 0) {
    console.log('Creating email template first...');
    const { data: newTemplate, error: tmplError } = await supabase
      .from('email_templates')
      .insert({
        name: 'New Recruit Welcome',
        subject: 'Welcome {{recruit_first_name}}!',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to {{company_name}}, {{recruit_first_name}}!</h2>
            <p>We're excited to have you join our team.</p>
            <p>Your current status: {{recruit_status}}</p>
            <p>We'll be in touch soon with next steps.</p>
            <br>
            <p>Best regards,<br>
            {{user_first_name}} {{user_last_name}}<br>
            {{user_email}}</p>
          </div>
        `,
        is_active: true,
        created_by: 'd0d3edea-af6d-4990-80b8-1765ba829896' // Your user ID
      })
      .select()
      .single();

    if (tmplError) {
      console.error('Failed to create template:', tmplError);
      return;
    }

    templateId = newTemplate.id;
    console.log('Created template:', newTemplate.name);
  } else {
    templateId = templates[0].id;
    console.log('Using existing template:', templates[0].name);
  }

  // Create the workflow
  const workflowData = {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', // Fixed ID so we can find it
    name: 'New Recruit Welcome Sequence',
    description: 'Automated welcome email for new recruits',
    category: 'recruiting',
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
          recipientEmail: '', // Will be filled by trigger context
          subject: 'Welcome to Our Team!',
          sender: {
            name: 'Your Agency',
            email: 'noreply@agency.com'
          }
        },
        delayMinutes: 0,
        conditions: [],
        retryOnFailure: true,
        maxRetries: 3
      }
    ],
    max_runs_per_day: 100,
    max_runs_per_recipient: 10,
    cooldown_minutes: 0,
    priority: 50,
    created_by: 'd0d3edea-af6d-4990-80b8-1765ba829896', // Your user ID from .env
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('\n📝 Creating workflow...');

  // Delete if exists
  await supabase
    .from('workflows')
    .delete()
    .eq('id', workflowData.id);

  // Create new
  const { data: workflow, error } = await supabase
    .from('workflows')
    .insert(workflowData)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create workflow:', error);
    return;
  }

  console.log('\n✅ WORKFLOW CREATED SUCCESSFULLY!');
  console.log('   ID:', workflow.id);
  console.log('   Name:', workflow.name);
  console.log('   Status:', workflow.status);

  // Verify it exists
  const { data: check, count } = await supabase
    .from('workflows')
    .select('*', { count: 'exact' })
    .eq('id', workflow.id);

  console.log('\n✅ Verified: Workflow exists in database');
  console.log(`   Total workflows now: ${count}`);

  console.log('\n📋 Next Steps:');
  console.log('1. Go to the browser (http://localhost:3001)');
  console.log('2. Hard refresh (Ctrl+Shift+R) to clear cache');
  console.log('3. You should see "New Recruit Welcome Sequence"');
  console.log('4. Click the gear icon → "Run Now"');
  console.log('5. Enter the recipient email');
  console.log('6. Check for the email!');
}

createRealWorkflow().catch(console.error);