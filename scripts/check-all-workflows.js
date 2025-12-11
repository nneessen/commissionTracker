// /home/nneessen/projects/commissionTracker/scripts/check-all-workflows.js
// Check for ALL workflows in database without user filters

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzEwOTIsImV4cCI6MjA3MzU0NzA5Mn0.4p4k0ysuStPsqWzVQhlWona0mQaebdbX_lEvrFUJxZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllWorkflows() {
  console.log('\n🔍 CHECKING ALL WORKFLOWS IN DATABASE');
  console.log('=' .repeat(50));

  // 1. Get ALL workflows without any user filter
  const { data: allWorkflows, error: wfError } = await supabase
    .from('workflows')
    .select('id, name, created_by, status, trigger_type, actions, created_at')
    .order('created_at', { ascending: false });

  if (wfError) {
    console.error('❌ Error fetching workflows:', wfError);
    return;
  }

  if (!allWorkflows || allWorkflows.length === 0) {
    console.log('\n❌ NO workflows found in database at all!');
    console.log('   The database table is completely empty.');
  } else {
    console.log(`\n✅ Found ${allWorkflows.length} workflows:`);
    allWorkflows.forEach(wf => {
      console.log(`\n  📌 ${wf.name}`);
      console.log(`     ID: ${wf.id}`);
      console.log(`     Created By: ${wf.created_by}`);
      console.log(`     Status: ${wf.status}`);
      console.log(`     Trigger: ${wf.trigger_type}`);
      console.log(`     Actions: ${wf.actions ? wf.actions.length : 0}`);
      console.log(`     Created: ${wf.created_at}`);
    });
  }

  // 2. Check if user is authenticated
  console.log('\n\n📋 AUTHENTICATION CHECK:');
  console.log('=' .repeat(50));

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('❌ Not authenticated - this might be why you see 0 workflows');
    console.log('   Try logging in first');
  } else {
    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);

    // Check workflows for this specific user
    const { data: userWorkflows, error: userWfError } = await supabase
      .from('workflows')
      .select('id, name')
      .eq('created_by', user.id);

    if (!userWfError && userWorkflows) {
      console.log(`   User's workflows: ${userWorkflows.length}`);
      if (userWorkflows.length > 0) {
        userWorkflows.forEach(wf => {
          console.log(`     - ${wf.name} (${wf.id})`);
        });
      }
    }
  }

  // 3. Check if there are any workflow_templates that might be shown
  console.log('\n\n📦 WORKFLOW TEMPLATES:');
  console.log('=' .repeat(50));

  const { data: templates, error: tmplError } = await supabase
    .from('workflow_templates')
    .select('id, name, description')
    .limit(5);

  if (tmplError) {
    console.log('❌ Error checking templates:', tmplError);
  } else if (!templates || templates.length === 0) {
    console.log('No templates found');
  } else {
    console.log(`Found ${templates.length} templates:`);
    templates.forEach(t => {
      console.log(`  - ${t.name}: ${t.description}`);
    });
  }

  // 4. Direct SQL query to bypass any potential issues
  console.log('\n\n🗄️ DIRECT TABLE CHECK:');
  console.log('=' .repeat(50));

  const { data: tableInfo, error: tableError } = await supabase
    .rpc('get_table_row_count', { table_name: 'workflows' })
    .single();

  if (tableError) {
    // Try a simpler approach
    const { count, error: countError } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`Table row count: ${count}`);
    } else {
      console.log('Could not get table count');
    }
  } else {
    console.log(`Table row count: ${tableInfo}`);
  }

  console.log('\n\n🎯 CONCLUSION:');
  console.log('=' .repeat(50));

  if (!allWorkflows || allWorkflows.length === 0) {
    console.log('The workflows table is EMPTY.');
    console.log('This means the UI is either:');
    console.log('1. Showing cached/stale data');
    console.log('2. Showing hardcoded/mock data');
    console.log('3. There\'s a sync issue between UI and database');
    console.log('\nNext step: Check the React components for any hardcoded data or mock data.');
  } else {
    console.log(`Found ${allWorkflows.length} workflows in the database.`);
  }
}

checkAllWorkflows().catch(console.error);