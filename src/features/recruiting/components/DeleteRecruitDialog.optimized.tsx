// DeleteRecruitDialog - HARD DELETE only (no soft delete/archive)

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
import { AlertTriangle, Loader2, Trash2, RefreshCw, Users } from 'lucide-react';
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
}

export function DeleteRecruitDialogOptimized({
  recruit,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRecruitDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [reassignUplineId, setReassignUplineId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current user for audit trail
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

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
    staleTime: 0,
    gcTime: 0
  });

  // Fetch potential uplines for reassignment
  const { data: potentialUplines } = useQuery({
    queryKey: ['potentialUplines', recruit?.id, dependencies?.downline_count],
    queryFn: async () => {
      if (!recruit) return [];

      const { data: downlines } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('upline_id', recruit.id);

      const downlineIds = downlines?.map(d => d.id) || [];

      let query = supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, agent_status')
        .neq('id', recruit.id)
        .or('agent_status.eq.licensed,is_admin.eq.true')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('first_name');

      if (downlineIds.length > 0) {
        query = query.not('id', 'in', `(${downlineIds.join(',')})`);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: open && !!recruit && dependencies?.downline_count! > 0
  });

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setReassignUplineId(null);
    }
  }, [open]);

  const handleReassignAndDelete = useCallback(async () => {
    if (!recruit || !currentUser || !reassignUplineId) return;

    setDeleting(true);
    try {
      const reassignResult = await enhancedRecruitingService.reassignDownlines(
        recruit.id,
        reassignUplineId
      );

      if (!reassignResult.success) {
        throw new Error(reassignResult.error || 'Failed to reassign downlines');
      }

      showToast.success(`Reassigned ${reassignResult.count} downline(s)`);
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
      // Use admin_delete_user RPC for hard delete
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: recruit.id
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && typeof data === 'object' && data.success === false) {
        throw new Error(data.error || 'Failed to delete recruit');
      }

      showToast.success(`Permanently deleted ${recruitName}`);

      await queryClient.invalidateQueries({ queryKey: ['recruits'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profiles'] });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to delete recruit:', error);
      showToast.error(error.message || `Failed to delete ${recruitName}. Please try again.`);
    } finally {
      setDeleting(false);
    }
  }, [recruit, currentUser, onOpenChange, onSuccess, queryClient]);

  if (!recruit) return null;

  const hasDownlines = dependencies?.downline_count! > 0;
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
            Delete Recruit
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1">
              <p className="text-xs">
                Permanently delete{' '}
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
                          <p className="font-medium mb-0.5">Will delete:</p>
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

                  {/* Policy warning */}
                  {dependencies.policy_count > 0 && (
                    <Alert className="py-1 px-1.5 border-orange-500/50 bg-orange-500/10">
                      <AlertTriangle className="h-2.5 w-2.5 text-orange-600" />
                      <AlertDescription className="text-[10px]">
                        <strong>Warning:</strong> Has {dependencies.policy_count} polic{dependencies.policy_count === 1 ? 'y' : 'ies'}.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Warning */}
                  <Alert className="py-1 px-1.5 border-destructive bg-destructive/10">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <AlertDescription className="text-[10px] text-destructive font-medium">
                      This action cannot be undone!
                    </AlertDescription>
                  </Alert>
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
              disabled={deleting || checkingDependencies || (hasDownlines && !reassignUplineId)}
              className="bg-destructive hover:bg-destructive/90 h-7 text-xs"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1 h-3 w-3" />
                  {hasDownlines && !reassignUplineId ? 'Select Upline' : 'Delete'}
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
