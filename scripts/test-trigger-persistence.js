// /home/nneessen/projects/commissionTracker/scripts/test-trigger-persistence.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTriggerPersistence() {
  try {
    console.log('\n=== Testing Workflow Trigger Persistence ===\n');

    // Authenticate with a test user if needed
    const authEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const authPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

    console.log('Attempting authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    if (authError) {
      console.log('Authentication failed, trying without auth:', authError.message);
      // Continue without auth - may work if RLS policies allow
    } else {
      console.log('Authenticated successfully');
    }

    // 1. First, get a workflow to test with
    const { data: workflows, error: fetchError } = await supabase
      .from('workflows')
      .select('id, name, trigger_type, config')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching workflows:', fetchError);
      return;
    }

    if (!workflows || workflows.length === 0) {
      console.log('No workflows found to test with');
      return;
    }

    const testWorkflow = workflows[0];
    console.log('Testing with workflow:', {
      id: testWorkflow.id,
      name: testWorkflow.name,
      current_trigger_type: testWorkflow.trigger_type,
      current_trigger_config: testWorkflow.config?.trigger
    });

    // 2. Update the workflow with new trigger configuration
    console.log('\n--- Updating workflow trigger to event type ---');

    const updateData = {
      trigger_type: 'event',
      config: {
        ...testWorkflow.config,
        trigger: {
          type: 'event',
          eventName: 'recruit.created'
        }
      },
      updated_at: new Date().toISOString()
    };

    console.log('Update data being sent:', JSON.stringify(updateData, null, 2));

    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', testWorkflow.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating workflow:', updateError);
      return;
    }

    console.log('\nUpdate successful! New values:', {
      id: updatedWorkflow.id,
      trigger_type: updatedWorkflow.trigger_type,
      trigger_config: updatedWorkflow.config?.trigger
    });

    // 3. Fetch the workflow again to verify persistence
    console.log('\n--- Fetching workflow again to verify persistence ---');

    const { data: verifyWorkflow, error: verifyError } = await supabase
      .from('workflows')
      .select('id, name, trigger_type, config')
      .eq('id', testWorkflow.id)
      .single();

    if (verifyError) {
      console.error('Error verifying workflow:', verifyError);
      return;
    }

    console.log('Verification result:', {
      id: verifyWorkflow.id,
      name: verifyWorkflow.name,
      trigger_type: verifyWorkflow.trigger_type,
      trigger_config: verifyWorkflow.config?.trigger
    });

    // 4. Check if the values persisted correctly
    const persistedCorrectly =
      verifyWorkflow.trigger_type === 'event' &&
      verifyWorkflow.config?.trigger?.type === 'event' &&
      verifyWorkflow.config?.trigger?.eventName === 'recruit.created';

    if (persistedCorrectly) {
      console.log('\n✅ SUCCESS: Trigger configuration persisted correctly!');
    } else {
      console.log('\n❌ FAILURE: Trigger configuration did not persist correctly');
      console.log('Expected trigger_type: event');
      console.log('Got trigger_type:', verifyWorkflow.trigger_type);
      console.log('Expected trigger config:', { type: 'event', eventName: 'recruit.created' });
      console.log('Got trigger config:', verifyWorkflow.config?.trigger);
    }

    // 5. Optional: Restore original values
    console.log('\n--- Restoring original values ---');
    await supabase
      .from('workflows')
      .update({
        trigger_type: testWorkflow.trigger_type,
        config: testWorkflow.config
      })
      .eq('id', testWorkflow.id);

    console.log('Original values restored');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testTriggerPersistence();