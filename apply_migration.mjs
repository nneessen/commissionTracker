import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    const sql = readFileSync('supabase/migrations/20251018_001_enhance_commission_chargeback_trigger.sql', 'utf8');

    console.log('Applying migration via SQL execution...');

    // Execute the entire SQL file at once
    const { data, error } = await supabase.rpc('exec', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);

      // Try alternative: split and execute individual commands
      console.log('Trying to execute commands individually...');

      const commands = sql
        .replace(/--.*$/gm, '') // Remove comments
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (let i = 0; i < commands.length; i++) {
        console.log(`Executing command ${i + 1}/${commands.length}...`);
        const { error: cmdError } = await supabase.rpc('exec', { sql_query: commands[i] + ';' });
        if (cmdError) {
          console.error(`Command ${i + 1} failed:`, cmdError.message);
        }
      }
    } else {
      console.log('Migration applied successfully!');
      console.log('Result:', data);
    }
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
