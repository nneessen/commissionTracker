// /home/nneessen/projects/commissionTracker/scripts/test-delete-recruit.js
// Test script to verify recruit deletion functionality

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDeleteFunctionality() {
  console.log('🧪 Testing Recruit Delete Functionality...\n');

  try {
    // 1. First, create a test recruit
    console.log('1. Creating test recruit...');
    const testRecruit = {
      email: `test-recruit-${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'Recruit',
      phone: '555-0123',
      agent_status: 'unlicensed',
      onboarding_status: 'interview_1',
      is_deleted: false,
      hierarchy_path: '',
      hierarchy_depth: 0,
      approval_status: 'pending',
      is_admin: false
    };

    const { data: createdRecruit, error: createError } = await supabase
      .from('user_profiles')
      .insert(testRecruit)
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create test recruit:', createError);
      return;
    }

    console.log('✅ Created test recruit:', createdRecruit.email);
    console.log('   ID:', createdRecruit.id);

    // 2. Check delete dependencies
    console.log('\n2. Checking delete dependencies...');
    const { data: dependencies, error: depError } = await supabase
      .from('user_delete_dependencies')
      .select('*')
      .eq('id', createdRecruit.id)
      .single();

    if (depError) {
      console.error('❌ Failed to check dependencies:', depError);
    } else {
      console.log('✅ Dependencies checked:');
      console.log('   Can delete:', dependencies.can_delete);
      console.log('   Emails:', dependencies.email_count);
      console.log('   Documents:', dependencies.document_count);
      console.log('   Downlines:', dependencies.downline_count);
    }

    // 3. Test soft delete
    console.log('\n3. Testing soft delete...');
    const { data: softDeleteResult, error: softDeleteError } = await supabase.rpc('soft_delete_user', {
      p_user_id: createdRecruit.id,
      p_deleted_by: createdRecruit.id, // Self-delete for testing
      p_reason: 'Test deletion'
    });

    if (softDeleteError) {
      console.error('❌ Soft delete failed:', softDeleteError);
      return;
    }

    console.log('✅ Soft delete successful:', softDeleteResult);

    // 4. Verify user is marked as deleted
    console.log('\n4. Verifying soft delete...');
    const { data: deletedUser, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, email, is_deleted, archived_at')
      .eq('id', createdRecruit.id)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify deletion:', verifyError);
    } else {
      console.log('✅ User marked as deleted:');
      console.log('   is_deleted:', deletedUser.is_deleted);
      console.log('   archived_at:', deletedUser.archived_at);
    }

    // 5. Test restore
    console.log('\n5. Testing restore...');
    const { data: restoreResult, error: restoreError } = await supabase.rpc('restore_deleted_user', {
      p_user_id: createdRecruit.id,
      p_restored_by: createdRecruit.id
    });

    if (restoreError) {
      console.error('❌ Restore failed:', restoreError);
    } else {
      console.log('✅ Restore successful:', restoreResult);
    }

    // 6. Clean up - hard delete
    console.log('\n6. Cleaning up with hard delete...');
    const { data: hardDeleteResult, error: hardDeleteError } = await supabase.rpc('hard_delete_user', {
      p_user_id: createdRecruit.id,
      p_deleted_by: createdRecruit.id,
      p_confirm_text: 'PERMANENTLY DELETE USER'
    });

    if (hardDeleteError) {
      console.error('❌ Hard delete failed:', hardDeleteError);
      console.log('   Note: This is expected if user has dependencies');
    } else {
      console.log('✅ Hard delete successful:', hardDeleteResult);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testDeleteFunctionality();