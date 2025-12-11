// /home/nneessen/projects/commissionTracker/scripts/remove-duplicate-role.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
);

async function removeDuplicateRole() {
  console.log('🔧 REMOVING DUPLICATE active_agent ROLE');
  console.log('=' .repeat(50));

  // First, check who has the active_agent role
  const { data: usersWithRole } = await supabase
    .from('user_profiles')
    .select('id, email, roles, agent_status')
    .contains('roles', ['active_agent']);

  console.log(`\nUsers with active_agent role: ${usersWithRole?.length || 0}`);

  if (usersWithRole && usersWithRole.length > 0) {
    console.log('\nMigrating users from active_agent role to agent_status=licensed...');

    for (const user of usersWithRole) {
      // Remove active_agent from roles array and ensure they have agent role
      const newRoles = user.roles.filter(r => r !== 'active_agent');
      if (!newRoles.includes('agent')) {
        newRoles.push('agent');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          roles: newRoles,
          agent_status: 'licensed' // Set to licensed if they had active_agent
        })
        .eq('id', user.id);

      if (error) {
        console.error(`  ❌ Failed to update ${user.email}: ${error.message}`);
      } else {
        console.log(`  ✅ Updated ${user.email}: removed active_agent role, set agent_status=licensed`);
      }
    }
  }

  // Now delete the active_agent role from the roles table
  const { error: deleteError } = await supabase
    .from('roles')
    .delete()
    .eq('name', 'active_agent');

  if (deleteError) {
    console.error('\n❌ Failed to delete active_agent role:', deleteError);
  } else {
    console.log('\n✅ Deleted active_agent role from roles table');
  }

  // Verify the role is gone
  const { data: remainingRoles } = await supabase
    .from('roles')
    .select('name, display_name')
    .order('name');

  console.log('\n📋 Remaining roles:');
  remainingRoles?.forEach(r => console.log(`  - ${r.display_name} (${r.name})`));

  console.log('\n✅ FIXED: No more duplicate checkboxes!');
  console.log('   Now using agent_status field exclusively for active agent status.');
  console.log('\n📝 Next time you edit a user:');
  console.log('   - You will only see ONE control for agent status');
  console.log('   - Use the "Agent Status" dropdown to set Licensed/Unlicensed');
  console.log('   - No more duplicate "Active Agent" checkbox in roles');
}

removeDuplicateRole().catch(console.error);