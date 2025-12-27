// src/features/recruiting/components/interactive/TextResponseItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type {
  TextResponseMetadata,
  TextResponseData,
} from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface TextResponseItemProps {
  progressId: string;
  metadata: TextResponseMetadata;
  existingResponse?: TextResponseData | null;
  onComplete?: () => void;
}

export function TextResponseItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: TextResponseItemProps) {
  const [text, setText] = useState(existingResponse?.text ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = text.length;
  const minLength = metadata.min_length ?? 0;
  const maxLength = metadata.max_length;

  const handleSubmit = useCallback(async () => {
    // Validate
    const validation = checklistResponseService.validateTextResponse(
      text,
      metadata.min_length,
      metadata.max_length,
      metadata.required_keywords,
      metadata.validation_pattern,
    );

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await checklistResponseService.submitTextResponse(
        progressId,
        text,
      );

      if (!result.success) {
        toast.error(result.error || "Failed to submit response");
        return;
      }

      toast.success("Response submitted!");
      onComplete?.();
    } catch (error) {
      console.error("Failed to submit text response:", error);
      toast.error("Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  }, [progressId, text, metadata, onComplete]);

  // If already submitted
  if (existingResponse?.text) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 mb-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Response submitted</span>
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400/80 italic line-clamp-3">
          "{existingResponse.text}"
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Prompt */}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {metadata.prompt}
      </p>

      {/* Text Area */}
      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={metadata.placeholder || "Enter your response..."}
          className={`min-h-[${metadata.response_type === "long" ? "150" : "80"}px] text-sm`}
          disabled={isSubmitting}
          maxLength={maxLength}
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            {minLength > 0 && characterCount < minLength && (
              <span className="text-amber-600">
                {minLength - characterCount} more characters required
              </span>
            )}
          </span>
          <span>
            {characterCount}
            {maxLength ? ` / ${maxLength}` : ""} characters
          </span>
        </div>
      </div>

      {/* Required keywords hint */}
      {metadata.required_keywords && metadata.required_keywords.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Must include: {metadata.required_keywords.join(", ")}
        </p>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || characterCount < minLength}
        className="w-full"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Response
      </Button>
    </div>
  );
}
