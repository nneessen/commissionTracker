// src/features/admin/components/GraduateToAgentDialog.tsx

import {useState} from 'react';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {GraduationCap, AlertCircle} from 'lucide-react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/services/base/supabase';
import {VALID_CONTRACT_LEVELS, type UserProfile} from '@/services/admin/userApprovalService';
import {format} from 'date-fns';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {useAuth} from '@/contexts/AuthContext';
import type {RoleName} from '@/types/permissions.types';

interface GraduateToAgentDialogProps {
  recruit: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraduateToAgentDialog({ recruit, open, onOpenChange }: GraduateToAgentDialogProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [contractLevel, setContractLevel] = useState<string>('80');
  const [notes, setNotes] = useState('');

  const graduateMutation = useMutation({
    mutationFn: async () => {
      // Update the user to agent role and mark as completed
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          roles: ['agent'],
          onboarding_status: 'completed',
          current_onboarding_phase: 'completed',
          approval_status: 'approved',
          contract_level: parseInt(contractLevel),
          graduated_at: new Date().toISOString(),
          graduation_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recruit.id);

      if (updateError) throw updateError;

      // Log the graduation in activity log
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: recruit.id,
          action: 'graduated_to_agent',
          description: `Graduated to agent with ${contractLevel}% contract level`,
          metadata: {
            previous_role: 'recruit',
            new_role: 'agent',
            contract_level: contractLevel,
            notes: notes,
            graduated_by: currentUser?.id
          }
        });

      // Send notification to upline if exists
      if (recruit.upline_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: recruit.upline_id,
            type: 'recruit_graduated',
            title: `${recruit.first_name} ${recruit.last_name} Graduated!`,
            message: `Your recruit ${recruit.first_name} ${recruit.last_name} has successfully completed onboarding and is now an active agent with ${contractLevel}% contract level.`,
            metadata: {
              recruit_id: recruit.id,
              recruit_name: `${recruit.first_name} ${recruit.last_name}`,
              contract_level: contractLevel,
              graduated_at: new Date().toISOString()
            }
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      onOpenChange(false);
      setNotes('');
      setContractLevel('80');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <DialogTitle>Graduate to Agent</DialogTitle>
          </div>
          <DialogDescription>
            Promote {recruit.first_name} {recruit.last_name} from recruit to licensed agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Change role from Recruit to Agent</li>
                <li>Grant access to full agent dashboard</li>
                <li>Mark onboarding as completed</li>
                <li>Set their initial contract level</li>
                <li>Enable commission tracking</li>
                <li>Notify their upline manager</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="contract-level">Initial Contract Level</Label>
            <Select value={contractLevel} onValueChange={setContractLevel}>
              <SelectTrigger id="contract-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_CONTRACT_LEVELS.map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    {level}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This determines their commission percentage on new business
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Graduation Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about their graduation, achievements, or special considerations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium mb-1">Recruit Information:</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>Started: {format(new Date(recruit.created_at || new Date()), 'MMM d, yyyy')}</p>
              <p>Current Phase: {recruit.current_onboarding_phase?.replace('_', ' ')}</p>
              <p>Email: {recruit.email}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => graduateMutation.mutate()}
            disabled={graduateMutation.isPending}
          >
            {graduateMutation.isPending ? 'Graduating...' : 'Graduate to Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
