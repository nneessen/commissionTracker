// /home/nneessen/projects/commissionTracker/scripts/fix-simple-term.js
// Fix Simple Term product - move from John Hancock to United Home Life

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSimpleTerm() {
  console.log('🔧 Fixing Simple Term product assignment...\n');

  try {
    // First, delete Simple Term from John Hancock
    console.log('1️⃣ Removing Simple Term from John Hancock...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('carrier_id', '00001009-0000-0000-0000-000000000000')
      .eq('name', 'Simple Term');

    if (deleteError) {
      console.error('❌ Error deleting Simple Term from John Hancock:', deleteError);
    } else {
      console.log('✅ Removed Simple Term from John Hancock');
    }

    // Now add Simple Term to United Home Life
    console.log('\n2️⃣ Adding Simple Term to United Home Life...');
    const { error: insertError } = await supabase
      .from('products')
      .insert({
        carrier_id: '00001000-0000-0000-0000-000000000000', // United Home Life
        name: 'Simple Term',
        code: 'UHL-ST',
        product_type: 'term_life',
        description: 'Simple Term product',
        commission_percentage: 1.10, // 110% at contract level 105
        is_active: true
      });

    if (insertError) {
      console.error('❌ Error adding Simple Term to United Home Life:', insertError);
    } else {
      console.log('✅ Added Simple Term to United Home Life');
    }

    // Verify the fix
    console.log('\n3️⃣ Verifying the correction...\n');

    // Check United Home Life products
    const { data: uhlProducts } = await supabase
      .from('products')
      .select('name, commission_percentage')
      .eq('carrier_id', '00001000-0000-0000-0000-000000000000')
      .order('name');

    console.log('United Home Life products:');
    uhlProducts?.forEach(p => {
      console.log(`  - ${p.name}: ${(p.commission_percentage * 100).toFixed(1)}%`);
    });

    // Check John Hancock products
    const { data: jhProducts } = await supabase
      .from('products')
      .select('name, commission_percentage')
      .eq('carrier_id', '00001009-0000-0000-0000-000000000000')
      .order('name');

    console.log('\nJohn Hancock products:');
    jhProducts?.forEach(p => {
      console.log(`  - ${p.name}: ${(p.commission_percentage * 100).toFixed(1)}%`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSimpleTerm().then(() => {
  console.log('\n✅ Simple Term has been correctly moved to United Home Life!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});