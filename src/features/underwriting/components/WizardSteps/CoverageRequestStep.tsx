// src/features/underwriting/components/WizardSteps/CoverageRequestStep.tsx

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
  CoverageRequest,
  ProductType,
} from "../../types/underwriting.types";

interface CoverageRequestStepProps {
  data: CoverageRequest;
  onChange: (updates: Partial<CoverageRequest>) => void;
  errors: Record<string, string>;
}

const PRODUCT_OPTIONS: {
  value: ProductType;
  label: string;
  description: string;
}[] = [
  {
    value: "term_life",
    label: "Term Life",
    description: "Affordable coverage for a specific period (10-30 years)",
  },
  {
    value: "whole_life",
    label: "Whole Life",
    description: "Permanent coverage with cash value accumulation",
  },
  {
    value: "universal_life",
    label: "Universal Life",
    description: "Flexible premium and death benefit options",
  },
  {
    value: "indexed_universal_life",
    label: "Indexed Universal Life (IUL)",
    description: "Cash value growth tied to market index performance",
  },
];

const FACE_AMOUNT_PRESETS = [
  100000, 250000, 500000, 750000, 1000000, 2000000, 5000000,
];

export default function CoverageRequestStep({
  data,
  onChange,
  errors,
}: CoverageRequestStepProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleProductType = (type: ProductType) => {
    const current = data.productTypes || [];
    if (current.includes(type)) {
      onChange({ productTypes: current.filter((t) => t !== type) });
    } else {
      onChange({ productTypes: [...current, type] });
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        Specify the coverage amount and product types the client is interested
        in.
      </div>

      {/* Face Amount */}
      <div className="space-y-2">
        <Label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
          Face Amount (Death Benefit) <span className="text-red-500">*</span>
        </Label>

        {/* Quick select buttons */}
        <div className="flex flex-wrap gap-1.5">
          {FACE_AMOUNT_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onChange({ faceAmount: amount })}
              className={cn(
                "px-2 py-1 text-[10px] rounded border transition-colors",
                data.faceAmount === amount
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700",
              )}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">$</span>
          <Input
            type="number"
            min={10000}
            max={100000000}
            step={10000}
            value={data.faceAmount || ""}
            onChange={(e) =>
              onChange({ faceAmount: parseInt(e.target.value) || 0 })
            }
            className={cn(
              "h-8 text-sm w-40",
              errors.faceAmount && "border-red-500",
            )}
            placeholder="Enter amount"
          />
        </div>

        {errors.faceAmount && (
          <p className="text-[10px] text-red-500">{errors.faceAmount}</p>
        )}

        {data.faceAmount > 0 && (
          <p className="text-xs text-zinc-500">
            Coverage amount:{" "}
            <span className="font-medium">
              {formatCurrency(data.faceAmount)}
            </span>
          </p>
        )}
      </div>

      {/* Product Types */}
      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <Label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
          Product Types <span className="text-red-500">*</span>
        </Label>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Select the product types to consider for recommendations
        </p>

        <div className="space-y-2">
          {PRODUCT_OPTIONS.map((option) => {
            const isSelected = data.productTypes?.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => toggleProductType(option.value)}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleProductType(option.value)}
                  className="mt-0.5"
                />
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isSelected
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {option.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {option.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {errors.productTypes && (
          <p className="text-[10px] text-red-500">{errors.productTypes}</p>
        )}
      </div>

      {/* Summary */}
      {data.productTypes.length > 0 && data.faceAmount > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mb-1">
            Coverage Summary
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">
            Looking for{" "}
            <span className="font-medium">
              {formatCurrency(data.faceAmount)}
            </span>{" "}
            in{" "}
            <span className="font-medium">
              {data.productTypes
                .map(
                  (t) => PRODUCT_OPTIONS.find((o) => o.value === t)?.label || t,
                )
                .join(", ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
