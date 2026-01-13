// src/features/underwriting/components/WizardSteps/HealthConditionsStep.tsx

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useHealthConditions,
  parseFollowUpSchema,
  groupConditionsByCategory,
} from "../../hooks";
import type {
  HealthInfo,
  ConditionResponse,
  HealthCondition,
  FollowUpQuestion,
  ConditionCategory,
} from "../../types/underwriting.types";
import { CONDITION_CATEGORY_LABELS } from "../../types/underwriting.types";

interface HealthConditionsStepProps {
  data: HealthInfo;
  onChange: (updates: Partial<HealthInfo>) => void;
  errors: Record<string, string>;
}

export default function HealthConditionsStep({
  data,
  onChange,
  errors: _errors,
}: HealthConditionsStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [activeConditionCode, setActiveConditionCode] = useState<string | null>(
    null,
  );

  const { data: conditions = [], isLoading } = useHealthConditions();

  const groupedConditions = useMemo(
    () => groupConditionsByCategory(conditions),
    [conditions],
  );

  // Filter and auto-expand categories when searching
  const { filteredGroups, matchingCategories } = useMemo(() => {
    if (!searchTerm.trim()) {
      return {
        filteredGroups: groupedConditions,
        matchingCategories: new Set<string>(),
      };
    }

    const term = searchTerm.toLowerCase();
    const filtered: Record<ConditionCategory, HealthCondition[]> = {} as Record<
      ConditionCategory,
      HealthCondition[]
    >;
    const matching = new Set<string>();

    Object.entries(groupedConditions).forEach(([category, items]) => {
      const matchingItems = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term),
      );
      if (matchingItems.length > 0) {
        filtered[category as ConditionCategory] = matchingItems;
        matching.add(category);
      }
    });

    return { filteredGroups: filtered, matchingCategories: matching };
  }, [groupedConditions, searchTerm]);

  const selectedConditionCodes = useMemo(
    () => new Set(data.conditions.map((c) => c.conditionCode)),
    [data.conditions],
  );

  // Get the active condition for follow-up panel
  const activeCondition = useMemo(() => {
    if (!activeConditionCode) return null;
    return conditions.find((c) => c.code === activeConditionCode) || null;
  }, [activeConditionCode, conditions]);

  const activeConditionResponses = useMemo(() => {
    if (!activeConditionCode) return {};
    return (
      data.conditions.find((c) => c.conditionCode === activeConditionCode)
        ?.responses || {}
    );
  }, [activeConditionCode, data.conditions]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const toggleCondition = useCallback(
    (condition: HealthCondition) => {
      const isSelected = selectedConditionCodes.has(condition.code);

      if (isSelected) {
        onChange({
          conditions: data.conditions.filter(
            (c) => c.conditionCode !== condition.code,
          ),
        });
        if (activeConditionCode === condition.code) {
          setActiveConditionCode(null);
        }
      } else {
        const newCondition: ConditionResponse = {
          conditionCode: condition.code,
          conditionName: condition.name,
          responses: {},
        };
        onChange({ conditions: [...data.conditions, newCondition] });
        // Auto-open follow-up panel for newly selected condition
        const schema = parseFollowUpSchema(condition);
        if (schema.questions.length > 0) {
          setActiveConditionCode(condition.code);
        }
      }
    },
    [selectedConditionCodes, data.conditions, onChange, activeConditionCode],
  );

  const updateConditionResponses = useCallback(
    (code: string, responses: Record<string, string | number | string[]>) => {
      const updatedConditions = data.conditions.map((c) =>
        c.conditionCode === code ? { ...c, responses } : c,
      );
      onChange({ conditions: updatedConditions });
    },
    [data.conditions, onChange],
  );

  const updateTobacco = useCallback(
    (updates: Partial<HealthInfo["tobacco"]>) => {
      onChange({ tobacco: { ...data.tobacco, ...updates } });
    },
    [data.tobacco, onChange],
  );

  // Check if category should be expanded
  const isCategoryExpanded = (category: string) => {
    // Auto-expand if search matches this category
    if (searchTerm.trim() && matchingCategories.has(category)) return true;
    // Auto-expand if has selected conditions
    const items = groupedConditions[category as ConditionCategory] || [];
    if (items.some((item) => selectedConditionCodes.has(item.code)))
      return true;
    // Manual expand
    return expandedCategories.has(category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-zinc-500">
        Loading health conditions...
      </div>
    );
  }

  const activeSchema = activeCondition
    ? parseFollowUpSchema(activeCondition)
    : null;
  const hasActiveFollowUps = activeSchema && activeSchema.questions.length > 0;

  return (
    <div className="flex gap-4 p-1">
      {/* Left Panel - Conditions List */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Select health conditions. Follow-up questions appear on the right.
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Search conditions (e.g., diabetes, cancer)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Conditions List */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[200px] overflow-y-auto">
          {Object.entries(filteredGroups).map(([category, items]) => (
            <Collapsible key={category} open={isCategoryExpanded(category)}>
              <CollapsibleTrigger
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {CONDITION_CATEGORY_LABELS[category as ConditionCategory] ||
                    category}
                </span>
                <div className="flex items-center gap-2">
                  {items.some((item) =>
                    selectedConditionCodes.has(item.code),
                  ) && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">
                      {
                        items.filter((item) =>
                          selectedConditionCodes.has(item.code),
                        ).length
                      }{" "}
                      selected
                    </span>
                  )}
                  {isCategoryExpanded(category) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {items.map((condition) => {
                    const isSelected = selectedConditionCodes.has(
                      condition.code,
                    );
                    const schema = parseFollowUpSchema(condition);
                    const hasFollowUps = schema.questions.length > 0;
                    const conditionResponses =
                      data.conditions.find(
                        (c) => c.conditionCode === condition.code,
                      )?.responses || {};
                    const hasUnanswered =
                      hasFollowUps &&
                      isSelected &&
                      schema.questions.some(
                        (q) => q.required && !conditionResponses[q.id],
                      );

                    return (
                      <div
                        key={condition.code}
                        className={cn(
                          "flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer transition-colors",
                          isSelected && "bg-blue-50/50 dark:bg-blue-900/10",
                          activeConditionCode === condition.code &&
                            "ring-1 ring-amber-400",
                          !isSelected &&
                            "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                        )}
                        onClick={() => {
                          if (!isSelected) {
                            toggleCondition(condition);
                          } else if (hasFollowUps) {
                            setActiveConditionCode(condition.code);
                          }
                        }}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-3.5 h-3.5 rounded border transition-colors flex-shrink-0",
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-zinc-300 dark:border-zinc-600",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCondition(condition);
                          }}
                        >
                          {isSelected && (
                            <Check className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[11px] truncate",
                            isSelected
                              ? "text-zinc-800 dark:text-zinc-200"
                              : "text-zinc-600 dark:text-zinc-400",
                          )}
                        >
                          {condition.name}
                        </span>
                        {hasUnanswered && (
                          <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Selected Summary */}
        {data.conditions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
            <div className="text-[10px] font-medium text-blue-700 dark:text-blue-300 mb-1">
              Selected ({data.conditions.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {data.conditions.map((c) => (
                <span
                  key={c.conditionCode}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-zinc-800 border rounded text-[9px]",
                    activeConditionCode === c.conditionCode
                      ? "border-amber-400 text-amber-700 dark:text-amber-300"
                      : "border-blue-200 dark:border-blue-700 text-zinc-700 dark:text-zinc-300",
                  )}
                  onClick={() => {
                    const cond = conditions.find(
                      (x) => x.code === c.conditionCode,
                    );
                    if (cond) {
                      const schema = parseFollowUpSchema(cond);
                      if (schema.questions.length > 0) {
                        setActiveConditionCode(c.conditionCode);
                      }
                    }
                  }}
                >
                  {c.conditionName}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        conditions: data.conditions.filter(
                          (cond) => cond.conditionCode !== c.conditionCode,
                        ),
                      });
                      if (activeConditionCode === c.conditionCode) {
                        setActiveConditionCode(null);
                      }
                    }}
                    className="text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tobacco Section */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Checkbox
              id="tobacco"
              checked={data.tobacco.currentUse}
              onCheckedChange={(checked) =>
                updateTobacco({ currentUse: checked === true })
              }
            />
            <Label
              htmlFor="tobacco"
              className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer"
            >
              Currently uses tobacco/nicotine
            </Label>
          </div>
          {data.tobacco.currentUse && (
            <div className="mt-2 ml-6 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Type</Label>
                <Select
                  value={data.tobacco.type || ""}
                  onValueChange={(value) =>
                    updateTobacco({
                      type: value as HealthInfo["tobacco"]["type"],
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cigarettes">Cigarettes</SelectItem>
                    <SelectItem value="cigars">Cigars</SelectItem>
                    <SelectItem value="vape">Vape</SelectItem>
                    <SelectItem value="chewing">Chewing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Frequency</Label>
                <Select
                  value={data.tobacco.frequency || ""}
                  onValueChange={(value) => updateTobacco({ frequency: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="occasionally">Occasionally</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Follow-up Questions (Fixed) */}
      <div className="w-[220px] flex-shrink-0">
        <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 min-h-[200px]">
          {hasActiveFollowUps && activeCondition ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate pr-2">
                  {activeCondition.name}
                </div>
                <button
                  onClick={() => setActiveConditionCode(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {activeSchema.questions.map((question) => (
                  <FollowUpQuestionField
                    key={question.id}
                    question={question}
                    value={activeConditionResponses[question.id]}
                    onChange={(value) =>
                      updateConditionResponses(activeConditionCode!, {
                        ...activeConditionResponses,
                        [question.id]: value,
                      })
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <AlertCircle className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {data.conditions.length === 0
                  ? "Select a condition to see follow-up questions"
                  : "Click a selected condition to answer follow-up questions"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Follow-up question field component
interface FollowUpQuestionFieldProps {
  question: FollowUpQuestion;
  value: string | number | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
}

function FollowUpQuestionField({
  question,
  value,
  onChange,
}: FollowUpQuestionFieldProps) {
  const renderField = () => {
    switch (question.type) {
      case "select":
        return (
          <Select value={(value as string) || ""} onValueChange={onChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={`Select...`} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect": {
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-1 max-h-[100px] overflow-y-auto">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center gap-1.5">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== option));
                    }
                  }}
                  className="h-3 w-3"
                />
                <Label
                  htmlFor={`${question.id}-${option}`}
                  className="text-[10px] text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      }

      case "number":
        return (
          <Input
            type="number"
            min={question.min}
            max={question.max}
            step={question.step || 1}
            value={(value as number) || ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="h-7 text-xs"
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 text-xs"
          />
        );

      case "text":
      default:
        return (
          <Input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 text-xs"
            placeholder={`Enter...`}
          />
        );
    }
  };

  return (
    <div className="space-y-0.5">
      <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {renderField()}
    </div>
  );
}
