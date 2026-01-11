// src/features/underwriting/components/QuickQuote/QuickQuotePage.tsx
// Redesigned Quick Quote - Blazingly fast with pre-fetch + in-memory calculations

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { QuoteComparisonGrid } from "./QuoteComparisonGrid";
import { ThreeAmountInputs } from "./ThreeAmountInputs";
import { useAllPremiumMatrices } from "../../hooks/useQuickQuote";
import {
  calculateQuotesForCoverage,
  calculateQuotesForBudget,
  getAvailableTermYearsForAge,
  hasTermProducts,
  type QuickQuoteInput,
  type QuickQuoteProductType,
  type QuickQuoteResult,
} from "@/services/underwriting/quickQuoteCalculator";
import type {
  GenderType,
  HealthClass,
  TermYears,
} from "@/services/underwriting/premiumMatrixService";

// =============================================================================
// Types & Constants
// =============================================================================

type QuoteMode = "coverage" | "budget";

interface FormState {
  age: number;
  gender: GenderType | "";
  tobaccoUse: boolean;
  healthClass: HealthClass;
  productTypes: QuickQuoteProductType[];
  termYears: TermYears;
  mode: QuoteMode;
  coverageAmounts: [number, number, number];
  budgetAmounts: [number, number, number];
}

const DEFAULT_FORM: FormState = {
  age: 35,
  gender: "male",
  tobaccoUse: false,
  healthClass: "standard",
  productTypes: ["term_life", "whole_life"],
  termYears: 20,
  mode: "coverage",
  coverageAmounts: [25000, 50000, 100000],
  budgetAmounts: [50, 100, 200],
};

const PRODUCT_OPTIONS: { value: QuickQuoteProductType; label: string }[] = [
  { value: "term_life", label: "Term" },
  { value: "whole_life", label: "Whole Life" },
  { value: "participating_whole_life", label: "Part. WL" },
  { value: "indexed_universal_life", label: "IUL" },
];

const HEALTH_CLASS_OPTIONS: { value: HealthClass; label: string }[] = [
  { value: "preferred_plus", label: "Preferred+" },
  { value: "preferred", label: "Preferred" },
  { value: "standard_plus", label: "Standard+" },
  { value: "standard", label: "Standard" },
  { value: "table_rated", label: "Table Rated" },
];

const TERM_OPTIONS: TermYears[] = [10, 15, 20, 25, 30];

// =============================================================================
// Main Component
// =============================================================================

