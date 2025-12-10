#!/usr/bin/env node
// File: /home/nneessen/projects/commissionTracker/scripts/fix-workflows-now.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y',
  { auth: { persistSession: false } }
);

console.log('Fixing workflow ownership...\n');

// Get Nick's actual user ID
const { data: nickProfile } = await supabase
  .from('user_profiles')
  .select('id, email')
  .eq('email', 'nick@nickneessen.com')
  .single();

if (!nickProfile) {
  console.error('Could not find user profile for nick@nickneessen.com');
  process.exit(1);
}

console.log('Found user:', nickProfile.email);
console.log('User ID:', nickProfile.id);

// Check current workflows
const { data: workflows } = await supabase
  .from('workflows')
  .select('id, name, created_by');

console.log('\nCurrent workflows:');
workflows?.forEach(w => {
  console.log(`- ${w.name}`);
  console.log(`  Created by: ${w.created_by}`);
  console.log(`  Needs fix: ${w.created_by !== nickProfile.id ? 'YES' : 'NO'}`);
});

// Fix ownership
const { error } = await supabase
  .from('workflows')
  .update({
    created_by: nickProfile.id,
    last_modified_by: nickProfile.id
  })
  .neq('created_by', nickProfile.id);

if (error) {
  console.error('Error updating workflows:', error);
} else {
  console.log('\n✅ Workflow ownership fixed!');
}

// Verify
const { data: fixed } = await supabase
  .from('workflows')
  .select('name, created_by')
  .eq('created_by', nickProfile.id);

console.log('\nWorkflows now owned by you:', fixed?.length || 0);
fixed?.forEach(w => console.log(`- ${w.name}`));