// src/features/recruiting/components/VideoModal.tsx

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AlertCircle } from "lucide-react";
import type { VideoEmbedMetadata } from "@/types/recruiting.types";
import { VIDEO_PLATFORM_LABELS } from "@/types/recruiting.types";
import { YouTubeEmbed } from "./embeds/YouTubeEmbed";
import { VimeoEmbed } from "./embeds/VimeoEmbed";
import { LoomEmbed } from "./embeds/LoomEmbed";

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  metadata: VideoEmbedMetadata;
  onComplete?: () => void;
}

export function VideoModal({
  open,
  onClose,
  itemName,
  metadata,
  onComplete,
}: VideoModalProps) {
  const [hasCompleted, setHasCompleted] = useState(false);

  // Reset completion state when video changes
  useEffect(() => {
    setHasCompleted(false);
  }, [metadata.video_id, metadata.platform]);

  const handleComplete = () => {
    setHasCompleted(true);
    onComplete?.();
  };

  const handleClose = () => {
    setHasCompleted(false);
    onClose();
  };

  const renderEmbed = () => {
    const { platform, video_id, require_full_watch, auto_complete } = metadata;

    switch (platform) {
      case "youtube":
        return (
          <YouTubeEmbed
            videoId={video_id}
            onComplete={handleComplete}
            requireFullWatch={require_full_watch}
            autoComplete={auto_complete}
            className="h-full"
          />
        );
      case "vimeo":
        return (
          <VimeoEmbed
            videoId={video_id}
            onComplete={handleComplete}
            requireFullWatch={require_full_watch}
            autoComplete={auto_complete}
            className="h-full"
          />
        );
      case "loom":
        return (
          <LoomEmbed
            videoId={video_id}
            onComplete={handleComplete}
            className="h-full"
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg h-full">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center">
              Unsupported video platform
            </p>
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-sm font-medium">{itemName}</SheetTitle>
          <SheetDescription className="text-xs">
            Training Video - {VIDEO_PLATFORM_LABELS[metadata.platform]}
            {metadata.title && ` • ${metadata.title}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 p-4 overflow-hidden">{renderEmbed()}</div>

        {hasCompleted && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 text-center">
              ✓ Video marked as complete
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
