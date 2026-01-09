// src/features/underwriting/components/WizardSteps/HealthConditionsStep.tsx

import { useState, useMemo, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, X, Check } from "lucide-react";
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

  const { data: conditions = [], isLoading } = useHealthConditions();

  const groupedConditions = useMemo(
    () => groupConditionsByCategory(conditions),
    [conditions],
  );

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedConditions;

    const term = searchTerm.toLowerCase();
    const filtered: Record<ConditionCategory, HealthCondition[]> = {} as Record<
      ConditionCategory,
      HealthCondition[]
    >;

    Object.entries(groupedConditions).forEach(([category, items]) => {
      const matchingItems = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term),
      );
      if (matchingItems.length > 0) {
        filtered[category as ConditionCategory] = matchingItems;
      }
    });

    return filtered;
  }, [groupedConditions, searchTerm]);

  const selectedConditionCodes = useMemo(
    () => new Set(data.conditions.map((c) => c.conditionCode)),
    [data.conditions],
  );

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
        // Remove condition
        onChange({
          conditions: data.conditions.filter(
            (c) => c.conditionCode !== condition.code,
          ),
        });
      } else {
        // Add condition with empty responses
        const newCondition: ConditionResponse = {
          conditionCode: condition.code,
          conditionName: condition.name,
          responses: {},
        };
        onChange({
          conditions: [...data.conditions, newCondition],
        });
      }
    },
    [selectedConditionCodes, data.conditions, onChange],
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

  const updateMedications = useCallback(
    (updates: Partial<HealthInfo["medications"]>) => {
      onChange({ medications: { ...data.medications, ...updates } });
    },
    [data.medications, onChange],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-zinc-500">
        Loading health conditions...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        Select any health conditions that apply to the client and answer the
        follow-up questions.
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          placeholder="Search conditions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Conditions List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[250px] overflow-y-auto">
        {Object.entries(filteredGroups).map(([category, items]) => (
          <Collapsible
            key={category}
            open={
              expandedCategories.has(category) ||
              items.some((item) => selectedConditionCodes.has(item.code))
            }
          >
            <CollapsibleTrigger
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
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
                {expandedCategories.has(category) ||
                items.some((item) => selectedConditionCodes.has(item.code)) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-2 space-y-1">
                {items.map((condition) => (
                  <ConditionItem
                    key={condition.code}
                    condition={condition}
                    isSelected={selectedConditionCodes.has(condition.code)}
                    responses={
                      data.conditions.find(
                        (c) => c.conditionCode === condition.code,
                      )?.responses || {}
                    }
                    onToggle={() => toggleCondition(condition)}
                    onUpdateResponses={(responses) =>
                      updateConditionResponses(condition.code, responses)
                    }
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Selected Conditions Summary */}
      {data.conditions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
          <div className="text-[11px] font-medium text-blue-700 dark:text-blue-300 mb-1">
            Selected Conditions ({data.conditions.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {data.conditions.map((c) => (
              <span
                key={c.conditionCode}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 rounded text-[10px] text-zinc-700 dark:text-zinc-300"
              >
                {c.conditionName}
                <button
                  onClick={() =>
                    onChange({
                      conditions: data.conditions.filter(
                        (cond) => cond.conditionCode !== c.conditionCode,
                      ),
                    })
                  }
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tobacco Section */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Tobacco / Nicotine Use
        </div>
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
            className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            Currently uses tobacco/nicotine products
          </Label>
        </div>

        {data.tobacco.currentUse && (
          <div className="mt-2 ml-6 grid grid-cols-2 gap-3">
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
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cigarettes">Cigarettes</SelectItem>
                  <SelectItem value="cigars">Cigars</SelectItem>
                  <SelectItem value="vape">Vape/E-cigarettes</SelectItem>
                  <SelectItem value="chewing">Chewing tobacco</SelectItem>
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
                  <SelectValue placeholder="Select frequency" />
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

      {/* Medications Section */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Current Medications
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">
              Blood Pressure Medications
            </Label>
            <Select
              value={data.medications.bpMedCount.toString()}
              onValueChange={(value) =>
                updateMedications({ bpMedCount: parseInt(value) })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3 or more</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">
              Cholesterol Medications
            </Label>
            <Select
              value={data.medications.cholesterolMedCount.toString()}
              onValueChange={(value) =>
                updateMedications({ cholesterolMedCount: parseInt(value) })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2 or more</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual condition with follow-ups
interface ConditionItemProps {
  condition: HealthCondition;
  isSelected: boolean;
  responses: Record<string, string | number | string[]>;
  onToggle: () => void;
  onUpdateResponses: (
    responses: Record<string, string | number | string[]>,
  ) => void;
}

function ConditionItem({
  condition,
  isSelected,
  responses,
  onToggle,
  onUpdateResponses,
}: ConditionItemProps) {
  const schema = parseFollowUpSchema(condition);

  const updateResponse = (
    questionId: string,
    value: string | number | string[],
  ) => {
    onUpdateResponses({ ...responses, [questionId]: value });
  };

  return (
    <div
      className={cn(
        "rounded-md transition-colors",
        isSelected && "bg-blue-50/50 dark:bg-blue-900/10",
      )}
    >
      <div
        className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded"
        onClick={onToggle}
      >
        <div
          className={cn(
            "flex items-center justify-center w-4 h-4 rounded border transition-colors",
            isSelected
              ? "bg-blue-600 border-blue-600"
              : "border-zinc-300 dark:border-zinc-600",
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="text-xs text-zinc-700 dark:text-zinc-300">
          {condition.name}
        </span>
      </div>

      {/* Follow-up questions */}
      {isSelected && schema.questions.length > 0 && (
        <div className="ml-6 px-2 pb-2 space-y-2">
          {schema.questions.map((question) => (
            <FollowUpQuestionField
              key={question.id}
              question={question}
              value={responses[question.id]}
              onChange={(value) => updateResponse(question.id, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-component for rendering follow-up questions
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
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={`Select ${question.label}`} />
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
          <div className="space-y-1">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center gap-2">
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
            placeholder={`Enter ${question.label.toLowerCase()}`}
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
