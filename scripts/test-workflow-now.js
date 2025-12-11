// /home/nneessen/projects/commissionTracker/scripts/test-workflow-now.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
);

async function testWorkflow() {
  console.log('🚀 Testing Workflow Execution\n');
  console.log('=' .repeat(50));

  // Find the New Recruit Welcome Sequence workflow
  const { data: workflow } = await supabase
    .from('workflows')
    .select('*')
    .eq('name', 'New Recruit Welcome Sequence')
    .single();

  if (!workflow) {
    console.error('❌ Workflow not found');
    return;
  }

  console.log('✅ Found workflow:', workflow.name);
  console.log('   Status:', workflow.status);
  console.log('   Actions:', workflow.actions?.length || 0);

  // Create a workflow run
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      trigger_source: 'manual',
      status: 'running',
      context: {
        triggeredBy: 'd0d3edea-af6d-4990-80b8-1765ba829896',
        triggeredByEmail: 'nick@nickneessen.com',
        triggeredAt: new Date().toISOString(),
        workflowName: workflow.name,
        recipientId: 'd0d3edea-af6d-4990-80b8-1765ba829896',
        recipientEmail: 'nick@nickneessen.com',
        recipientName: 'Nick Neessen',
        isTest: true
      }
    })
    .select()
    .single();

  if (runError) {
    console.error('❌ Failed to create run:', runError);
    return;
  }

  console.log('\n✅ Created workflow run:', run.id);

  // Trigger the edge function
  console.log('\n📤 Triggering edge function...');

  const { data: response, error: fnError } = await supabase.functions.invoke('process-workflow', {
    body: {
      runId: run.id,
      workflowId: workflow.id
    }
  });

  if (fnError) {
    console.error('❌ Edge function error:', fnError);
  } else {
    console.log('✅ Edge function response:', response);
  }

  // Wait a moment for processing
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check the run status
  const { data: finalRun } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('id', run.id)
    .single();

  console.log('\n📊 Final run status:', finalRun.status);

  if (finalRun.error_message) {
    console.log('❌ Error:', finalRun.error_message);
  }

  if (finalRun.actions_executed && finalRun.actions_executed.length > 0) {
    console.log('\n📋 Actions executed:');
    finalRun.actions_executed.forEach(action => {
      console.log(`   - ${action.actionType}: ${action.status}`);
      if (action.error) {
        console.log(`     Error: ${action.error}`);
      }
      if (action.emailsSent) {
        console.log(`     Emails sent: ${action.emailsSent}`);
      }
    });
  }

  console.log('\n✅ Test complete! Check your email for:');
  console.log('   - Subject: "Welcome to Our Team!"');
  console.log('   - Sent to all licensed agents (3 total)');
  console.log('   - Template variables should be replaced');
}

testWorkflow().catch(console.error);