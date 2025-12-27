// src/features/recruiting/components/interactive/AcknowledgmentItem.tsx

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type {
  AcknowledgmentMetadata,
  AcknowledgmentResponse,
} from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface AcknowledgmentItemProps {
  progressId: string;
  metadata: AcknowledgmentMetadata;
  existingResponse?: AcknowledgmentResponse | null;
  onComplete?: () => void;
}

export function AcknowledgmentItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: AcknowledgmentItemProps) {
  const [acknowledged, setAcknowledged] = useState(
    existingResponse?.acknowledged ?? false,
  );
  const [scrollCompleted, setScrollCompleted] = useState(
    existingResponse?.scroll_completed ?? !metadata.require_scroll,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track scroll completion
  useEffect(() => {
    if (!metadata.require_scroll || scrollCompleted) return;

    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      // Consider scrolled if within 20px of bottom
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setScrollCompleted(true);
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [metadata.require_scroll, scrollCompleted]);

  const handleSubmit = useCallback(async () => {
    if (!acknowledged) {
      toast.error("Please check the acknowledgment box");
      return;
    }

    if (metadata.require_scroll && !scrollCompleted) {
      toast.error("Please scroll through the entire content first");
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        await checklistResponseService.submitAcknowledgmentResponse(
          progressId,
          acknowledged,
          scrollCompleted,
        );

      if (!result.success) {
        toast.error(result.error || "Failed to submit acknowledgment");
        return;
      }

      toast.success("Acknowledgment submitted!");
      onComplete?.();
    } catch (error) {
      console.error("Failed to submit acknowledgment:", error);
      toast.error("Failed to submit acknowledgment");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    progressId,
    acknowledged,
    scrollCompleted,
    metadata.require_scroll,
    onComplete,
  ]);

  // If already acknowledged and completed
  if (existingResponse?.acknowledged) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Acknowledged</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Content to acknowledge */}
      {metadata.content && (
        <ScrollArea
          ref={scrollRef}
          className="max-h-[200px] rounded border border-zinc-200 dark:border-zinc-700 p-3"
        >
          <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {metadata.content}
          </div>
        </ScrollArea>
      )}

      {/* Scroll requirement notice */}
      {metadata.require_scroll && !scrollCompleted && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Please scroll through the entire content above before acknowledging.
        </p>
      )}

      {/* Acknowledgment checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox
          id={`ack-${progressId}`}
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
          disabled={
            isSubmitting || (metadata.require_scroll && !scrollCompleted)
          }
        />
        <label
          htmlFor={`ack-${progressId}`}
          className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer leading-tight"
        >
          {metadata.acknowledgment_text}
        </label>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={
          isSubmitting ||
          !acknowledged ||
          (metadata.require_scroll && !scrollCompleted)
        }
        className="w-full"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Confirm Acknowledgment
      </Button>
    </div>
  );
}
