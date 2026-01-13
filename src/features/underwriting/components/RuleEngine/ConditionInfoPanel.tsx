// src/features/underwriting/components/RuleEngine/ConditionInfoPanel.tsx
// Displays follow-up questions collected for a health condition

import { useMemo } from "react";
import { Info } from "lucide-react";
import { CONDITION_FIELDS, type FieldDefinition } from "./fieldRegistry";

// ============================================================================
// Types
// ============================================================================

interface ConditionInfoPanelProps {
  conditionCode: string;
  conditionName?: string;
}

// ============================================================================
// Helper: Format condition name from code
// ============================================================================

function formatConditionName(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ============================================================================
// Helper: Get field type label
// ============================================================================

function getFieldTypeLabel(field: FieldDefinition): string {
  switch (field.type) {
    case "numeric":
      return field.unit ? `Number (${field.unit})` : "Number";
    case "date":
      return "Date";
    case "boolean":
      return "Yes/No";
    case "string":
      return "Text";
    case "set":
      return "Select One";
    case "array":
      return "Select Multiple";
    default:
      return "";
  }
}

// ============================================================================
// Component
// ============================================================================

export function ConditionInfoPanel({
  conditionCode,
  conditionName,
}: ConditionInfoPanelProps) {
  // Get condition fields
  const conditionFields = useMemo(() => {
    return CONDITION_FIELDS[conditionCode] ?? {};
  }, [conditionCode]);

  const fieldEntries = Object.entries(conditionFields);
  const displayName = conditionName || formatConditionName(conditionCode);

  if (fieldEntries.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
            Follow-Up Questions
          </span>
        </div>
        <p className="text-[10px] text-zinc-400">
          No specific follow-up questions defined for this condition. Rules will
          use client demographics only.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-900/10">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
          Follow-Up Questions
        </span>
      </div>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3">
        When an applicant discloses{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {displayName}
        </span>
        , collect the following information:
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {fieldEntries.map(([key, field]) => (
          <div key={key} className="flex items-center gap-2 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
              {field.label}
            </span>
            <span className="text-zinc-400">({getFieldTypeLabel(field)})</span>
          </div>
        ))}
      </div>

      {/* Show options for set/array fields */}
      {fieldEntries.some(([_, f]) => f.options && f.options.length > 0) && (
        <div className="mt-3 pt-2 border-t border-blue-200/50 dark:border-blue-800/30">
          <p className="text-[9px] text-zinc-400 uppercase tracking-wide mb-1.5">
            Available Options
          </p>
          {fieldEntries
            .filter(([_, f]) => f.options && f.options.length > 0)
            .map(([key, field]) => (
              <div key={key} className="mb-2 last:mb-0">
                <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                  {field.label}:
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {field.options!.map((opt) => (
                    <span
                      key={opt.value}
                      className="px-1.5 py-0.5 text-[9px] bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800/50 rounded text-zinc-600 dark:text-zinc-300"
                    >
                      {opt.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
