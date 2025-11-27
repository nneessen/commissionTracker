const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pcyaqwodnyrpkaiojnpz',
  password: 'N123j234n345!$!$',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('📝 Connecting to production database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const migrationPath = 'supabase/migrations/20251127181301_add_rbac_table_security.sql';
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Executing RBAC security migration...');
    console.log('   SQL length:', sql.length, 'characters\n');

    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');

    console.log('🔍 Verifying migration...');
    const verifyFunction = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname = 'get_role_permissions_with_inheritance'
    `);

    const verifyTrigger = await client.query(`
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgname = 'prevent_system_role_changes'
    `);

    const verifyPolicies = await client.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE tablename IN ('roles', 'permissions', 'role_permissions')
    `);

    console.log('✅ Function exists:', verifyFunction.rows.length > 0 ? 'YES' : 'NO');
    console.log('✅ Trigger exists:', verifyTrigger.rows.length > 0 ? 'YES' : 'NO');
    console.log('✅ RLS Policies:', verifyPolicies.rows.length, 'found');

    console.log('\n🎉 RBAC security migration deployed successfully to production!');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

runMigration();
