// /home/nneessen/projects/commissionTracker/scripts/check-rls-policies.js
// Check RLS policies on workflows table

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzEwOTIsImV4cCI6MjA3MzU0NzA5Mn0.4p4k0ysuStPsqWzVQhlWona0mQaebdbX_lEvrFUJxZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS Policies on Workflows Table');
  console.log('=' .repeat(50));

  // Try to insert a test workflow WITHOUT authentication
  console.log('\n1. Testing INSERT without authentication...');
  const { data: noAuthInsert, error: noAuthError } = await supabase
    .from('workflows')
    .insert({
      name: 'Test Without Auth',
      trigger_type: 'manual',
      status: 'draft',
      actions: [],
      created_by: 'test-user-id'
    })
    .select();

  if (noAuthError) {
    console.log('❌ Cannot insert without auth:', noAuthError.message);
    if (noAuthError.message.includes('policy')) {
      console.log('   → RLS is blocking unauthenticated inserts (this is good!)');
    }
  } else {
    console.log('⚠️ WARNING: Insert succeeded without auth! RLS may be disabled.');
  }

  // Now authenticate and try again
  console.log('\n2. Attempting to authenticate...');

  // You'll need to provide real credentials here
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'your-email@example.com', // REPLACE WITH YOUR EMAIL
    password: 'your-password' // REPLACE WITH YOUR PASSWORD
  });

  if (authError) {
    console.log('⚠️ Cannot authenticate. Please update the script with valid credentials.');
    console.log('   Error:', authError.message);

    console.log('\n📝 To fix workflows not saving:');
    console.log('1. Check if RLS is enabled on the workflows table');
    console.log('2. Ensure the RLS policy allows authenticated users to insert');
    console.log('3. Check if created_by field is properly set to auth.uid()');

    return;
  }

  const user = authData.user;
  console.log('✅ Authenticated as:', user.email);

  // Try to insert with authentication
  console.log('\n3. Testing INSERT with authentication...');
  const testWorkflow = {
    name: `Test Workflow ${Date.now()}`,
    description: 'Testing if saves work',
    category: 'general',
    trigger_type: 'manual',
    status: 'draft',
    config: { trigger: { type: 'manual' } },
    actions: [],
    max_runs_per_day: 50,
    priority: 50,
    created_by: user.id
  };

  const { data: authInsert, error: authInsertError } = await supabase
    .from('workflows')
    .insert(testWorkflow)
    .select()
    .single();

  if (authInsertError) {
    console.log('❌ Cannot insert with auth:', authInsertError.message);

    if (authInsertError.message.includes('created_by')) {
      console.log('\n🔧 FIX NEEDED: The created_by field constraint is the issue!');
      console.log('   The RLS policy likely requires created_by = auth.uid()');
      console.log('   But the field might not be getting set properly.');
    }
  } else {
    console.log('✅ Workflow created successfully!');
    console.log('   ID:', authInsert.id);
    console.log('   Name:', authInsert.name);

    // Clean up test workflow
    await supabase.from('workflows').delete().eq('id', authInsert.id);
    console.log('   (Test workflow deleted)');
  }

  // Check if we can read workflows
  console.log('\n4. Testing SELECT with authentication...');
  const { data: workflows, error: selectError } = await supabase
    .from('workflows')
    .select('id, name, created_by');

  if (selectError) {
    console.log('❌ Cannot read workflows:', selectError.message);
  } else {
    console.log(`✅ Can read workflows. Found ${workflows?.length || 0} workflows`);
    if (workflows && workflows.length > 0) {
      workflows.forEach(w => {
        console.log(`   - ${w.name} (created by: ${w.created_by})`);
      });
    }
  }

  await supabase.auth.signOut();
  console.log('\n✅ Test complete');
}

checkRLSPolicies().catch(console.error);