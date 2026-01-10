// src/features/underwriting/components/CriteriaReview/SourceExcerptsPanel.tsx

import { FileText, Quote, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SourceExcerpt } from "../../types/underwriting.types";

interface SourceExcerptsPanelProps {
  excerpts: SourceExcerpt[];
  maxHeight?: string;
}

const fieldLabels: Record<string, string> = {
  ageLimits: "Age Limits",
  faceAmountLimits: "Face Amount Limits",
  knockoutConditions: "Knockout Conditions",
  buildRequirements: "Build/BMI Requirements",
  tobaccoRules: "Tobacco Rules",
  medicationRestrictions: "Medication Restrictions",
  stateAvailability: "State Availability",
};

export function SourceExcerptsPanel({
  excerpts,
  maxHeight = "400px",
}: SourceExcerptsPanelProps) {
  if (!excerpts || excerpts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-400 dark:text-zinc-500">
        <FileCode className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-[10px]">No source excerpts available</p>
        <p className="text-[9px] mt-1 text-zinc-400/70">
          Source citations help verify extracted data
        </p>
      </div>
    );
  }

  // Group excerpts by field
  const groupedExcerpts = excerpts.reduce(
    (acc, excerpt) => {
      const field = excerpt.field || "other";
      if (!acc[field]) {
        acc[field] = [];
      }
      acc[field].push(excerpt);
      return acc;
    },
    {} as Record<string, SourceExcerpt[]>,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-2">
        <Quote className="h-3 w-3 text-zinc-400" />
        <h4 className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
          Source Citations ({excerpts.length})
        </h4>
      </div>

      <ScrollArea style={{ maxHeight }} className="pr-2">
        <div className="space-y-3">
          {Object.entries(groupedExcerpts).map(([field, fieldExcerpts]) => (
            <div
              key={field}
              className="border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden"
            >
              <div className="bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                  {fieldLabels[field] || field}
                </span>
              </div>
              <div className="p-2 space-y-2">
                {fieldExcerpts.map((excerpt, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded p-2"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-3 w-3 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                          "{excerpt.excerpt}"
                        </p>
                        {excerpt.pageNumber && (
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-[8px] px-1 py-0 h-4"
                          >
                            Page {excerpt.pageNumber}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
