const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pcyaqwodnyrpkaiojnpz',
  password: 'N123j234n345!$!$',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function verify() {
  try {
    console.log('📝 Connecting...');
    await client.connect();
    console.log('✅ Connected!\n');

    const verifyFunction = await client.query(`
      SELECT proname FROM pg_proc WHERE proname = 'get_role_permissions_with_inheritance'
    `);
    
    const verifyTrigger = await client.query(`
      SELECT tgname FROM pg_trigger WHERE tgname = 'prevent_system_role_changes'
    `);
    
    const verifyPolicies = await client.query(`
      SELECT COUNT(*) as count FROM pg_policies 
      WHERE tablename IN ('roles', 'permissions', 'role_permissions')
    `);

    console.log('Function exists:', verifyFunction.rows.length > 0 ? '✅ YES' : '❌ NO');
    console.log('Trigger exists:', verifyTrigger.rows.length > 0 ? '✅ YES' : '❌ NO');
    console.log('RLS Policies:', verifyPolicies.rows[0].count, 'found');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
