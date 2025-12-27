// src/features/recruiting/components/interactive/MultipleChoiceItem.tsx

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type {
  MultipleChoiceMetadata,
  MultipleChoiceResponse,
} from "@/types/recruiting.types";
import { checklistResponseService } from "@/services/recruiting/checklistResponseService";

interface MultipleChoiceItemProps {
  progressId: string;
  metadata: MultipleChoiceMetadata;
  existingResponse?: MultipleChoiceResponse | null;
  onComplete?: () => void;
}

export function MultipleChoiceItem({
  progressId,
  metadata,
  existingResponse,
  onComplete,
}: MultipleChoiceItemProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    existingResponse?.selected_option_ids ?? [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMultiSelect = metadata.selection_type === "multiple";
  const minSelections = metadata.min_selections ?? 1;
  const maxSelections = metadata.max_selections;

  const handleToggleOption = useCallback(
    (optionId: string) => {
      if (isMultiSelect) {
        setSelectedIds((prev) => {
          if (prev.includes(optionId)) {
            return prev.filter((id) => id !== optionId);
          }
          if (maxSelections && prev.length >= maxSelections) {
            toast.error(`Maximum ${maxSelections} selections allowed`);
            return prev;
          }
          return [...prev, optionId];
        });
      } else {
        setSelectedIds([optionId]);
      }
    },
    [isMultiSelect, maxSelections],
  );

  const handleSubmit = useCallback(async () => {
    // Validate selection count
    const validation = checklistResponseService.validateMultipleChoiceSelection(
      selectedIds,
      minSelections,
      maxSelections,
    );

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        await checklistResponseService.submitMultipleChoiceResponse(
          progressId,
          selectedIds,
          metadata,
        );

      if (!result.success) {
        toast.error(result.error || "Failed to submit selection");
        return;
      }

      // Check for disqualifying selections
      if (result.completionDetails?.disqualifying_selections) {
        const disqualifying = result.completionDetails
          .disqualifying_selections as string[];
        toast.warning(
          `Note: Your selection of "${disqualifying.join(", ")}" may affect your eligibility.`,
        );
      }

      if (result.autoComplete) {
        toast.success("Selection submitted!");
        onComplete?.();
      } else if (metadata.require_correct) {
        toast.info(
          "Your selection has been recorded, but it may not be the correct answer.",
        );
      } else {
        toast.success("Selection submitted!");
        onComplete?.();
      }
    } catch (error) {
      console.error("Failed to submit multiple choice response:", error);
      toast.error("Failed to submit selection");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    progressId,
    selectedIds,
    metadata,
    minSelections,
    maxSelections,
    onComplete,
  ]);

  // If already submitted
  if (existingResponse?.selected_option_ids?.length) {
    const selectedLabels = metadata.options
      .filter((o) => existingResponse.selected_option_ids.includes(o.id))
      .map((o) => o.label);

    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 mb-1">
          <CheckCircle2 className="h-4 w-4" />
          <span>Selection submitted</span>
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400/80">
          Selected: {selectedLabels.join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
      {/* Question */}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {metadata.question_text}
      </p>

      {/* Selection hint */}
      {isMultiSelect && (
        <p className="text-xs text-zinc-500">
          {minSelections > 1
            ? `Select at least ${minSelections}`
            : "Select all that apply"}
          {maxSelections ? ` (max ${maxSelections})` : ""}
        </p>
      )}

      {/* Options */}
      <div className="space-y-2">
        {metadata.options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          const isDisqualifying = option.is_disqualifying;

          return (
            <div
              key={option.id}
              className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                isSelected
                  ? "bg-primary/10 border-primary"
                  : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
              }`}
              onClick={() => !isSubmitting && handleToggleOption(option.id)}
            >
              {isMultiSelect ? (
                <Checkbox
                  checked={isSelected}
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
              ) : (
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">
                    {option.label}
                  </span>
                  {isDisqualifying && isSelected && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                {option.description && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shuffle note if applicable */}
      {metadata.randomize_order && (
        <p className="text-xs text-zinc-400 italic">
          Options are displayed in random order
        </p>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || selectedIds.length < minSelections}
        className="w-full"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Selection
      </Button>
    </div>
  );
}
