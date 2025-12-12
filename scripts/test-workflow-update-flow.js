// /home/nneessen/projects/commissionTracker/scripts/test-workflow-update-flow.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testWorkflowUpdateFlow() {
  console.log('\n🧪 Testing Complete Workflow Update Flow...\n');

  try {
    // 1. Get the "New Recruit Welcome Sequence" workflow
    const { data: workflows, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .ilike('name', '%new recruit%')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching workflow:', fetchError);
      return;
    }

    if (!workflows || workflows.length === 0) {
      console.log('⚠️ No "New Recruit Welcome Sequence" workflow found');
      console.log('Creating a test workflow...');

      // Create a test workflow
      const { data: created, error: createError } = await supabase
        .from('workflows')
        .insert({
          name: 'New Recruit Welcome Sequence',
          description: 'Welcome sequence for new recruits',
          trigger_type: 'manual',
          config: { trigger: { type: 'manual' } },
          actions: [],
          status: 'draft',
          category: 'recruiting'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test workflow:', createError);
        return;
      }

      workflows[0] = created;
      console.log('✅ Test workflow created');
    }

    const workflow = workflows[0];
    console.log('\n📋 Current workflow state:');
    console.log('  ID:', workflow.id);
    console.log('  Name:', workflow.name);
    console.log('  Trigger Type (DB field):', workflow.trigger_type);
    console.log('  Config Trigger:', JSON.stringify(workflow.config?.trigger, null, 2));

    // 2. Update to event trigger with "recruit.created"
    console.log('\n🔄 Updating to event trigger with recruit.created...');

    const updateData = {
      trigger_type: 'event',
      config: {
        ...workflow.config,
        trigger: {
          type: 'event',
          eventName: 'recruit.created'
        }
      },
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', workflow.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }

    console.log('✅ Update successful');
    console.log('  New trigger_type:', updated.trigger_type);
    console.log('  New config.trigger:', JSON.stringify(updated.config?.trigger, null, 2));

    // 3. Fetch again to verify persistence
    console.log('\n🔍 Fetching workflow again to verify persistence...');

    const { data: verified, error: verifyError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow.id)
      .single();

    if (verifyError) {
      console.error('❌ Error fetching workflow:', verifyError);
      return;
    }

    console.log('📊 Verification Results:');
    console.log('  trigger_type:', verified.trigger_type);
    console.log('  config.trigger:', JSON.stringify(verified.config?.trigger, null, 2));

    // Check if values persisted correctly
    const persistedCorrectly =
      verified.trigger_type === 'event' &&
      verified.config?.trigger?.type === 'event' &&
      verified.config?.trigger?.eventName === 'recruit.created';

    if (persistedCorrectly) {
      console.log('\n✅ SUCCESS: Database update and persistence working correctly!');
      console.log('\n📝 Next Steps:');
      console.log('1. Open the app in your browser');
      console.log('2. Go to Training Hub → Automation');
      console.log('3. Edit "New Recruit Welcome Sequence"');
      console.log('4. Check if it shows:');
      console.log('   - Trigger Type: Event');
      console.log('   - Event: recruit.created');
      console.log('\nIf the UI doesn\'t show the correct values, the issue is in the UI loading logic.');
    } else {
      console.log('\n❌ FAILURE: Values did not persist correctly');
      console.log('Expected trigger_type: event, got:', verified.trigger_type);
      console.log('Expected config.trigger.type: event, got:', verified.config?.trigger?.type);
      console.log('Expected config.trigger.eventName: recruit.created, got:', verified.config?.trigger?.eventName);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testWorkflowUpdateFlow();