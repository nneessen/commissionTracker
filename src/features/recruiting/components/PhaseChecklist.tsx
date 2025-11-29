// src/features/recruiting/components/PhaseChecklist.tsx

import React from 'react';
import {
  RecruitChecklistProgress,
  PhaseChecklistItem,
  CHECKLIST_STATUS_COLORS,
} from '@/types/recruiting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, Upload, CheckCircle2, XCircle, FileText, Lock, AlertCircle } from 'lucide-react';
import { useUpdateChecklistItemStatus } from '../hooks/useRecruitProgress';
import { showToast } from '@/utils/toast';

interface PhaseChecklistProps {
  userId: string;
  checklistItems: PhaseChecklistItem[];
  checklistProgress: RecruitChecklistProgress[];
  isUpline?: boolean;
  currentUserId?: string;
  currentPhaseId?: string; // The phase the recruit is currently in
  viewedPhaseId?: string;  // The phase being viewed (might be different from current)
  isAdmin?: boolean;       // Whether current user is admin/trainer/etc
  onPhaseComplete?: () => void; // Callback when all items in phase are completed
}

export function PhaseChecklist({
  userId,
  checklistItems,
  checklistProgress,
  isUpline = false,
  currentUserId,
  currentPhaseId,
  viewedPhaseId,
  isAdmin = false,
  onPhaseComplete,
}: PhaseChecklistProps) {
  const updateItemStatus = useUpdateChecklistItemStatus();

  // Create a map of itemId -> progress
  const progressMap = new Map(checklistProgress.map((p) => [p.checklist_item_id, p]));

  // Sort items by item_order
  const sortedItems = [...checklistItems].sort((a, b) => a.item_order - b.item_order);

  // Determine the checkbox state for an item based on sequential order and permissions
  const getCheckboxState = (
    item: PhaseChecklistItem,
    itemStatus: string,
    allItems: PhaseChecklistItem[]
  ): { isEnabled: boolean; disabledReason?: string } => {
    // Check if user is logged in
    if (!currentUserId) {
      return { isEnabled: false, disabledReason: 'Not logged in' };
    }

    // Document uploads use action buttons, not checkboxes
    if (item.item_type === 'document_upload') {
      return { isEnabled: false, disabledReason: 'Use upload button' };
    }

    // Check if viewing a future phase (not the current phase)
    const isViewingFuturePhase = currentPhaseId && viewedPhaseId &&
                                  currentPhaseId !== viewedPhaseId;

    if (isViewingFuturePhase) {
      // TODO: This needs proper phase order comparison
      // For now, if viewing different phase than current, assume it's future
      return { isEnabled: false, disabledReason: 'Complete current phase first' };
    }

    // NEW PERMISSION LOGIC: Be permissive by default
    // Only block if item is specifically marked as system-only
    const isSystemOnlyItem = item.can_be_completed_by === 'system';

    if (isSystemOnlyItem && !isAdmin) {
      return { isEnabled: false, disabledReason: 'Admin approval required' };
    }

    // Allow re-attempting rejected items regardless of order
    if (itemStatus === 'rejected' || itemStatus === 'needs_resubmission') {
      return { isEnabled: true };
    }

    // If already completed/approved, allow unchecking (toggle off)
    if (itemStatus === 'completed' || itemStatus === 'approved') {
      return { isEnabled: true };
    }

    // Sequential order enforcement within current phase
    // Find the minimum order of incomplete required items
    const incompleteRequiredOrders = allItems
      .filter(i => {
        if (!i.is_required) return false;
        const progress = progressMap.get(i.id);
        const status = progress?.status || 'not_started';
        return status !== 'completed' && status !== 'approved';
      })
      .map(i => i.item_order);

    // If no incomplete required items, check non-required items
    const firstIncompleteOrder = incompleteRequiredOrders.length > 0
      ? Math.min(...incompleteRequiredOrders)
      : Math.min(...allItems
          .filter(i => {
            const progress = progressMap.get(i.id);
            const status = progress?.status || 'not_started';
            return status !== 'completed' && status !== 'approved';
          })
          .map(i => i.item_order)
          .concat([Infinity])); // Add Infinity as fallback

    // Enable if this item is at the first incomplete order level (allows parallel completion)
    if (item.item_order === firstIncompleteOrder) {
      return { isEnabled: true };
    }

    // Otherwise, item is locked until previous items complete
    if (item.item_order > firstIncompleteOrder) {
      return { isEnabled: false, disabledReason: 'Complete previous items first' };
    }

    // Item is before the current level (should already be complete, but allow fixing)
    return { isEnabled: true };
  };

  const handleToggleComplete = async (itemId: string, currentStatus: string) => {
    if (!currentUserId) return;

    // Toggle between completed and not_started
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';

    try {
      await updateItemStatus.mutateAsync({
        userId,
        itemId,
        statusData: {
          status: newStatus as any,
          completed_by: newStatus === 'completed' ? currentUserId : undefined,
        },
      });
      showToast.success(newStatus === 'completed' ? 'Task marked as complete' : 'Task unmarked');

      // Check if this completes all required items in the current phase
      if (newStatus === 'completed' && onPhaseComplete && currentPhaseId === viewedPhaseId) {
        // Update progress map with the new status
        const updatedProgressMap = new Map(progressMap);
        const existingProgress = updatedProgressMap.get(itemId);
        if (existingProgress) {
          updatedProgressMap.set(itemId, { ...existingProgress, status: 'completed' });
        } else {
          updatedProgressMap.set(itemId, {
            id: '',
            user_id: userId,
            checklist_item_id: itemId,
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as RecruitChecklistProgress);
        }

        // Check if all required items are now completed
        const allRequiredCompleted = checklistItems.every((item) => {
          if (!item.is_required) return true; // Optional items don't block phase completion
          const progress = updatedProgressMap.get(item.id);
          return progress && (progress.status === 'completed' || progress.status === 'approved');
        });

        if (allRequiredCompleted) {
          // Small delay to allow the UI to update before switching tabs
          setTimeout(() => {
            onPhaseComplete();
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Failed to update checklist item:', error);
      showToast.error(error?.message || 'Failed to update task. Please try again.');
    }
  };

  const handleApprove = async (itemId: string) => {
    if (!currentUserId || !isUpline) return;

    try {
      await updateItemStatus.mutateAsync({
        userId,
        itemId,
        statusData: {
          status: 'approved',
          verified_by: currentUserId,
        },
      });
      showToast.success('Item approved successfully');

      // Check if this completes all required items in the current phase
      if (onPhaseComplete && currentPhaseId === viewedPhaseId) {
        // Update progress map with the new status
        const updatedProgressMap = new Map(progressMap);
        const existingProgress = updatedProgressMap.get(itemId);
        if (existingProgress) {
          updatedProgressMap.set(itemId, { ...existingProgress, status: 'approved' });
        }

        // Check if all required items are now completed/approved
        const allRequiredCompleted = checklistItems.every((item) => {
          if (!item.is_required) return true;
          const progress = updatedProgressMap.get(item.id);
          return progress && (progress.status === 'completed' || progress.status === 'approved');
        });

        if (allRequiredCompleted) {
          setTimeout(() => {
            onPhaseComplete();
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Failed to approve item:', error);
      showToast.error(error?.message || 'Failed to approve item. Please try again.');
    }
  };

  const handleReject = async (itemId: string, reason: string) => {
    if (!currentUserId || !isUpline) return;

    try {
      await updateItemStatus.mutateAsync({
        userId,
        itemId,
        statusData: {
          status: 'rejected',
          verified_by: currentUserId,
          rejection_reason: reason,
        },
      });
      showToast.success('Item rejected');
    } catch (error: any) {
      console.error('Failed to reject item:', error);
      showToast.error(error?.message || 'Failed to reject item. Please try again.');
    }
  };

  const getActionButton = (item: PhaseChecklistItem, progress: RecruitChecklistProgress | undefined) => {
    const status = progress?.status || 'not_started';

    // Document upload type
    if (item.item_type === 'document_upload') {
      if (isUpline) {
        // Upline can approve/reject uploaded documents
        if (status === 'completed' || status === 'in_progress') {
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleApprove(item.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const reason = prompt('Reason for rejection:');
                  if (reason) handleReject(item.id, reason);
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          );
        }
        if (status === 'approved') {
          return (
            <Badge variant="outline" className="text-green-600 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approved
            </Badge>
          );
        }
      } else {
        // Recruit can upload document
        if (status === 'not_started' || status === 'needs_resubmission') {
          return (
            <Button size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
          );
        }
        if (status === 'completed' || status === 'in_progress') {
          return (
            <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
              Pending Approval
            </Badge>
          );
        }
      }
    }

    // Manual approval type
    if (item.item_type === 'manual_approval') {
      if (isUpline && status === 'not_started') {
        return (
          <Button size="sm" variant="outline" onClick={() => handleApprove(item.id)}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
        );
      }
    }

    // Training module type
    if (item.item_type === 'training_module') {
      if (item.external_link && status !== 'completed' && status !== 'approved') {
        return (
          <Button size="sm" variant="outline" asChild>
            <a href={item.external_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              View Training
            </a>
          </Button>
        );
      }
    }

    return null;
  };

  if (sortedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No checklist items for this phase
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedItems.map((item) => {
        const progress = progressMap.get(item.id);
        const status = progress?.status || 'not_started';
        const isCompleted = status === 'completed' || status === 'approved';
        const isRejected = status === 'rejected';

        // Get checkbox state using the new comprehensive logic
        const checkboxState = getCheckboxState(item, status, sortedItems);

        return (
          <div
            key={item.id}
            className={`p-3 rounded-lg border transition-all hover:border-muted-foreground/30 ${
              isCompleted ? 'bg-green-50/30 dark:bg-green-950/20' :
              isRejected ? 'bg-red-50/30 dark:bg-red-950/20' :
              checkboxState.isEnabled ? 'bg-muted/20' :
              'bg-muted/10 opacity-75'
            }`}
          >
            {/* Row 1: Checkbox + Item name + Status badge + Action button */}
            <div className="flex items-start gap-3 mb-2">
              <div className="relative">
                <Checkbox
                  checked={isCompleted}
                  disabled={!checkboxState.isEnabled}
                  onCheckedChange={() => {
                    if (checkboxState.isEnabled) {
                      handleToggleComplete(item.id, status);
                    }
                  }}
                  className="mt-0.5"
                />
                {!checkboxState.isEnabled && checkboxState.disabledReason !== 'Use upload button' && (
                  <div className="absolute -top-1 -right-1">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {item.item_name}
                    </h4>
                    {item.is_required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${CHECKLIST_STATUS_COLORS[status]}`}
                    >
                      {status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {getActionButton(item, progress)}
                  </div>
                </div>

                {/* Row 2: Description + Metadata */}
                {item.item_description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.item_description}</p>
                )}

                {/* Show disabled reason if checkbox is locked and it's not a document upload */}
                {!checkboxState.isEnabled && checkboxState.disabledReason && checkboxState.disabledReason !== 'Use upload button' && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    <span>{checkboxState.disabledReason}</span>
                  </div>
                )}

                {progress?.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-950/50 rounded-sm text-sm">
                    <span className="font-medium text-red-900 dark:text-red-100">Rejected: </span>
                    <span className="text-red-800 dark:text-red-200">{progress.rejection_reason}</span>
                  </div>
                )}

                {progress?.notes && !progress.rejection_reason && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{progress.notes}</p>
                )}

                {progress?.document_id && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Document uploaded</span>
                  </div>
                )}

                {progress?.completed_at && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Completed {new Date(progress.completed_at).toLocaleDateString()}
                    {progress.completed_by && ` by ${progress.completed_by}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
