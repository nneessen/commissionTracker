// src/features/underwriting/components/DecisionTreeEditor/RuleConditionRow.tsx

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  RuleCondition,
  ConditionField,
  ConditionOperator,
  HealthTier,
} from "../../types/underwriting.types";
import { US_STATES, getHealthTierLabel } from "../../types/underwriting.types";
import {
  getOperatorsForField,
  validateNumericValue,
  getDefaultValueForField,
  FIELD_CONSTRAINTS,
} from "../../utils/ruleUtils";

interface RuleConditionRowProps {
  condition: RuleCondition;
  onChange: (condition: RuleCondition) => void;
  onDelete: () => void;
  healthConditions?: Array<{ code: string; name: string }>;
}

const FIELD_OPTIONS: Array<{ value: ConditionField; label: string }> = [
  { value: "age", label: "Age" },
  { value: "gender", label: "Gender" },
  { value: "bmi", label: "BMI" },
  { value: "health_tier", label: "Health Tier" },
  { value: "tobacco", label: "Tobacco Use" },
  { value: "face_amount", label: "Face Amount" },
  { value: "state", label: "State" },
  { value: "condition_present", label: "Condition Present" },
];

const HEALTH_TIERS: HealthTier[] = [
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "substandard",
  "table_rated",
  "decline",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

function RuleConditionRowInner({
  condition,
  onChange,
  onDelete,
  healthConditions = [],
}: RuleConditionRowProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const operators = getOperatorsForField(condition.field);

  const handleFieldChange = (field: ConditionField) => {
    setValidationError(null);
    const defaultValue = getDefaultValueForField(field);
    const defaultOperator: ConditionOperator = "==";

    onChange({
      field,
      operator: defaultOperator,
      value: defaultValue,
    });
  };

  const handleOperatorChange = (operator: ConditionOperator) => {
    onChange({ ...condition, operator });
  };

  const handleNumericValueChange = (
    field: "age" | "bmi" | "face_amount",
    inputValue: string,
  ) => {
    // Allow empty input while typing
    if (inputValue === "") {
      onChange({ ...condition, value: 0 });
      return;
    }

    const validation = validateNumericValue(field, inputValue);

    if (!validation.isValid) {
      setValidationError(validation.error || null);
    } else {
      setValidationError(null);
    }

    onChange({ ...condition, value: validation.value });
  };

  const handleValueChange = (value: string | number | boolean | string[]) => {
    setValidationError(null);
    onChange({ ...condition, value });
  };

  // Render appropriate value input based on field type
  const renderValueInput = () => {
    const { field, value } = condition;

    switch (field) {
      case "age": {
        const constraints = FIELD_CONSTRAINTS.age;
        return (
          <div className="flex flex-col">
            <Input
              type="number"
              value={typeof value === "number" ? value : constraints.default}
              onChange={(e) => handleNumericValueChange("age", e.target.value)}
              min={constraints.min}
              max={constraints.max}
              step={constraints.step}
              className={cn(
                "h-7 w-20 text-[11px]",
                validationError && "border-red-500 focus-visible:ring-red-500",
              )}
            />
            {validationError && (
              <span className="text-[9px] text-red-500 mt-0.5">
                {validationError}
              </span>
            )}
          </div>
        );
      }

      case "bmi": {
        const constraints = FIELD_CONSTRAINTS.bmi;
        return (
          <div className="flex flex-col">
            <Input
              type="number"
              value={typeof value === "number" ? value : constraints.default}
              onChange={(e) => handleNumericValueChange("bmi", e.target.value)}
              min={constraints.min}
              max={constraints.max}
              step={constraints.step}
              className={cn(
                "h-7 w-20 text-[11px]",
                validationError && "border-red-500 focus-visible:ring-red-500",
              )}
            />
            {validationError && (
              <span className="text-[9px] text-red-500 mt-0.5">
                {validationError}
              </span>
            )}
          </div>
        );
      }

      case "face_amount": {
        const constraints = FIELD_CONSTRAINTS.face_amount;
        return (
          <div className="flex flex-col">
            <Input
              type="number"
              value={typeof value === "number" ? value : constraints.default}
              onChange={(e) =>
                handleNumericValueChange("face_amount", e.target.value)
              }
              min={constraints.min}
              max={constraints.max}
              step={constraints.step}
              className={cn(
                "h-7 w-28 text-[11px]",
                validationError && "border-red-500 focus-visible:ring-red-500",
              )}
              placeholder="$"
            />
            {validationError && (
              <span className="text-[9px] text-red-500 mt-0.5">
                {validationError}
              </span>
            )}
          </div>
        );
      }

      case "tobacco":
        return (
          <Select
            value={value === true ? "true" : "false"}
            onValueChange={(v) => handleValueChange(v === "true")}
          >
            <SelectTrigger className="h-7 w-20 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "gender":
        return (
          <Select
            value={String(value)}
            onValueChange={(v) => handleValueChange(v)}
          >
            <SelectTrigger className="h-7 w-24 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "health_tier":
        return (
          <Select
            value={String(value)}
            onValueChange={(v) => handleValueChange(v)}
          >
            <SelectTrigger className="h-7 w-32 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEALTH_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {getHealthTierLabel(tier)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "state":
        return (
          <Select
            value={String(value)}
            onValueChange={(v) => handleValueChange(v)}
          >
            <SelectTrigger className="h-7 w-32 text-[11px]">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "condition_present":
        return (
          <Select
            value={String(value)}
            onValueChange={(v) => handleValueChange(v)}
          >
            <SelectTrigger className="h-7 w-40 text-[11px]">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {healthConditions.map((cond) => (
                <SelectItem key={cond.code} value={cond.code}>
                  {cond.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleValueChange(e.target.value)}
            className="h-7 w-24 text-[11px]"
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded px-2 py-1.5">
      {/* Field selector */}
      <Select
        value={condition.field}
        onValueChange={(v) => handleFieldChange(v as ConditionField)}
      >
        <SelectTrigger className="h-7 w-32 text-[11px] bg-white dark:bg-zinc-900">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={condition.operator}
        onValueChange={(v) => handleOperatorChange(v as ConditionOperator)}
      >
        <SelectTrigger className="h-7 w-24 text-[11px] bg-white dark:bg-zinc-900">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {renderValueInput()}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default RuleConditionRowInner;
