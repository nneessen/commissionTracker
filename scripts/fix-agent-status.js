// /home/nneessen/projects/commissionTracker/scripts/fix-agent-status.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
);

async function fixAgentStatus() {
  console.log('🔧 Fixing Agent Status\n');

  // Update your user to be a licensed agent
  const { data: updated, error } = await supabase
    .from('user_profiles')
    .update({
      agent_status: 'licensed',
      approval_status: 'approved',
      roles: ['admin', 'agent']
    })
    .eq('email', 'nick@nickneessen.com')
    .select();

  if (error) {
    console.error('Error updating agent status:', error);
  } else {
    console.log('✅ Updated nick@nickneessen.com:');
    console.log('   - agent_status: licensed (active agent)');
    console.log('   - approval_status: approved');
    console.log('   - roles: admin, agent');
  }

  // Check licensed agents count
  const { data: licensedAgents } = await supabase
    .from('user_profiles')
    .select('email, agent_status, approval_status')
    .eq('agent_status', 'licensed');

  console.log(`\n📊 Total licensed agents: ${licensedAgents?.length || 0}`);
  if (licensedAgents && licensedAgents.length > 0) {
    licensedAgents.forEach(a => console.log(`   - ${a.email} (status: ${a.agent_status}, approval: ${a.approval_status})`));
  }

  // Also update the workflow to use 'all_agents' again since we now have licensed agents
  const { data: workflow, error: wfError } = await supabase
    .from('workflows')
    .update({
      actions: [
        {
          type: 'send_email',
          order: 0,
          config: {
            templateId: 'a5364514-547e-44aa-b871-5aed02fbaf97',
            recipientType: 'all_agents',  // Now this will work!
            subject: 'Welcome to Our Team!'
          },
          delayMinutes: 0,
          conditions: [],
          retryOnFailure: true,
          maxRetries: 3
        }
      ]
    })
    .eq('id', '12e9c666-d496-49bf-94c9-e39b30a11b20')
    .select()
    .single();

  if (wfError) {
    console.error('Error updating workflow:', wfError);
  } else {
    console.log('\n✅ Updated workflow to use "all_agents" recipient type');
    console.log('   Now it will send to all licensed agents!');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Deploy the edge function: npx supabase functions deploy process-workflow');
  console.log('2. Go to Training Hub > Automation tab');
  console.log('3. Click gear icon on "New Recruit Welcome Sequence"');
  console.log('4. Click "Run Now"');
  console.log('5. Check your email!');
}

fixAgentStatus().catch(console.error);