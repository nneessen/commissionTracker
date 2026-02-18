// src/features/training-modules/components/presentations/PresentationDetailPage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePresentationSubmission, useDeletePresentation } from "../../hooks/usePresentationSubmissions";
import { useCanManageTraining } from "../../hooks/useCanManageTraining";
import { PresentationVideoPlayer } from "./PresentationVideoPlayer";
import { PresentationStatusBadge } from "./PresentationStatusBadge";
import { PresentationReviewPanel } from "./PresentationReviewPanel";
import { toast } from "sonner";

export default function PresentationDetailPage() {
  const { submissionId } = useParams({ strict: false }) as { submissionId: string };
  const navigate = useNavigate();
  const { data: submission, isLoading } = usePresentationSubmission(submissionId);
  const canManage = useCanManageTraining();
  const deleteMutation = useDeletePresentation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-2">
        <p className="text-xs text-zinc-500">Submission not found</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => navigate({ to: "/my-training" })}
        >
          Back to My Training
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteMutation.mutate(submission.id, {
      onSuccess: () => {
        toast.success("Submission deleted");
        navigate({ to: "/my-training" });
      },
      onError: (err) => {
        toast.error(`Failed to delete: ${err.message}`);
      },
    });
  };

  const submitterName = submission.submitter
    ? `${submission.submitter.first_name} ${submission.submitter.last_name}`
    : "Unknown";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate({ to: "/my-training" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {submission.title}
            </h1>
            <p className="text-[10px] text-zinc-500">
              by {submitterName} &middot; Week of{" "}
              {new Date(submission.week_start + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PresentationStatusBadge status={submission.status} />
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-red-500"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Video Player */}
          <PresentationVideoPlayer storagePath={submission.storage_path} mimeType={submission.mime_type} />

          {/* Description */}
          {submission.description && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Description
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {submission.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-zinc-500">Type</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                  {submission.recording_type === "browser_recording" ? "Browser Recording" : "Upload"}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">File</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {submission.file_name}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Size</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  {(submission.file_size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              {submission.duration_seconds && (
                <div>
                  <span className="text-zinc-500">Duration</span>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {Math.floor(submission.duration_seconds / 60)}:{(submission.duration_seconds % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Review panel: managers can review pending, everyone sees review result */}
          {(canManage || submission.status !== "pending") && (
            <PresentationReviewPanel
              submission={submission}
              onReviewed={() => navigate({ to: "/my-training" })}
            />
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Presentation</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this presentation submission? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
