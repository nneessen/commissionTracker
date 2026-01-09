// src/features/underwriting/components/DecisionTreeEditor/RuleBuilder.tsx

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import RuleConditionRow from "./RuleConditionRow";
import RuleActionConfig from "./RuleActionConfig";
import type {
  DecisionTreeRule,
  RuleCondition,
  RuleConditionGroup,
  RuleRecommendation,
  CarrierWithProducts,
} from "../../types/underwriting.types";

interface RuleBuilderProps {
  ruleId: string;
  rule: DecisionTreeRule;
  onUpdate: (ruleId: string, rule: DecisionTreeRule) => void;
  onDelete: (ruleId: string) => void;
  onDuplicate: (ruleId: string) => void;
  carriers: CarrierWithProducts[];
  healthConditions: Array<{ code: string; name: string }>;
  index: number;
}

function RuleBuilderInner({
  ruleId,
  rule,
  onUpdate,
  onDelete,
  onDuplicate,
  carriers,
  healthConditions,
  index,
}: RuleBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine if using AND or OR logic
  const isAllLogic = !!rule.conditions.all;
  const conditions = rule.conditions.all || rule.conditions.any || [];

  const handleNameChange = (name: string) => {
    onUpdate(ruleId, { ...rule, name });
  };

  const handleToggleActive = () => {
    onUpdate(ruleId, { ...rule, isActive: !rule.isActive });
  };

  const handleToggleLogic = () => {
    const newConditions: RuleConditionGroup = isAllLogic
      ? { any: conditions }
      : { all: conditions };
    onUpdate(ruleId, { ...rule, conditions: newConditions });
  };

  const handleAddCondition = () => {
    const newCondition: RuleCondition = {
      field: "age",
      operator: ">=",
      value: 18,
    };
    const updatedConditions = [...conditions, newCondition];
    const newConditionsGroup: RuleConditionGroup = isAllLogic
      ? { all: updatedConditions }
      : { any: updatedConditions };
    onUpdate(ruleId, { ...rule, conditions: newConditionsGroup });
  };

  const handleUpdateCondition = (idx: number, condition: RuleCondition) => {
    const updatedConditions = conditions.map((c, i) =>
      i === idx ? condition : c,
    );
    const newConditionsGroup: RuleConditionGroup = isAllLogic
      ? { all: updatedConditions }
      : { any: updatedConditions };
    onUpdate(ruleId, { ...rule, conditions: newConditionsGroup });
  };

  const handleDeleteCondition = (idx: number) => {
    const updatedConditions = conditions.filter((_, i) => i !== idx);
    const newConditionsGroup: RuleConditionGroup = isAllLogic
      ? { all: updatedConditions }
      : { any: updatedConditions };
    onUpdate(ruleId, { ...rule, conditions: newConditionsGroup });
  };

  const handleRecommendationsChange = (
    recommendations: RuleRecommendation[],
  ) => {
    onUpdate(ruleId, { ...rule, recommendations });
  };

  // Count selected products across all recommendations
  const totalProductsSelected = rule.recommendations.reduce(
    (sum, rec) => sum + rec.productIds.length,
    0,
  );

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        rule.isActive !== false
          ? "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          : "border-zinc-200/50 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 opacity-70",
      )}
    >
      {/* Rule Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 cursor-pointer",
          rule.isActive !== false
            ? "bg-zinc-50 dark:bg-zinc-800/50"
            : "bg-zinc-100 dark:bg-zinc-800/30",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] font-mono bg-white dark:bg-zinc-900"
        >
          #{index + 1}
        </Badge>

        <Input
          value={rule.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="h-6 flex-1 text-[11px] font-medium border-transparent bg-transparent hover:bg-white dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 focus:border-zinc-200 dark:focus:border-zinc-700"
          placeholder="Rule name..."
        />

        {/* Summary badges */}
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          >
            {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
          </Badge>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
          >
            {totalProductsSelected} product
            {totalProductsSelected !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleActive}
            className="h-6 w-6 p-0"
            title={rule.isActive !== false ? "Disable rule" : "Enable rule"}
          >
            {rule.isActive !== false ? (
              <ToggleRight className="h-4 w-4 text-emerald-500" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-zinc-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(ruleId)}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-600"
            title="Duplicate rule"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(ruleId)}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-red-500"
            title="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Rule Content */}
      {isExpanded && (
        <div className="p-3 space-y-4 border-t border-zinc-200 dark:border-zinc-700">
          {/* Conditions Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  Conditions
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleLogic}
                  className={cn(
                    "h-5 px-2 text-[10px] font-medium",
                    isAllLogic
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                  )}
                >
                  {isAllLogic ? "Match ALL" : "Match ANY"}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
                className="h-6 text-[10px] px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <div className="text-center py-4 text-zinc-400 dark:text-zinc-500 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-dashed border-zinc-200 dark:border-zinc-700">
                No conditions. This rule will match all clients.
              </div>
            ) : (
              <div className="space-y-1.5">
                {conditions.map((condition, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {idx > 0 && (
                      <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 w-8 text-center">
                        {isAllLogic ? "AND" : "OR"}
                      </span>
                    )}
                    {idx === 0 && <span className="w-8" />}
                    <div className="flex-1">
                      <RuleConditionRow
                        condition={condition}
                        onChange={(updated) =>
                          handleUpdateCondition(idx, updated)
                        }
                        onDelete={() => handleDeleteCondition(idx)}
                        healthConditions={healthConditions}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <RuleActionConfig
              recommendations={rule.recommendations}
              onChange={handleRecommendationsChange}
              carriers={carriers}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RuleBuilderInner;