export default function QuickQuotePage() {
  // State
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  // Data fetching - single batch query, long cache
  const {
    data: matrices,
    isLoading: isLoadingMatrices,
    error,
  } = useAllPremiumMatrices();

  // Derived: available term years from the data (filtered by user age)
  const availableTermYears = useMemo(() => {
    if (!matrices) return TERM_OPTIONS;
    // Filter by age to show only valid term options
    const available = getAvailableTermYearsForAge(
      matrices,
      form.productTypes,
      form.age,
    );
    return available.length > 0 ? available : [];
  }, [matrices, form.productTypes, form.age]);

  // Derived: show term selector only if term products selected
  const showTermSelector = useMemo(() => {
    return hasTermProducts(form.productTypes);
  }, [form.productTypes]);

  // Auto-correct term when age changes and current term becomes invalid
  useEffect(() => {
    if (!showTermSelector || availableTermYears.length === 0) return;

    // If current term is not in the available list, select the first valid one
    if (!availableTermYears.includes(form.termYears)) {
      setForm((prev) => ({
        ...prev,
        termYears: availableTermYears[0],
      }));
    }
  }, [availableTermYears, form.termYears, showTermSelector]);

  // INSTANT quote calculation via useMemo - no DB calls!
  const quotes: QuickQuoteResult[] = useMemo(() => {
    // Validate inputs
    if (!matrices || matrices.length === 0) return [];
    if (!form.gender) return [];
    if (form.age < 18 || form.age > 100) return [];
    if (form.productTypes.length === 0) return [];

    const input: QuickQuoteInput = {
      age: form.age,
      gender: form.gender as GenderType,
      tobaccoUse: form.tobaccoUse,
      healthClass: form.healthClass,
      productTypes: form.productTypes,
      termYears: showTermSelector ? form.termYears : undefined,
    };

    if (form.mode === "coverage") {
      return calculateQuotesForCoverage(matrices, input, form.coverageAmounts);
    } else {
      return calculateQuotesForBudget(matrices, input, form.budgetAmounts);
    }
  }, [
    matrices,
    form.age,
    form.gender,
    form.tobaccoUse,
    form.healthClass,
    form.productTypes,
    form.termYears,
    form.mode,
    form.coverageAmounts,
    form.budgetAmounts,
    showTermSelector,
  ]);

  // Handlers
  const handleReset = useCallback(() => {
    setForm(DEFAULT_FORM);
  }, []);

  const handleProductToggle = useCallback(
    (productType: QuickQuoteProductType, checked: boolean) => {
      setForm((prev) => {
        const newTypes = checked
          ? [...prev.productTypes, productType]
          : prev.productTypes.filter((t) => t !== productType);
        return { ...prev, productTypes: newTypes };
      });
    },
    [],
  );

  const currentAmounts =
    form.mode === "coverage" ? form.coverageAmounts : form.budgetAmounts;

  // Validation state
  const isValid = form.gender && form.age >= 18 && form.productTypes.length > 0;

  return (
    <div className="container mx-auto py-4 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Quick Quote
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Instant comparison across products
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load rate data: {error.message}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        {/* Form Card */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Parameters</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Row 1: Demographics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Age */}
              <div className="space-y-1">
                <Label className="text-xs">Age</Label>
                <Input
                  type="number"
                  min={18}
                  max={100}
                  value={form.age}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      age: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, gender: v as GenderType }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tobacco */}
              <div className="space-y-1">
                <Label className="text-xs">Tobacco</Label>
                <div className="flex items-center h-8 gap-2">
                  <Checkbox
                    id="tobacco"
                    checked={form.tobaccoUse}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, tobaccoUse: !!checked }))
                    }
                  />
                  <label
                    htmlFor="tobacco"
                    className="text-sm cursor-pointer select-none"
                  >
                    Yes
                  </label>
                </div>
              </div>

              {/* Health Class */}
              <div className="space-y-1">
                <Label className="text-xs">Health Class</Label>
                <Select
                  value={form.healthClass}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      healthClass: v as HealthClass,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEALTH_CLASS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Product Types + Term */}
            <div className="flex flex-wrap items-end gap-4">
              {/* Product Type Checkboxes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Products</Label>
                <div className="flex flex-wrap gap-3">
                  {PRODUCT_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`product-${opt.value}`}
                        checked={form.productTypes.includes(opt.value)}
                        onCheckedChange={(checked) =>
                          handleProductToggle(opt.value, !!checked)
                        }
                      />
                      <label
                        htmlFor={`product-${opt.value}`}
                        className="text-xs cursor-pointer select-none"
                      >
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Term Selector (conditional) */}
              {showTermSelector && (
                <div className="space-y-1">
                  <Label className="text-xs">Term Length</Label>
                  <Select
                    value={form.termYears.toString()}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        termYears: parseInt(v) as TermYears,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-24 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTermYears.map((term) => (
                        <SelectItem key={term} value={term.toString()}>
                          {term} Year
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Row 3: Mode Toggle + Amounts */}
            <div className="space-y-3 pt-2 border-t">
              {/* Mode Toggle */}
              <RadioGroup
                value={form.mode}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, mode: v as QuoteMode }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="coverage" id="mode-coverage" />
                  <label
                    htmlFor="mode-coverage"
                    className={cn(
                      "text-xs cursor-pointer select-none",
                      form.mode === "coverage" && "font-medium",
                    )}
                  >
                    By Face Amount
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="budget" id="mode-budget" />
                  <label
                    htmlFor="mode-budget"
                    className={cn(
                      "text-xs cursor-pointer select-none",
                      form.mode === "budget" && "font-medium",
                    )}
                  >
                    By Monthly Budget
                  </label>
                </div>
              </RadioGroup>

              {/* Amount Inputs */}
              <ThreeAmountInputs
                mode={form.mode}
                values={currentAmounts}
                onChange={(values) =>
                  setForm((prev) => ({
                    ...prev,
                    [form.mode === "coverage"
                      ? "coverageAmounts"
                      : "budgetAmounts"]: values,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Results
              {quotes.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({quotes.length} products)
                </span>
              )}
              {isLoadingMatrices && (
                <span className="text-xs font-normal text-amber-600">
                  Loading rates...
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!isValid ? (
              <div className="flex items-center justify-center p-8 text-center border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Enter age, select gender, and choose at least one product type
                </p>
              </div>
            ) : (
              <QuoteComparisonGrid
                quotes={quotes}
                mode={form.mode}
                amounts={currentAmounts}
                isLoading={isLoadingMatrices}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
