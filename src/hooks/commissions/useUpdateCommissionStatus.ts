// src/hooks/commissions/useUpdateCommissionStatus.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/base/supabase';

interface UpdateCommissionStatusParams {
  commissionId: string;
  status: 'pending' | 'earned' | 'paid' | 'charged_back' | 'cancelled';
  policyId?: string;
}

/**
 * Commission Status Architecture
 *
 * This hook handles manual commission status updates for the normal lifecycle:
 * - pending → earned → paid
 *
 * IMPORTANT: Terminal states (charged_back, cancelled, clawback) should NOT be set manually.
 * They are set automatically by database triggers when policies lapse/cancel.
 *
 * To cancel/lapse a policy, use policy action buttons which trigger database automation.
 */
export const useUpdateCommissionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commissionId, status, policyId }: UpdateCommissionStatusParams) => {
      // Prepare update data based on status
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // If changing to 'paid', clear all chargeback fields
      if (status === 'paid') {
        updateData.chargeback_amount = 0;
        updateData.chargeback_date = null;
        updateData.chargeback_reason = null;
      }

      // Update commission
      const { data: commissionData, error: commissionError } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', commissionId)
        .select()
        .single();

      if (commissionError) {
        throw commissionError;
      }

      // Update policy status when commission status changes
      if (policyId) {
        let policyStatus = 'active'; // default

        if (status === 'cancelled') {
          policyStatus = 'cancelled';
        } else if (status === 'paid') {
          policyStatus = 'active';
        } else if (status === 'pending') {
          policyStatus = 'pending';
        }

        const { error: policyError } = await supabase
          .from('policies')
          .update({
            status: policyStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', policyId);

        if (policyError) {
          throw new Error(`Failed to update policy status: ${policyError.message}`);
        }
      }

      return commissionData;
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['commission-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['chargeback-summary'] });
    }
  });
};
