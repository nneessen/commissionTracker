// src/features/underwriting/components/RuleEngine/ProvenanceTooltip.tsx
// Display source/extraction info for AI-extracted rules

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Bot, FileText, Info } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ProvenanceTooltipProps {
  source?: "manual" | "ai_extracted" | "imported" | null;
  confidence?: number | null;
  sourcePages?: number[] | null;
  sourceSnippet?: string | null;
  sourceGuideId?: string | null;
  inline?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ProvenanceTooltip({
  source,
  confidence,
  sourcePages,
  sourceSnippet,
  sourceGuideId,
  inline,
}: ProvenanceTooltipProps) {
  // No provenance info
  if (
    !source &&
    confidence === null &&
    !sourcePages?.length &&
    !sourceSnippet
  ) {
    return null;
  }

  const content = (
    <div className="space-y-2 max-w-xs">
      {/* Source Type */}
      {source && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400">Source:</span>
          <Badge
            variant={source === "ai_extracted" ? "info" : "secondary"}
            className="text-[9px] h-4"
          >
            {source === "ai_extracted" && (
              <Bot className="h-2.5 w-2.5 mr-0.5" />
            )}
            {source === "manual"
              ? "Manual"
              : source === "ai_extracted"
                ? "AI Extracted"
                : "Imported"}
          </Badge>
        </div>
      )}

      {/* Confidence */}
      {confidence !== null && confidence !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400">Confidence:</span>
          <span
            className={`text-[10px] font-medium ${
              confidence >= 0.8
                ? "text-green-500"
                : confidence >= 0.6
                  ? "text-amber-500"
                  : "text-red-500"
            }`}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
      )}

      {/* Source Pages */}
      {sourcePages && sourcePages.length > 0 && (
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-zinc-400" />
          <span className="text-[10px] text-zinc-400">
            Pages: {sourcePages.join(", ")}
          </span>
        </div>
      )}

      {/* Source Snippet */}
      {sourceSnippet && (
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400">Source text:</span>
          <p className="text-[10px] text-zinc-300 bg-zinc-800/50 p-1.5 rounded max-h-20 overflow-y-auto">
            "{sourceSnippet}"
          </p>
        </div>
      )}

      {/* Guide Link */}
      {sourceGuideId && (
        <div className="text-[10px] text-blue-400">View source guide →</div>
      )}
    </div>
  );

  // Inline display (for provenance tab)
  if (inline) {
    return (
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3">
        {content}
      </div>
    );
  }

  // Tooltip display
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-300"
          >
            <Info className="h-3 w-3" />
            {source === "ai_extracted" && confidence != null && (
              <span>{Math.round(confidence * 100)}%</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-2">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
