// src/features/recruiting/components/PhaseChecklist.tsx
// Checklist component with modern zinc palette styling

import React, { useState } from "react";
import {
  RecruitChecklistProgress,
  PhaseChecklistItem,
  CHECKLIST_STATUS_COLORS,
} from "@/types/recruiting.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExternalLink,
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useUpdateChecklistItemStatus } from "../hooks/useRecruitProgress";
import { showToast } from "@/utils/toast";

interface PhaseChecklistProps {
  userId: string;
  checklistItems: PhaseChecklistItem[];
  checklistProgress: RecruitChecklistProgress[];
  isUpline?: boolean;
  currentUserId?: string;
  currentPhaseId?: string;
  viewedPhaseId?: string;
  isAdmin?: boolean;
  onPhaseComplete?: () => void;
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
  onPhaseComplete: _onPhaseComplete,
}: PhaseChecklistProps) {
  const updateItemStatus = useUpdateChecklistItemStatus();
  const [loadingItemIds, setLoadingItemIds] = useState<Set<string>>(new Set());

  const progressMap = new Map(
    checklistProgress.map((p) => [p.checklist_item_id, p]),
  );
  const sortedItems = [...checklistItems].sort(
    (a, b) => a.item_order - b.item_order,
  );

  const getCheckboxState = (
    item: PhaseChecklistItem,
    itemStatus: string,
    allItems: PhaseChecklistItem[],
  ): { isEnabled: boolean; disabledReason?: string } => {
    if (!currentUserId) {
      return { isEnabled: false, disabledReason: "Not logged in" };
    }

    if (item.item_type === "document_upload") {
      return { isEnabled: false, disabledReason: "Use upload button" };
    }

    const isViewingFuturePhase =
      currentPhaseId && viewedPhaseId && currentPhaseId !== viewedPhaseId;

    if (isViewingFuturePhase) {
      return {
        isEnabled: false,
        disabledReason: "Complete current phase first",
      };
    }

    const isSystemOnlyItem = item.can_be_completed_by === "system";

    if (isSystemOnlyItem && !isAdmin) {
      return { isEnabled: false, disabledReason: "Admin approval required" };
    }

    if (itemStatus === "rejected" || itemStatus === "needs_resubmission") {
      return { isEnabled: true };
    }

    if (itemStatus === "completed" || itemStatus === "approved") {
      return { isEnabled: true };
    }

    const incompleteRequiredOrders = allItems
      .filter((i) => {
        if (!i.is_required) return false;
        const progress = progressMap.get(i.id);
        const status = progress?.status || "not_started";
        return status !== "completed" && status !== "approved";
      })
      .map((i) => i.item_order);

    const firstIncompleteOrder =
      incompleteRequiredOrders.length > 0
        ? Math.min(...incompleteRequiredOrders)
        : Math.min(
            ...allItems
              .filter((i) => {
                const progress = progressMap.get(i.id);
                const status = progress?.status || "not_started";
                return status !== "completed" && status !== "approved";
              })
              .map((i) => i.item_order)
              .concat([Infinity]),
          );

    if (item.item_order === firstIncompleteOrder) {
      return { isEnabled: true };
    }

    if (item.item_order > firstIncompleteOrder) {
      return {
        isEnabled: false,
        disabledReason: "Complete previous items first",
      };
    }

    return { isEnabled: true };
  };

  const handleToggleComplete = async (
    itemId: string,
    currentStatus: string,
  ) => {
    if (!currentUserId) return;

    const newStatus =
      currentStatus === "completed" ? "not_started" : "completed";

    setLoadingItemIds((prev) => new Set(prev).add(itemId));

    try {
      await updateItemStatus.mutateAsync({
        userId,
        itemId,
        statusData: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- checklist status type
          status: newStatus as any,
          completed_by: newStatus === "completed" ? currentUserId : undefined,
        },
      });
      showToast.success(
        newStatus === "completed" ? "Task marked as complete" : "Task unmarked",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    } catch (error: any) {
      console.error("Failed to update checklist item:", error);
      showToast.error(
        error?.message || "Failed to update task. Please try again.",
      );
    } finally {
      setLoadingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleApprove = async (itemId: string) => {
    if (!currentUserId || !isUpline) return;

    try {
      await updateItemStatus.mutateAsync({
        userId,
        itemId,
        statusData: {
          status: "approved",
          verified_by: currentUserId,
        },
      });
      showToast.success("Item approved successfully");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    } catch (error: any) {
      console.error("Failed to approve item:", error);
      showToast.error(
        error?.message || "Failed to approve item. Please try again.",
      );
    }
  };

  const handleReject = async (itemId: string, reason: string) => {
    if (!currentUserId || !isUpline) return;

    try {
      await updateItemStatus.mutateAsync({
        userId,
        itemId,
        statusData: {
          status: "rejected",
          verified_by: currentUserId,
          rejection_reason: reason,
        },
      });
      showToast.success("Item rejected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    } catch (error: any) {
      console.error("Failed to reject item:", error);
      showToast.error(
        error?.message || "Failed to reject item. Please try again.",
      );
    }
  };

  const getActionButton = (
    item: PhaseChecklistItem,
    progress: RecruitChecklistProgress | undefined,
  ) => {
    const status = progress?.status || "not_started";

    if (item.item_type === "document_upload") {
      if (isUpline) {
        if (status === "completed" || status === "in_progress") {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove(item.id)}
                className="h-8"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const reason = prompt("Reason for rejection:");
                  if (reason) handleReject(item.id, reason);
                }}
                className="h-8"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            </div>
          );
        }
        if (status === "approved") {
          return (
            <Badge
              variant="outline"
              className="text-sm text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approved
            </Badge>
          );
        }
      } else {
        if (status === "not_started" || status === "needs_resubmission") {
          return (
            <Button size="sm" variant="outline" className="h-8">
              <Upload className="h-4 w-4 mr-1.5" />
              Upload
            </Button>
          );
        }
        if (status === "completed" || status === "in_progress") {
          return (
            <Badge
              variant="secondary"
              className="text-sm text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"
            >
              Pending Approval
            </Badge>
          );
        }
      }
    }

    if (item.item_type === "manual_approval") {
      if (isUpline && status === "not_started") {
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleApprove(item.id)}
            className="h-8"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve
          </Button>
        );
      }
    }

    if (item.item_type === "training_module") {
      if (
        item.external_link &&
        status !== "completed" &&
        status !== "approved"
      ) {
        return (
          <Button size="sm" variant="outline" asChild className="h-8">
            <a
              href={item.external_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
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
      <div className="py-8 text-center">
        <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No checklist items for this phase
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedItems.map((item) => {
        const progress = progressMap.get(item.id);
        const status = progress?.status || "not_started";
        const isCompleted = status === "completed" || status === "approved";
        const isRejected = status === "rejected";
        const checkboxState = getCheckboxState(item, status, sortedItems);

        return (
          <div
            key={item.id}
            className={`p-4 rounded-lg border transition-all ${
              isCompleted
                ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                : isRejected
                  ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  : checkboxState.isEnabled
                    ? "bg-white border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-600"
                    : "bg-zinc-50/50 border-zinc-200 opacity-75 dark:bg-zinc-900/50 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5">
                {loadingItemIds.has(item.id) ? (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                ) : (
                  <Checkbox
                    checked={isCompleted}
                    disabled={!checkboxState.isEnabled}
                    onCheckedChange={() => {
                      if (checkboxState.isEnabled) {
                        handleToggleComplete(item.id, status);
                      }
                    }}
                    className="h-5 w-5"
                  />
                )}
                {!checkboxState.isEnabled &&
                  !loadingItemIds.has(item.id) &&
                  checkboxState.disabledReason !== "Use upload button" && (
                    <div className="absolute -top-1 -right-1">
                      <Lock className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                    </div>
                  )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`text-sm font-medium ${isCompleted ? "line-through text-zinc-500 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
                    >
                      {item.item_name}
                    </h4>
                    {item.is_required && (
                      <Badge
                        variant="outline"
                        className="text-xs border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
                      >
                        Required
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-xs ${CHECKLIST_STATUS_COLORS[status]}`}
                    >
                      {status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="flex-shrink-0">
                    {getActionButton(item, progress)}
                  </div>
                </div>

                {item.item_description && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
                    {item.item_description}
                  </p>
                )}

                {!checkboxState.isEnabled &&
                  checkboxState.disabledReason &&
                  checkboxState.disabledReason !== "Use upload button" && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{checkboxState.disabledReason}</span>
                    </div>
                  )}

                {progress?.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">
                      Rejected:{" "}
                    </span>
                    <span className="text-sm text-red-700 dark:text-red-400">
                      {progress.rejection_reason}
                    </span>
                  </div>
                )}

                {progress?.notes && !progress.rejection_reason && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 italic">
                    {progress.notes}
                  </p>
                )}

                {progress?.document_id && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <FileText className="h-4 w-4" />
                    <span>Document uploaded</span>
                  </div>
                )}

                {progress?.completed_at && (
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Completed{" "}
                    {new Date(progress.completed_at).toLocaleDateString()}
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
