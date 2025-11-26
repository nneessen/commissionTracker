// src/features/recruiting/components/PhaseChecklist.tsx

import React from 'react';
import {
  RecruitChecklistProgress,
  PhaseChecklistItem,
  CHECKLIST_STATUS_ICONS,
  CHECKLIST_STATUS_COLORS,
  CHECKLIST_ITEM_TYPE_DISPLAY_NAMES,
} from '@/types/recruiting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

  const handleMarkComplete = async (itemId: string) => {
    if (!currentUserId) return;

    await updateItemStatus.mutateAsync({
      userId,
      itemId,
      statusData: {
        status: 'completed',
        completed_by: currentUserId,
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
            <Button size="sm" variant="ghost" disabled>
              <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
              Approved
            </Button>
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

    // Task completion type
    if (item.item_type === 'task_completion') {
      if (item.can_be_completed_by === 'recruit' && !isUpline && status === 'not_started') {
        return (
          <Button size="sm" variant="outline" onClick={() => handleMarkComplete(item.id)}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Mark Complete
          </Button>
        );
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
      if (item.external_link && status === 'not_started') {
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={item.external_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Training
              </a>
            </Button>
            {!isUpline && (
              <Button size="sm" variant="outline" onClick={() => handleMarkComplete(item.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
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
    <div className="space-y-3">
      {sortedItems.map((item) => {
        const progress = progressMap.get(item.id);
        const status = progress?.status || 'not_started';

        return (
          <Card key={item.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1 text-2xl">{CHECKLIST_STATUS_ICONS[status]}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.item_name}</h4>
                      {item.is_required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{CHECKLIST_ITEM_TYPE_DISPLAY_NAMES[item.item_type]}</span>
                      <Badge variant="secondary" className={CHECKLIST_STATUS_COLORS[status]}>
                        {status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {item.item_description && (
                  <p className="text-sm text-muted-foreground mb-3">{item.item_description}</p>
                )}

                {progress?.rejection_reason && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded text-sm">
                    <span className="font-medium text-red-900 dark:text-red-100">Rejected: </span>
                    <span className="text-red-800 dark:text-red-200">{progress.rejection_reason}</span>
                  </div>
                )}

                {progress?.notes && (
                  <p className="text-sm text-muted-foreground mb-3 italic">{progress.notes}</p>
                )}

                {progress?.document_id && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Document uploaded</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {getActionButton(item, progress)}

                  {progress?.completed_at && (
                    <span className="text-xs text-muted-foreground">
                      Completed {new Date(progress.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
