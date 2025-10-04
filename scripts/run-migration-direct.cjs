// scripts/run-migration-direct.js
// Execute migration SQL directly via pg client

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use pooler connection to avoid IPv6 issues
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
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251004_add_referral_source_to_policies.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration...');
    console.log('SQL length:', sql.length, 'characters');

    const result = await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('Result:', result);

    // Verify the column was added
    console.log('\nVerifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'policies' AND column_name = 'referral_source'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Column verified:', verifyResult.rows[0]);
    } else {
      console.log('❌ Column not found!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error message:', error.message || 'Unknown error');
    console.error('Error code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('Stack:', error.stack);
    if (error.position) {
      console.error('Position:', error.position);
    }
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore close errors
    }
  }
}

runMigration();
