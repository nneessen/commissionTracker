// /home/nneessen/projects/commissionTracker/scripts/fix-permissions-client.ts
// Run this in the browser console to fix active_agent permissions

import { supabase } from '@/services/base/supabase';

async function fixActiveAgentPermissions() {
  console.log('🔧 Fixing active_agent role permissions...');

  try {
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('fix-active-agent-permissions', {
      body: {}
    });

    if (error) {
      console.error('❌ Failed:', error);
      return;
    }

    console.log('✅ Success!', data);
    console.log(`Permissions granted: ${data.permissions_granted}`);
    console.log(`Total attempted: ${data.permissions_attempted}`);

    console.log('\n📝 Next steps:');
    console.log('1. Log out');
    console.log('2. Log back in as nick.neessen@gmail.com');
    console.log('3. You should now see all navigation items!');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Export for use in browser console
window.fixActiveAgentPermissions = fixActiveAgentPermissions;

// Instructions
console.log('To fix permissions, run: fixActiveAgentPermissions()');