// src/features/recruiting/components/interactive/FileDownloadItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import type {
  FileDownloadMetadata,
  FileDownloadResponse,
} from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface FileDownloadItemProps {
  progressId: string;
  metadata: FileDownloadMetadata;
  existingResponse?: FileDownloadResponse | null;
  onComplete?: () => void;
}

export function FileDownloadItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: FileDownloadItemProps) {
  const [hasDownloaded, setHasDownloaded] = useState(
    existingResponse?.downloaded ?? false,
  );
  const [acknowledged, setAcknowledged] = useState(
    existingResponse?.acknowledged ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDownload = useCallback(async () => {
    // Open the file URL
    window.open(metadata.file_url, "_blank");

    // Record the download
    if (!hasDownloaded) {
      try {
        await checklistResponseService.recordFileDownload(progressId);
        setHasDownloaded(true);
        toast.success("Download started!");
      } catch (error) {
        console.error("Failed to record download:", error);
      }
    }
  }, [progressId, metadata.file_url, hasDownloaded]);

  const handleAcknowledge = useCallback(async () => {
    if (!hasDownloaded) {
      toast.error("Please download the file first");
      return;
    }

    if (!acknowledged) {
      toast.error("Please confirm you have reviewed the file");
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        await checklistResponseService.acknowledgeFileDownload(progressId);

      if (!result.success) {
        toast.error(result.error || "Failed to complete");
        return;
      }

      toast.success("Completed!");
      onComplete?.();
    } catch (error) {
      console.error("Failed to acknowledge file download:", error);
      toast.error("Failed to complete");
    } finally {
      setIsSubmitting(false);
    }
  }, [progressId, hasDownloaded, acknowledged, onComplete]);

  // If already completed
  if (existingResponse?.acknowledged) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Downloaded and reviewed</span>
        </div>
      </div>
    );
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* File info */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded">
          <FileText className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {metadata.file_name}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {metadata.file_type && (
              <span>{metadata.file_type.toUpperCase()}</span>
            )}
            {metadata.file_size_bytes && (
              <>
                <span>•</span>
                <span>{formatFileSize(metadata.file_size_bytes)}</span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-1" />
          {hasDownloaded ? "Download Again" : "Download"}
        </Button>
      </div>

      {/* Download status */}
      {hasDownloaded && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>File downloaded</span>
        </div>
      )}

      {/* Acknowledgment checkbox */}
      {metadata.acknowledgment_text && (
        <div className="flex items-start gap-3">
          <Checkbox
            id={`file-ack-${progressId}`}
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            disabled={isSubmitting || !hasDownloaded}
          />
          <label
            htmlFor={`file-ack-${progressId}`}
            className={`text-sm cursor-pointer leading-tight ${
              hasDownloaded
                ? "text-zinc-700 dark:text-zinc-300"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {metadata.acknowledgment_text ||
              "I have downloaded and reviewed this file"}
          </label>
        </div>
      )}

      {/* Complete Button */}
      {metadata.acknowledgment_text ? (
        <Button
          onClick={handleAcknowledge}
          disabled={isSubmitting || !hasDownloaded || !acknowledged}
          className="w-full"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Mark as Complete
        </Button>
      ) : (
        hasDownloaded && (
          <Button
            onClick={handleAcknowledge}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mark as Complete
          </Button>
        )
      )}
    </div>
  );
}
