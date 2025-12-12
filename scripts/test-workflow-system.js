#!/usr/bin/env node
// scripts/test-workflow-system.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkWorkflowSystem() {
  console.log('🔍 Checking Workflow System Status\n');
  console.log('=' . repeat(50));

  // 1. Check if tables exist
  console.log('\n📊 Checking workflow tables...');
  const tables = ['trigger_event_types', 'workflows', 'workflow_runs', 'workflow_events'];

  for (const tableName of tables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`  ❌ Table "${tableName}": NOT FOUND or ERROR - ${error.message}`);
    } else {
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      console.log(`  ✅ Table "${tableName}": EXISTS (${count || 0} records)`);
    }
  }

  // 2. Check event types
  console.log('\n🎯 Checking event types...');
  const { data: eventTypes, error: eventError } = await supabase
    .from('trigger_event_types')
    .select('event_name, category, is_active')
    .order('category', { ascending: true });

  if (eventError) {
    console.log(`  ❌ Cannot fetch event types: ${eventError.message}`);
  } else if (eventTypes && eventTypes.length > 0) {
    const categories = [...new Set(eventTypes.map(e => e.category))];
    console.log(`  ✅ Found ${eventTypes.length} event types in ${categories.length} categories:`);
    categories.forEach(cat => {
      const catEvents = eventTypes.filter(e => e.category === cat);
      console.log(`     ${cat}: ${catEvents.length} events`);
      catEvents.forEach(e => {
        console.log(`       - ${e.event_name} (${e.is_active ? 'active' : 'inactive'})`);
      });
    });
  } else {
    console.log('  ⚠️ No event types found');
  }

  // 3. Check workflows
  console.log('\n📋 Checking workflows...');
  const { data: workflows, error: workflowError } = await supabase
    .from('workflows')
    .select('id, name, trigger_type, status, config');

  if (workflowError) {
    console.log(`  ❌ Cannot fetch workflows: ${workflowError.message}`);
  } else if (workflows && workflows.length > 0) {
    console.log(`  ✅ Found ${workflows.length} workflows:`);
    workflows.forEach(w => {
      const eventName = w.config?.trigger?.eventName || 'N/A';
      console.log(`     - ${w.name}`);
      console.log(`       Type: ${w.trigger_type}, Status: ${w.status}`);
      if (w.trigger_type === 'event') {
        console.log(`       Event: ${eventName}`);
      }
    });
  } else {
    console.log('  ⚠️ No workflows found');
  }

  // 4. Check recent workflow runs
  console.log('\n🏃 Checking recent workflow runs...');
  const { data: runs, error: runsError } = await supabase
    .from('workflow_runs')
    .select('id, status, trigger_source, created_at, error')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.log(`  ❌ Cannot fetch workflow runs: ${runsError.message}`);
  } else if (runs && runs.length > 0) {
    console.log(`  ✅ Last ${runs.length} workflow runs:`);
    runs.forEach(r => {
      const date = new Date(r.created_at).toLocaleString();
      console.log(`     - ${date}: ${r.trigger_source} - ${r.status}`);
      if (r.error) {
        console.log(`       Error: ${r.error}`);
      }
    });
  } else {
    console.log('  ⚠️ No workflow runs found');
  }

  // 5. Check recent events
  console.log('\n🔔 Checking recent events...');
  const { data: events, error: eventsError } = await supabase
    .from('workflow_events')
    .select('event_name, fired_at, workflows_triggered')
    .order('fired_at', { ascending: false })
    .limit(10);

  if (eventsError) {
    console.log(`  ❌ Cannot fetch events: ${eventsError.message}`);
  } else if (events && events.length > 0) {
    console.log(`  ✅ Last ${events.length} events:`);
    events.forEach(e => {
      const date = new Date(e.fired_at).toLocaleString();
      console.log(`     - ${date}: ${e.event_name} (${e.workflows_triggered} workflows triggered)`);
    });
  } else {
    console.log('  ⚠️ No events recorded yet');
  }

  // 6. Test creating a sample workflow
  console.log('\n🧪 Testing workflow creation...');
  const testWorkflow = {
    name: 'Test Recruit Welcome Email',
    description: 'Send welcome email when recruit is created',
    trigger_type: 'event',
    config: {
      trigger: {
        eventName: 'recruit.created'
      }
    },
    actions: [
      {
        type: 'send_email',
        config: {
          template: 'recruit_welcome',
          to: '{{recruitEmail}}',
          subject: 'Welcome {{recruitName}}!'
        }
      }
    ],
    status: 'active',
    created_by: 'd0d3edea-af6d-4990-80b8-1765ba829896' // Your user ID
  };

  const { data: newWorkflow, error: createError } = await supabase
    .from('workflows')
    .insert(testWorkflow)
    .select()
    .single();

  if (createError) {
    console.log(`  ❌ Cannot create test workflow: ${createError.message}`);
  } else {
    console.log(`  ✅ Test workflow created successfully: ${newWorkflow.name} (ID: ${newWorkflow.id})`);
    console.log('     This workflow will trigger when a recruit is created');
  }

  console.log('\n' + '=' . repeat(50));
  console.log('✨ Workflow System Check Complete!\n');

  // Summary
  console.log('📌 SUMMARY:');
  console.log('   - To see Event Types UI: Go to Training Hub → Automation → Event Types tab');
  console.log('   - Event Types tab is only visible to admins (you are now admin)');
  console.log('   - Workflows should trigger when events fire');
  console.log('   - Check browser console for event logs when creating recruits');
}

checkWorkflowSystem();