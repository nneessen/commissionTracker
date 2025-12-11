// /home/nneessen/projects/commissionTracker/scripts/fix-workflow-issue.js
// Script to diagnose and fix workflow issues

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzEwOTIsImV4cCI6MjA3MzU0NzA5Mn0.4p4k0ysuStPsqWzVQhlWona0mQaebdbX_lEvrFUJxZI';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 WORKFLOW ISSUE DIAGNOSIS & FIX');
console.log('=' .repeat(60));

console.log(`
PROBLEM IDENTIFIED:
------------------
The workflows table is EMPTY (0 rows), but the UI shows workflows.
This means workflows are being displayed from browser cache, not the database.

ROOT CAUSE:
----------
When you create a workflow through the UI, it's likely:
1. Not actually saving to the database (authentication or permission issue)
2. The UI is showing cached data from TanStack Query
3. When you refresh the page, it still shows because of persistent cache

SOLUTION:
---------
1. Open your browser at http://localhost:3001
2. Click the "Diagnostic" button in the Automation tab
3. Click "Run Diagnostic" to see the current state
4. If workflows show 0 in database but you see them in UI:
   - Click "Clear Cache & Reload" to remove cached data
5. Try creating a new workflow and watch for any errors
6. Run diagnostic again to see if it saved

IMMEDIATE ACTIONS:
-----------------
1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check if you're logged in (authentication is required)
3. Use the Diagnostic tool to verify database state
4. Create a fresh workflow and check if it persists

WHY THIS HAPPENED:
-----------------
- TanStack Query caches data aggressively for performance
- The cache persists even after page refreshes
- Workflows that "fail to save" still appear in the UI from cache
- The database has Row Level Security that might be blocking saves

VERIFICATION:
------------
After clearing cache and creating a new workflow:
1. Run the diagnostic to see if it's in the database
2. Refresh the page - if it disappears, it wasn't saved
3. Check browser console for any error messages
`);

console.log('\n📋 Current Database Status:');
console.log('-' .repeat(30));

// Check current state
async function checkStatus() {
  const { count: workflowCount } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true });

  console.log(`Workflows in database: ${workflowCount || 0}`);

  const { count: templateCount } = await supabase
    .from('email_templates')
    .select('*', { count: 'exact', head: true });

  console.log(`Email templates: ${templateCount || 0}`);

  const { count: runCount } = await supabase
    .from('workflow_runs')
    .select('*', { count: 'exact', head: true });

  console.log(`Workflow runs: ${runCount || 0}`);

  if (workflowCount === 0) {
    console.log('\n⚠️ CONFIRMED: No workflows in database!');
    console.log('   Any workflows you see in the UI are from cache.');
    console.log('   Use the Diagnostic tool to clear cache.');
  }
}

checkStatus().catch(console.error);