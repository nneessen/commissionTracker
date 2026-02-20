// src/features/contracting/components/ContractRequestDetailDialog.tsx
// Full detail modal for contract request with tabs for details, contract level, and documents

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ContractLevelDisplay } from './ContractLevelDisplay';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { carrierContractRequestService } from '@/services/recruiting/carrierContractRequestService';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ContractRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any; // Full request object
}

export function ContractRequestDetailDialog({
  open,
  onOpenChange,
  request,
}: ContractRequestDetailDialogProps) {
  const [formData, setFormData] = useState({
    status: request.status,
    writing_number: request.writing_number || '',
    notes: request.notes || '',
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () =>
      carrierContractRequestService.updateContractRequest(request.id, formData),
    onSuccess: () => {
      toast.success('Contract request updated');
      queryClient.invalidateQueries({ queryKey: ['contract-requests-filtered'] });
      queryClient.invalidateQueries({ queryKey: ['recruit-carrier-contracts'] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-sm font-semibold">
            Contract Request Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="px-6 border-b rounded-none justify-start">
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
            <TabsTrigger value="contract-level" className="text-xs">
              Contract Level
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-auto px-6 py-4 space-y-4">
            {/* Recruit Info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold">Recruit Information</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  {request.recruit?.first_name} {request.recruit?.last_name}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  {request.recruit?.email}
                </div>
              </div>
            </div>

            {/* Carrier Info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold">Carrier</h3>
              <div className="text-xs">{request.carrier?.name}</div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background"
                >
                  <option value="requested">Requested</option>
                  <option value="in_progress">In Progress</option>
                  <option value="writing_received">Writing Received</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Writing Number</Label>
                <Input
                  value={formData.writing_number}
                  onChange={(e) => setFormData({ ...formData, writing_number: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Enter writing number"
                />
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="text-xs"
                  rows={4}
                  placeholder="Add internal notes..."
                />
              </div>
            </div>

            {/* Dates (read-only) */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold">Dates</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Requested:</span>{' '}
                  {request.requested_date ? format(new Date(request.requested_date), 'MMM d, yyyy') : '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">In Progress:</span>{' '}
                  {request.in_progress_date ? format(new Date(request.in_progress_date), 'MMM d, yyyy') : '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Writing Received:</span>{' '}
                  {request.writing_received_date
                    ? format(new Date(request.writing_received_date), 'MMM d, yyyy')
                    : '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Completed:</span>{' '}
                  {request.completed_date ? format(new Date(request.completed_date), 'MMM d, yyyy') : '-'}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Contract Level Tab */}
          <TabsContent value="contract-level" className="flex-1 overflow-auto px-6 py-4">
            <ContractLevelDisplay recruitId={request.recruit_id} carrierId={request.carrier_id} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="flex-1 overflow-auto px-6 py-4">
            <div className="text-xs text-muted-foreground">
              Document management coming soon...
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
