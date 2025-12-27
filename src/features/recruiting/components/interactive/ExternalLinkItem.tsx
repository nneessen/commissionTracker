// src/features/recruiting/components/interactive/ExternalLinkItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type {
  ExternalLinkMetadata,
  ExternalLinkResponse,
} from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface ExternalLinkItemProps {
  progressId: string;
  metadata: ExternalLinkMetadata;
  existingResponse?: ExternalLinkResponse | null;
  onComplete?: () => void;
}

export function ExternalLinkItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: ExternalLinkItemProps) {
  const [hasClicked, setHasClicked] = useState(
    existingResponse?.clicked ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenLink = useCallback(async () => {
    // Open the external link
    window.open(metadata.url, "_blank");

    // Record the click
    if (!hasClicked) {
      try {
        await checklistResponseService.recordExternalLinkClick(progressId);
        setHasClicked(true);
      } catch (error) {
        console.error("Failed to record link click:", error);
      }
    }

    // If auto-complete on return, complete it
    if (metadata.completion_method === "return_url") {
      try {
        const result =
          await checklistResponseService.completeExternalLink(progressId);
        if (result.success) {
          toast.success("Task completed!");
          onComplete?.();
        }
      } catch (error) {
        console.error("Failed to auto-complete:", error);
      }
    }
  }, [
    progressId,
    metadata.url,
    metadata.completion_method,
    hasClicked,
    onComplete,
  ]);

  const handleMarkComplete = useCallback(async () => {
    if (!hasClicked) {
      toast.error("Please visit the link first");
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        await checklistResponseService.completeExternalLink(progressId);

      if (!result.success) {
        toast.error(result.error || "Failed to complete");
        return;
      }

      toast.success("Completed!");
      onComplete?.();
    } catch (error) {
      console.error("Failed to complete external link:", error);
      toast.error("Failed to complete");
    } finally {
      setIsSubmitting(false);
    }
  }, [progressId, hasClicked, onComplete]);

  // If already completed
  if (existingResponse?.returned) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Completed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Description */}
      {metadata.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {metadata.description}
        </p>
      )}

      {/* Link button */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {metadata.link_text}
          </p>
          <p className="text-xs text-zinc-500 truncate">{metadata.url}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenLink}
          className="shrink-0"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          {hasClicked ? "Open Again" : "Open Link"}
        </Button>
      </div>

      {/* Click status */}
      {hasClicked && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Link visited</span>
        </div>
      )}

      {/* Instructions */}
      {metadata.verification_instructions && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {metadata.verification_instructions}
        </p>
      )}

      {/* Complete Button (if manual completion) */}
      {metadata.completion_method === "manual" && (
        <Button
          onClick={handleMarkComplete}
          disabled={isSubmitting || !hasClicked}
          className="w-full"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          I've Completed This Task
        </Button>
      )}
    </div>
  );
}
