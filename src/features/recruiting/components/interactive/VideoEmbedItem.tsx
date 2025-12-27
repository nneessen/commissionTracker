// src/features/recruiting/components/interactive/VideoEmbedItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type {
  VideoEmbedMetadata,
  VideoEmbedResponse,
} from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface VideoEmbedItemProps {
  progressId: string;
  metadata: VideoEmbedMetadata;
  existingResponse?: VideoEmbedResponse | null;
  isDisabled?: boolean;
  onComplete?: () => void;
}

/**
 * Get the embed URL for a video based on platform
 */
function getEmbedUrl(platform: string, videoId: string): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/embed/${videoId}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${videoId}`;
    case "loom":
      return `https://www.loom.com/embed/${videoId}`;
    default:
      return "";
  }
}

/**
 * Get display name for video platform
 */
function getPlatformName(platform: string): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "loom":
      return "Loom";
    default:
      return "Video";
  }
}

export function VideoEmbedItem({
  progressId,
  metadata,
  existingResponse,
  isDisabled = false,
  onComplete,
}: VideoEmbedItemProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const embedUrl = getEmbedUrl(metadata.platform, metadata.video_id);
  const platformName = getPlatformName(metadata.platform);

  const handleMarkWatched = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await checklistResponseService.submitVideoWatchResponse(
        progressId,
        metadata,
      );

      if (!result.success) {
        toast.error(result.error || "Failed to mark video as watched");
        return;
      }

      toast.success("Video marked as watched!");
      onComplete?.();
    } catch (error) {
      console.error("Failed to mark video as watched:", error);
      toast.error("Failed to mark video as watched");
    } finally {
      setIsSubmitting(false);
    }
  }, [progressId, metadata, onComplete]);

  // If already watched
  if (existingResponse?.watched) {
    return (
      <div className="space-y-3">
        {/* Video embed - still show it so they can rewatch */}
        {embedUrl && (
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-900">
            <iframe
              src={embedUrl}
              title={metadata.title || `${platformName} Video`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {/* Completed state */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Video watched</span>
          </div>
          {existingResponse.watched_at && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/80">
              Completed on{" "}
              {new Date(existingResponse.watched_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Not yet watched
  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Video title */}
      {metadata.title && (
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {metadata.title}
        </p>
      )}

      {/* Video embed */}
      {embedUrl ? (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-900">
          <iframe
            src={embedUrl}
            title={metadata.title || `${platformName} Video`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aspect-video w-full rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
          <div className="text-center text-zinc-500 dark:text-zinc-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Video not available</p>
          </div>
        </div>
      )}

      {/* Requirement note */}
      {metadata.require_full_watch && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Please watch the entire video before marking as complete.
        </p>
      )}

      {/* Mark as Watched Button */}
      <Button
        onClick={handleMarkWatched}
        disabled={isSubmitting || isDisabled || !embedUrl}
        className="w-full"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        {isDisabled ? "Complete previous items first" : "Mark as Watched"}
      </Button>
    </div>
  );
}
