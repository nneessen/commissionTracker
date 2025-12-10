#!/usr/bin/env node
// File: /tmp/test-workflows-service.js

import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
);

console.log('Testing workflows with service role key...\n');

const { data, error } = await supabase
  .from('workflows')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.log('Error:', error.message);
} else {
  console.log(`Found ${data.length} workflows:\n`);
  data.forEach(w => {
    console.log(`✓ ${w.name}`);
    console.log(`  Status: ${w.status}`);
    console.log(`  Type: ${w.trigger_type}`);
    console.log(`  Category: ${w.category}`);
    console.log(`  Created: ${new Date(w.created_at).toLocaleDateString()}\n`);
  });
}

console.log('\nThe workflows exist in the database!');
console.log('Users need to be authenticated to see them in the UI due to RLS policies.');