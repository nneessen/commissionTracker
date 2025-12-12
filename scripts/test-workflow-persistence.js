// File: /home/nneessen/projects/commissionTracker/scripts/test-workflow-persistence.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWorkflowTriggerPersistence() {
  console.log('\n🧪 Testing Workflow Trigger Persistence...\n');

  try {
    // 1. Get an existing workflow or create one for testing
    let { data: workflows, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching workflows:', fetchError);
      return;
    }

    let workflow;

    if (!workflows || workflows.length === 0) {
      console.log('⚠️ No workflows found, creating a test workflow...');

      // Use a hardcoded user ID for testing with service key
      // This should be replaced with an actual user ID from your database
      const testUserId = 'a4df90ef-c30f-4709-9f04-4f06c6834de9'; // Replace with actual user ID

      // Create a test workflow
      const { data: created, error: createError } = await supabase
        .from('workflows')
        .insert({
          name: 'Test Workflow for Persistence',
          description: 'Testing trigger persistence',
          trigger_type: 'manual',
          config: { trigger: { type: 'manual' } },
          actions: [],
          created_by: testUserId,
          status: 'draft'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test workflow:', createError);
        return;
      }

      workflow = created;
      console.log('✅ Test workflow created:', workflow.id);
    } else {
      workflow = workflows[0];
    }

    console.log('📋 Testing with workflow:', workflow.id, workflow.name);
    console.log('  Current trigger_type:', workflow.trigger_type);
    console.log('  Current config:', JSON.stringify(workflow.config, null, 2));

    // 2. Update the workflow with an event trigger
    const updateData = {
      trigger_type: 'event',
      config: {
        ...workflow.config,
        trigger: {
          type: 'event',
          eventName: 'recruit.created'
        }
      }
    };

    console.log('\n🔄 Updating workflow with event trigger...');
    console.log('  Update data:', JSON.stringify(updateData, null, 2));

    const { data: updated, error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', workflow.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating workflow:', updateError);
      return;
    }

    console.log('\n✅ Workflow updated successfully');
    console.log('  New trigger_type:', updated.trigger_type);
    console.log('  New config:', JSON.stringify(updated.config, null, 2));

    // 3. Fetch it again to verify persistence
    console.log('\n🔍 Re-fetching workflow to verify persistence...');

    const { data: verified, error: verifyError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying workflow:', verifyError);
      return;
    }

    console.log('\n📊 Verification Results:');
    console.log('  trigger_type persisted:', verified.trigger_type === 'event' ? '✅' : '❌');
    console.log('  trigger_type value:', verified.trigger_type);
    console.log('  config.trigger persisted:', verified.config?.trigger?.type === 'event' ? '✅' : '❌');
    console.log('  config.trigger value:', JSON.stringify(verified.config?.trigger, null, 2));

    if (verified.trigger_type === 'event' && verified.config?.trigger?.type === 'event') {
      console.log('\n✅ SUCCESS: Trigger persistence is working correctly in the database!');
      console.log('The issue must be in the UI loading/updating logic.');
    } else {
      console.log('\n❌ FAILURE: Trigger is not persisting correctly in the database!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testWorkflowTriggerPersistence();