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
import { ExternalLink, Upload, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useUpdateChecklistItemStatus } from '../hooks/useRecruitProgress';

interface PhaseChecklistProps {
  userId: string;
  checklistItems: PhaseChecklistItem[];
  checklistProgress: RecruitChecklistProgress[];
  isUpline?: boolean;
  currentUserId?: string;
}

export function PhaseChecklist({
  userId,
  checklistItems,
  checklistProgress,
  isUpline = false,
  currentUserId,
}: PhaseChecklistProps) {
  const updateItemStatus = useUpdateChecklistItemStatus();

  // Create a map of itemId -> progress
  const progressMap = new Map(checklistProgress.map((p) => [p.checklist_item_id, p]));

  // Sort items by item_order
  const sortedItems = [...checklistItems].sort((a, b) => a.item_order - b.item_order);

  const handleToggleComplete = async (itemId: string, currentStatus: string) => {
    if (!currentUserId) return;

    // Toggle between completed and not_started
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';

    await updateItemStatus.mutateAsync({
      userId,
      itemId,
      statusData: {
        status: newStatus as any,
        completed_by: newStatus === 'completed' ? currentUserId : undefined,
      },
    });
  };

  const handleApprove = async (itemId: string) => {
    if (!currentUserId || !isUpline) return;

    await updateItemStatus.mutateAsync({
      userId,
      itemId,
      statusData: {
        status: 'approved',
        verified_by: currentUserId,
      },
    });
  };

  const handleReject = async (itemId: string, reason: string) => {
    if (!currentUserId || !isUpline) return;

    await updateItemStatus.mutateAsync({
      userId,
      itemId,
      statusData: {
        status: 'rejected',
        verified_by: currentUserId,
        rejection_reason: reason,
      },
    });
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

        // Determine if user can interact with checkbox
        let canToggleCheckbox = false;

        if (item.item_type === 'task_completion') {
          // Task completion: check who can complete it
          // If can_be_completed_by is 'system', then neither can toggle it (system-only tasks)
          if (item.can_be_completed_by === 'recruit') {
            canToggleCheckbox = !isUpline;
          } else if (item.can_be_completed_by === 'upline') {
            canToggleCheckbox = isUpline;
          } else if (item.can_be_completed_by === 'system') {
            canToggleCheckbox = false; // System-only tasks cannot be manually toggled
          }
        } else if (item.item_type === 'training_module') {
          // Training modules: recruit can toggle after viewing
          canToggleCheckbox = !isUpline;
        } else if (item.item_type === 'document_upload') {
          // Document uploads: handled by action buttons, not checkbox
          canToggleCheckbox = false;
        } else if (item.item_type === 'manual_approval') {
          // Manual approvals: upline can check the box to approve
          canToggleCheckbox = isUpline && status === 'not_started';
        }

        return (
          <div 
            key={item.id} 
            className={`p-3 rounded-lg border transition-all hover:border-muted-foreground/30 ${
              isCompleted ? 'bg-green-50/30 dark:bg-green-950/20' : 
              isRejected ? 'bg-red-50/30 dark:bg-red-950/20' : 
              'bg-muted/20'
            }`}
          >
            {/* Row 1: Checkbox + Item name + Status badge + Action button */}
            <div className="flex items-start gap-3 mb-2">
              <Checkbox
                checked={isCompleted}
                disabled={!canToggleCheckbox}
                onCheckedChange={() => {
                  if (canToggleCheckbox) {
                    handleToggleComplete(item.id, status);
                  }
                }}
                className="mt-0.5"
              />
              
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
