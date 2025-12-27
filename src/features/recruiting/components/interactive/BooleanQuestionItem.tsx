// src/features/recruiting/components/interactive/BooleanQuestionItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type {
  BooleanQuestionMetadata,
  BooleanQuestionResponse,
} from "@/types/recruiting.types";
import { BOOLEAN_QUESTION_DEFAULT_LABELS } from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface BooleanQuestionItemProps {
  progressId: string;
  metadata: BooleanQuestionMetadata;
  existingResponse?: BooleanQuestionResponse | null;
  onComplete?: () => void;
}

export function BooleanQuestionItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: BooleanQuestionItemProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(
    existingResponse?.answer ?? null,
  );
  const [explanation, setExplanation] = useState(
    existingResponse?.explanation ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaults = BOOLEAN_QUESTION_DEFAULT_LABELS[metadata.question_style];
  const positiveLabel = metadata.positive_label || defaults.positive;
  const negativeLabel = metadata.negative_label || defaults.negative;

  const handleSubmit = useCallback(async () => {
    if (selectedAnswer === null) {
      toast.error("Please select an answer");
      return;
    }

    if (metadata.explanation_required && !explanation.trim()) {
      toast.error("Please provide an explanation");
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        await checklistResponseService.submitBooleanQuestionResponse(
          progressId,
          selectedAnswer,
          explanation || undefined,
          metadata,
        );

      if (!result.success) {
        toast.error(result.error || "Failed to submit response");
        return;
      }

      if (result.autoComplete) {
        toast.success("Answer submitted!");
        onComplete?.();
      } else if (metadata.require_positive && !selectedAnswer) {
        toast.info(`You must select "${positiveLabel}" to complete this item`);
      } else {
        toast.success("Answer saved");
      }
    } catch (error) {
      console.error("Failed to submit boolean question response:", error);
      toast.error("Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    progressId,
    selectedAnswer,
    explanation,
    metadata,
    positiveLabel,
    onComplete,
  ]);

  // If already answered and completed
  if (existingResponse && selectedAnswer !== null) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Answered:{" "}
            <strong>{selectedAnswer ? positiveLabel : negativeLabel}</strong>
          </span>
        </div>
        {existingResponse.explanation && (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400/80 italic">
            "{existingResponse.explanation}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Question */}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {metadata.question_text}
      </p>

      {/* Answer Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant={selectedAnswer === true ? "default" : "outline"}
          className={`flex-1 h-10 ${
            selectedAnswer === true
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : ""
          }`}
          onClick={() => setSelectedAnswer(true)}
          disabled={isSubmitting}
        >
          {positiveLabel}
        </Button>
        <Button
          type="button"
          variant={selectedAnswer === false ? "default" : "outline"}
          className={`flex-1 h-10 ${
            selectedAnswer === false
              ? "bg-zinc-600 hover:bg-zinc-700 text-white"
              : ""
          }`}
          onClick={() => setSelectedAnswer(false)}
          disabled={isSubmitting}
        >
          {negativeLabel}
        </Button>
      </div>

      {/* Explanation (if required or optional) */}
      {metadata.explanation_required && (
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-600 dark:text-zinc-400">
            {metadata.explanation_prompt || "Please explain your answer"}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Enter your explanation..."
            className="min-h-[80px] text-sm"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Requirement note */}
      {metadata.require_positive && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Note: You must select "{positiveLabel}" to complete this item.
        </p>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || selectedAnswer === null}
        className="w-full"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Answer
      </Button>
    </div>
  );
}
