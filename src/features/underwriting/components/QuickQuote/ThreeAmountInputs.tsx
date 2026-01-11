// src/features/underwriting/components/QuickQuote/ThreeAmountInputs.tsx
// Three customizable amount inputs for Quick Quote comparison

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ThreeAmountInputsProps {
  mode: "coverage" | "budget";
  values: [number, number, number];
  onChange: (values: [number, number, number]) => void;
  className?: string;
}

// =============================================================================
// Preset Values
// =============================================================================

const COVERAGE_PRESETS: [number, number, number][] = [
  [25000, 50000, 100000],
  [50000, 100000, 250000],
  [100000, 250000, 500000],
  [250000, 500000, 1000000],
];

const BUDGET_PRESETS: [number, number, number][] = [
  [25, 50, 100],
  [50, 100, 200],
  [100, 200, 300],
  [150, 250, 400],
];

// =============================================================================
// Helpers
// =============================================================================

function formatDisplayValue(
  value: number,
  mode: "coverage" | "budget",
): string {
  if (mode === "budget") {
    return value.toString();
  }
  // For coverage, show as compact format (e.g., 25000 -> 25,000)
  return value.toLocaleString("en-US");
}

function parseInputValue(input: string): number {
  // Remove any non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function formatPresetLabel(
  values: [number, number, number],
  mode: "coverage" | "budget",
): string {
  if (mode === "budget") {
    return `$${values[0]}/$${values[1]}/$${values[2]}`;
  }
  const format = (v: number) => {
    if (v >= 1000000) return `$${v / 1000000}M`;
    if (v >= 1000) return `$${v / 1000}k`;
    return `$${v}`;
  };
  return `${format(values[0])}/${format(values[1])}/${format(values[2])}`;
}

// =============================================================================
// Single Input Component
// =============================================================================

function AmountInput({
  value,
  onChange,
  label,
  mode,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  mode: "coverage" | "budget";
}) {
  const [localValue, setLocalValue] = useState(formatDisplayValue(value, mode));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value when external value changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatDisplayValue(value, mode));
    }
  }, [value, mode, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseInputValue(localValue);
    const clamped = Math.max(0, Math.round(parsed));
    onChange(clamped);
    setLocalValue(formatDisplayValue(clamped, mode));
  }, [localValue, onChange, mode]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number when focused
    setLocalValue(value.toString());
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    },
    [],
  );

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="pl-5 text-right tabular-nums h-8 text-sm"
        />
        {mode === "budget" && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            /mo
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ThreeAmountInputs({
  mode,
  values,
  onChange,
  className,
}: ThreeAmountInputsProps) {
  const presets = mode === "coverage" ? COVERAGE_PRESETS : BUDGET_PRESETS;

  const handleSingleChange = useCallback(
    (index: number, newValue: number) => {
      const newValues = [...values] as [number, number, number];
      newValues[index] = newValue;
      onChange(newValues);
    },
    [values, onChange],
  );

  const handlePresetClick = useCallback(
    (preset: [number, number, number]) => {
      onChange(preset);
    },
    [onChange],
  );

  const isPresetActive = (preset: [number, number, number]) => {
    return (
      values[0] === preset[0] &&
      values[1] === preset[1] &&
      values[2] === preset[2]
    );
  };

  const labels =
    mode === "coverage"
      ? ["Low", "Mid", "High"]
      : ["Budget 1", "Budget 2", "Budget 3"];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset, idx) => (
          <Button
            key={idx}
            type="button"
            variant={isPresetActive(preset) ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => handlePresetClick(preset)}
          >
            {formatPresetLabel(preset, mode)}
          </Button>
        ))}
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-3 gap-3">
        {values.map((value, idx) => (
          <AmountInput
            key={idx}
            value={value}
            onChange={(v) => handleSingleChange(idx, v)}
            label={labels[idx]}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}
