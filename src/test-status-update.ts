// /home/nneessen/projects/commissionTracker/src/test-status-update.ts
import {supabase} from './services/base/supabase';

export async function testStatusUpdate() {
  console.log('=== TESTING STATUS UPDATE CASCADE ===');

  try {
    // 1. Get the first policy with a commission
    const { data: policies, error: fetchError } = await supabase
      .from('policies')
      .select('*, commissions(*)')
      .limit(1);

    if (fetchError || !policies || policies.length === 0) {
      console.error('Cannot fetch policies:', fetchError);
      return;
    }

    const policy = policies[0];
    const commission = policy.commissions?.[0];

    if (!commission) {
      console.error('No commission found for policy');
      return;
    }

    console.log('Testing with Policy:', policy.id, 'Status:', policy.status);
    console.log('Commission:', commission.id, 'Status:', commission.status);

    // 2. Try updating commission to cancelled and check if policy follows
    console.log('\n=== STEP 1: Update commission to CANCELLED ===');
    const { data: updatedCommission, error: commError } = await supabase
      .from('commissions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', commission.id)
      .select()
      .single();

    if (commError) {
      console.error('Commission update failed:', commError);
      return;
    }
    console.log('Commission updated to:', updatedCommission.status);

    // 3. Now update the policy status directly
    console.log('\n=== STEP 2: Update policy to CANCELLED ===');
    const { data: updatedPolicy, error: policyError } = await supabase
      .from('policies')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', policy.id)
      .select()
      .single();

    if (policyError) {
      console.error('POLICY UPDATE FAILED:', policyError);
      console.error('Error details:', {
        code: policyError.code,
        message: policyError.message,
        details: policyError.details,
        hint: policyError.hint
      });
    } else {
      console.log('POLICY UPDATED SUCCESSFULLY:', updatedPolicy);
    }

    // 4. Verify the final state
    console.log('\n=== STEP 3: Verify final state ===');
    const { data: finalPolicy, error: verifyError } = await supabase
      .from('policies')
      .select('*, commissions(*)')
      .eq('id', policy.id)
      .single();

    if (verifyError) {
      console.error('Cannot verify:', verifyError);
      return;
    }

    console.log('Final Policy Status:', finalPolicy.status);
    console.log('Final Commission Status:', finalPolicy.commissions?.[0]?.status);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

export async function testDirectPolicyUpdate(policyId: string) {
  console.log('=== DIRECT POLICY UPDATE TEST ===');
  console.log('Policy ID:', policyId);

  try {
    // 1. First check current status
    const { data: policy, error: readError } = await supabase
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (readError) {
      console.error('Cannot read policy:', readError);
      return;
    }

    console.log('Current policy status:', policy.status);

    // 2. Try to update policy status directly
    const { data: updatedPolicy, error: updateError } = await supabase
      .from('policies')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single();

    if (updateError) {
      console.error('POLICY UPDATE FAILED:', updateError);
      console.error('Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
    } else {
      console.log('POLICY UPDATED SUCCESSFULLY to:', updatedPolicy.status);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export for use in console
(window as any).testStatusUpdate = testStatusUpdate;
(window as any).testDirectPolicyUpdate = testDirectPolicyUpdate;