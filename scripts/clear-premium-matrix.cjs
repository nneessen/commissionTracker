const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Key:', supabaseKey ? 'Found' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearPremiumMatrix() {
  const { count, error: countError } = await supabase
    .from('premium_matrix')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting:', countError);
    return;
  }

  console.log(`Found ${count} premium matrix entries to delete`);

  if (count === 0) {
    console.log('Nothing to delete');
    return;
  }

  const { error } = await supabase
    .from('premium_matrix')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Delete command executed');
  }
  
  const { count: newCount } = await supabase
    .from('premium_matrix')
    .select('*', { count: 'exact', head: true });
  console.log(`Remaining entries: ${newCount}`);
}

clearPremiumMatrix();
