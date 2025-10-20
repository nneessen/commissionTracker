// src/hooks/commissions/useUpdateCommissionStatus.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/base/supabase';

interface UpdateCommissionStatusParams {
  commissionId: string;
  status: 'pending' | 'earned' | 'paid' | 'charged_back' | 'cancelled';
  policyId?: string;
}

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

      // CRITICAL: Update policy status based on commission status
      if (policyId) {
        let policyStatus = 'active'; // default

        if (status === 'cancelled' || status === 'charged_back') {
          policyStatus = 'cancelled';
        } else if (status === 'paid' || status === 'earned') {
          policyStatus = 'active';
        } else if (status === 'pending') {
          policyStatus = 'pending';
        }

        const { data: policyData, error: policyError } = await supabase
          .from('policies')
          .update({
            status: policyStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', policyId)
          .select()
          .single();

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
