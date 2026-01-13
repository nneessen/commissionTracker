// scripts/list-products.js
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, product_type, carrier_id, carriers(name)')
    .order('name');

  if (error) {
    console.error(error);
    return;
  }

  // Group by carrier
  const byCarrier = {};
  data.forEach(p => {
    const c = p.carriers?.name || 'Unknown';
    if (!byCarrier[c]) byCarrier[c] = [];
    byCarrier[c].push(p);
  });

  Object.keys(byCarrier).sort().forEach(carrier => {
    console.log('\n=== ' + carrier + ' ===');
    byCarrier[carrier].forEach(p => {
      console.log(`  ${p.name} [${p.product_type || 'no type'}] - ${p.id}`);
    });
  });
}

listProducts();
