// /home/nneessen/projects/commissionTracker/src/features/recruiting/components/DeleteRecruitDialog.optimized.tsx
// Optimized version using single aggregated query and proper soft delete

import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2, Trash2, RefreshCw, UserX, Users } from 'lucide-react';
import { enhancedRecruitingService, type DeleteDependencies } from '@/services/recruiting/recruitingService.enhanced';
import { supabase } from '@/services/base/supabase';
import type { UserProfile } from '@/types/hierarchy.types';
import { showToast } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface DeleteRecruitDialogProps {
  recruit: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: 'soft' | 'hard'; // Default to soft delete
}

export function DeleteRecruitDialogOptimized({
  recruit,
  open,
  onOpenChange,
  onSuccess,
  mode = 'soft'
}: DeleteRecruitDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [reassignUplineId, setReassignUplineId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const queryClient = useQueryClient();

  // Get current user for audit trail
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Check for self-deletion (but don't return null, just show warning)
  const isSelfDelete = currentUser && recruit && currentUser.id === recruit.id;

  // Fetch delete dependencies using single optimized query
  const {
    data: dependencies,
    isLoading: checkingDependencies,
    error: dependencyError,
    refetch: refetchDependencies
  } = useQuery<DeleteDependencies | null>({
    queryKey: ['deleteDependencies', recruit?.id],
    queryFn: async () => {
      if (!recruit) return null;
      return enhancedRecruitingService.getDeleteDependencies(recruit.id);
    },
    enabled: open && !!recruit,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0 // Don't cache (was cacheTime in v4)
  });

  // Fetch potential uplines for reassignment
  const { data: potentialUplines } = useQuery({
    queryKey: ['potentialUplines', recruit?.id, dependencies?.downline_count],
    queryFn: async () => {
      if (!recruit) return [];

      // First, get all downlines of the recruit to exclude them (prevent circular references)
      const { data: downlines } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('upline_id', recruit.id);

      const downlineIds = downlines?.map(d => d.id) || [];

      // Get active users who could be uplines
      // Exclude: current recruit, their downlines, and deleted users
      let query = supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, agent_status')
        .neq('id', recruit.id)
        .or('agent_status.eq.licensed,is_admin.eq.true')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('first_name');

      // Exclude downlines to prevent circular references
      if (downlineIds.length > 0) {
        query = query.not('id', 'in', `(${downlineIds.join(',')})`);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: open && !!recruit && dependencies?.downline_count! > 0
  });

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      setConfirmText('');
      setReassignUplineId(null);
    }
  }, [open]);

  const handleReassignAndDelete = useCallback(async () => {
    if (!recruit || !currentUser || !reassignUplineId) return;

    setDeleting(true);
    try {
      // First reassign downlines
      const reassignResult = await enhancedRecruitingService.reassignDownlines(
        recruit.id,
        reassignUplineId
      );

      if (!reassignResult.success) {
        throw new Error(reassignResult.error || 'Failed to reassign downlines');
      }

      showToast.success(`Reassigned ${reassignResult.count} downline(s)`);

      // Now proceed with deletion
      await handleDelete();
    } catch (error: any) {
      console.error('Failed to reassign and delete:', error);
      showToast.error(error.message || 'Failed to reassign downlines');
      setDeleting(false);
    }
  }, [recruit, currentUser, reassignUplineId]);

  const handleDelete = useCallback(async () => {
    if (!recruit || !currentUser) return;

    const recruitName = `${recruit.first_name} ${recruit.last_name}`.trim() || recruit.email;

    setDeleting(true);
    try {
      let result;

      if (mode === 'hard') {
        // Hard delete requires confirmation text
        if (confirmText !== 'PERMANENTLY DELETE USER') {
          showToast.error('Please type the confirmation text exactly');
          setDeleting(false);
          return;
        }

        result = await enhancedRecruitingService.hardDeleteRecruit(
          recruit.id,
          currentUser.id,
          confirmText
        );
      } else {
        // Soft delete (default)
        result = await enhancedRecruitingService.softDeleteRecruit(
          recruit.id,
          currentUser.id,
          'Manual deletion via UI'
        );
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete recruit');
      }

      showToast.success(
        mode === 'hard'
          ? `Permanently deleted ${recruitName}`
          : `Archived ${recruitName}. They can be restored from the archive.`
      );

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ['recruits'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profiles'] });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to delete recruit:', error);
      showToast.error(
        error.message || `Failed to delete ${recruitName}. Please try again.`
      );
    } finally {
      setDeleting(false);
    }
  }, [recruit, currentUser, mode, confirmText, onOpenChange, onSuccess, queryClient]);

  if (!recruit) return null;

  const hasDownlines = dependencies?.downline_count! > 0;
  const canDelete = dependencies?.can_delete ?? false;
  const hasRelatedData = dependencies && (
    dependencies.email_count > 0 ||
    dependencies.document_count > 0 ||
    dependencies.activity_count > 0 ||
    dependencies.checklist_count > 0 ||
    dependencies.policy_count > 0 ||
    dependencies.commission_count > 0
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-1 text-sm">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            {mode === 'hard' ? 'Delete' : 'Archive'} Recruit
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1">
              <p className="text-xs">
                {mode === 'hard' ? 'Delete' : 'Archive'}{' '}
                <span className="font-medium">
                  {recruit.first_name} {recruit.last_name}
                </span>
                ?
              </p>

            {/* Loading state */}
            {checkingDependencies && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Checking dependencies...
              </div>
            )}

            {/* Error state */}
            {dependencyError && (
              <Alert className="py-1 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                <AlertDescription className="flex items-center justify-between text-[11px]">
                  <span>Failed to check dependencies</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => refetchDependencies()}
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Dependencies loaded */}
            {dependencies && !checkingDependencies && (
              <>
                {/* Downlines warning and reassignment */}
                {hasDownlines && (
                  <Alert className="py-1 px-1.5 border-orange-500/50 bg-orange-500/10">
                    <Users className="h-2.5 w-2.5" />
                    <AlertDescription className="text-[11px]">
                      <p className="font-medium mb-0.5">
                        Has {dependencies.downline_count} downline{dependencies.downline_count > 1 ? 's' : ''}
                      </p>
                      {potentialUplines && potentialUplines.length > 0 ? (
                        <div className="space-y-0.5">
                          <p className="text-[10px]">Reassign to:</p>
                          <Select
                            value={reassignUplineId || ''}
                            onValueChange={setReassignUplineId}
                          >
                            <SelectTrigger className="h-6 text-[11px]">
                              <SelectValue placeholder="Select new upline" />
                            </SelectTrigger>
                            <SelectContent>
                              {potentialUplines.map((upline) => (
                                <SelectItem key={upline.id} value={upline.id} className="text-[11px]">
                                  {upline.first_name} {upline.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className="text-[10px]">
                          No eligible uplines. Handle downlines first.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Related data summary */}
                {hasRelatedData && (
                  <Alert className="py-1 px-1.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <AlertDescription className="text-[11px]">
                      <div>
                        <p className="font-medium mb-0.5">
                          {mode === 'hard'
                            ? 'Will delete:'
                            : 'Will archive:'}
                        </p>
                        <ul className="text-[10px] space-y-0 ml-2">
                        {dependencies.email_count > 0 && (
                          <li>• {dependencies.email_count} email{dependencies.email_count > 1 ? 's' : ''}</li>
                        )}
                        {dependencies.document_count > 0 && (
                          <li>• {dependencies.document_count} document{dependencies.document_count > 1 ? 's' : ''}</li>
                        )}
                        {dependencies.activity_count > 0 && (
                          <li>• {dependencies.activity_count} activity{dependencies.activity_count > 1 ? ' logs' : ' log'}</li>
                        )}
                        {dependencies.checklist_count > 0 && (
                          <li>• {dependencies.checklist_count} checklist{dependencies.checklist_count > 1 ? 's' : ''}</li>
                        )}
                        {dependencies.policy_count > 0 && (
                          <li className="text-orange-600">
                            • {dependencies.policy_count} polic{dependencies.policy_count > 1 ? 'ies' : 'y'}
                          </li>
                        )}
                        {dependencies.commission_count > 0 && (
                          <li className="text-orange-600">
                            • {dependencies.commission_count} commission{dependencies.commission_count > 1 ? 's' : ''}
                          </li>
                        )}
                      </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Additional warnings for policies and commissions */}
                {dependencies.policy_count > 0 && (
                  <Alert className="py-1 px-1.5 border-orange-500/50 bg-orange-500/10">
                    <AlertTriangle className="h-2.5 w-2.5 text-orange-600" />
                    <AlertDescription className="text-[10px]">
                      <strong>Warning:</strong> Has {dependencies.policy_count} polic{dependencies.policy_count === 1 ? 'y' : 'ies'}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Deletion warning if applicable */}
                {dependencies.deletion_warning && !reassignUplineId && (
                  <Alert className="py-1 px-1.5 border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <AlertDescription className="text-[10px]">{dependencies.deletion_warning}</AlertDescription>
                  </Alert>
                )}

                {/* Hard delete confirmation */}
                {mode === 'hard' && (
                  <div className="space-y-1">
                    <Alert className="py-1 px-1.5 border-destructive bg-destructive/10">
                      <UserX className="h-2.5 w-2.5" />
                      <AlertDescription className="text-[10px]">
                        <p className="font-medium text-destructive">
                          This action cannot be undone!
                        </p>
                        <p className="mt-0.5">
                          Type <span className="font-medium">PERMANENTLY DELETE USER</span> to confirm:
                        </p>
                      </AlertDescription>
                    </Alert>
                    <input
                      type="text"
                      className="w-full px-2 py-1 border rounded text-xs"
                      placeholder="Type confirmation text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                    />
                  </div>
                )}

                {/* Soft delete info */}
                {mode === 'soft' && (
                  <p className="text-[11px] text-muted-foreground">
                    Will be archived and can be restored later.
                  </p>
                )}
              </>
            )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-1">
          <AlertDialogCancel disabled={deleting} className="h-7 text-xs">Cancel</AlertDialogCancel>
          {hasDownlines && reassignUplineId ? (
            <AlertDialogAction
              onClick={handleReassignAndDelete}
              disabled={deleting || checkingDependencies}
              className="bg-orange-600 hover:bg-orange-700 h-7 text-xs"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Reassigning...
                </>
              ) : (
                <>
                  <Users className="mr-1 h-3 w-3" />
                  Reassign & Delete
                </>
              )}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                deleting ||
                checkingDependencies ||
                (hasDownlines && !reassignUplineId) ||
                (mode === 'hard' && confirmText !== 'PERMANENTLY DELETE USER')
              }
              className="bg-destructive hover:bg-destructive/90 h-7 text-xs"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {mode === 'hard' ? 'Deleting...' : 'Archiving...'}
                </>
              ) : (
                <>
                  <Trash2 className="mr-1 h-3 w-3" />
                  {hasDownlines && !reassignUplineId
                    ? 'Select Upline'
                    : mode === 'hard'
                    ? 'Delete'
                    : 'Archive'}
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}