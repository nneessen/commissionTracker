#!/usr/bin/env node
// File: /home/nneessen/projects/commissionTracker/scripts/test-workflow-query.js

import { createClient } from '@supabase/supabase-js';

// Create client with anon key (like the frontend does)
const supabase = createClient(
  'https://pcyaqwodnyrpkaiojnpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzEwOTIsImV4cCI6MjA3MzU0NzA5Mn0.4p4k0ysuStPsqWzVQhlWona0mQaebdbX_lEvrFUJxZI'
);

console.log('Testing workflow query as frontend would...\n');

// First, check if there's a session
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  console.log('Current session user:', session.user.email);
  console.log('User ID:', session.user.id);
} else {
  console.log('No active session - you need to log in to the app');
}

// Try to query workflows (this is what the frontend does)
console.log('\nQuerying workflows...');
const { data, error } = await supabase
  .from('workflows')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.log('Error querying workflows:', error.message);
  console.log('Error code:', error.code);

  if (error.code === '42501') {
    console.log('\nThis is an RLS policy error - you need to be authenticated');
    console.log('The workflows exist but you cannot see them without being logged in');
  }
} else {
  console.log('Workflows found:', data.length);
  if (data.length > 0) {
    data.forEach(w => {
      console.log(`- ${w.name} (${w.status})`);
    });
  }
}

console.log('\n=== SOLUTION ===');
console.log('You need to be logged into the app for the workflows to appear.');
console.log('1. Make sure you are logged in at http://localhost:3001');
console.log('2. If not logged in, log in with your credentials');
console.log('3. Then navigate to Training Hub > Automation tab');
console.log('4. The workflows should appear once you are authenticated');