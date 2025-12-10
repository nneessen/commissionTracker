// Update the New Recruit Welcome Sequence to send immediately

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRecruitWorkflow() {
  try {
    // First, get the workflow
    const { data: workflows, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .ilike('name', '%New Recruit Welcome%')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching workflow:', fetchError);
      return;
    }

    if (!workflows || workflows.length === 0) {
      console.log('No New Recruit Welcome Sequence found');
      return;
    }

    const workflow = workflows[0];
    console.log('Found workflow:', workflow.name);
    console.log('Current actions:', JSON.stringify(workflow.actions, null, 2));

    // Update the actions to have no delay (immediate send)
    const updatedActions = workflow.actions.map((action, index) => ({
      ...action,
      delayMinutes: 0, // Set to 0 for immediate send
      order: index,
      // Ensure recipient config is set
      config: {
        ...action.config,
        recipientType: action.config.recipientType || 'trigger_user' // Default to trigger user if not set
      }
    }));

    // Update the workflow with immediate send
    const { data: updated, error: updateError } = await supabase
      .from('workflows')
      .update({
        actions: updatedActions,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflow.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating workflow:', updateError);
      return;
    }

    console.log('✅ Successfully updated workflow to send immediately!');
    console.log('Updated actions:', JSON.stringify(updatedActions, null, 2));

    // Show what will happen
    updatedActions.forEach((action, i) => {
      if (action.type === 'send_email') {
        console.log(`  Action ${i + 1}: Send email immediately to ${action.config.recipientType || 'trigger user'}`);
      }
    });

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateRecruitWorkflow();