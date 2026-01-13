// src/features/underwriting/components/QuickQuote/QuickQuoteDialog.tsx
// Quick Quote as a dialog with split-panel layout matching UW Wizard design

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { X, RefreshCw, Zap, AlertCircle, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

import { QuoteComparisonGrid } from "./QuoteComparisonGrid";
import {
  ThreeAmountInputs,
  TERM_COVERAGE_PRESETS,
  PERM_COVERAGE_PRESETS,
} from "./ThreeAmountInputs";
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
  coverageAmounts: [250000, 500000, 1000000],
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
  { value: "table_rated", label: "Table" },
];

const TERM_OPTIONS: TermYears[] = [10, 15, 20, 25, 30];

// =============================================================================
// Props
// =============================================================================

interface QuickQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function QuickQuoteDialog({
  open,
  onOpenChange,
}: QuickQuoteDialogProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const {
    data: matrices,
    isLoading: isLoadingMatrices,
    error,
  } = useAllPremiumMatrices();

  // Derived: available term years from the data (filtered by user age)
  const availableTermYears = useMemo(() => {
    if (!matrices) return TERM_OPTIONS;
    const available = getAvailableTermYearsForAge(
      matrices,
      form.productTypes,
      form.age,
    );
    return available.length > 0 ? available : [];
  }, [matrices, form.productTypes, form.age]);

  const showTermSelector = useMemo(() => {
    return hasTermProducts(form.productTypes);
  }, [form.productTypes]);

  // Determine product category for presets
  const { isTermOnly, isPermOnly, coveragePresets } = useMemo(() => {
    const hasTerm = form.productTypes.includes("term_life");
    const hasPerm = form.productTypes.some((t) =>
      [
        "whole_life",
        "participating_whole_life",
        "indexed_universal_life",
      ].includes(t),
    );

    const termOnly = hasTerm && !hasPerm;
    const permOnly = hasPerm && !hasTerm;

    // Select appropriate presets
    let presets: [number, number, number][] | undefined;
    if (termOnly) {
      presets = TERM_COVERAGE_PRESETS;
    } else if (permOnly) {
      presets = PERM_COVERAGE_PRESETS;
    }
    // undefined = use default mixed presets

    return {
      isTermOnly: termOnly,
      isPermOnly: permOnly,
      coveragePresets: presets,
    };
  }, [form.productTypes]);

  // Auto-switch coverage amounts when switching between term-only and perm-only
  const prevProductCategoryRef = useRef<"term" | "perm" | "mixed">("mixed");
  useEffect(() => {
    const currentCategory = isTermOnly ? "term" : isPermOnly ? "perm" : "mixed";
    const prevCategory = prevProductCategoryRef.current;

    if (currentCategory !== prevCategory) {
      prevProductCategoryRef.current = currentCategory;

      // Only auto-switch if in coverage mode
      if (form.mode === "coverage") {
        if (currentCategory === "perm") {
          // Switch to perm defaults: 15k, 25k, 35k
          setForm((prev) => ({
            ...prev,
            coverageAmounts: [15000, 25000, 35000],
          }));
        } else if (currentCategory === "term") {
          // Switch to term defaults: 250k, 500k, 1M
          setForm((prev) => ({
            ...prev,
            coverageAmounts: [250000, 500000, 1000000],
          }));
        }
      }
    }
  }, [isTermOnly, isPermOnly, form.mode]);

  // Auto-correct term when age changes
  useEffect(() => {
    if (!showTermSelector || availableTermYears.length === 0) return;
    if (!availableTermYears.includes(form.termYears)) {
      setForm((prev) => ({
        ...prev,
        termYears: availableTermYears[0],
      }));
    }
  }, [availableTermYears, form.termYears, showTermSelector]);

  // INSTANT quote calculation
  const quotes: QuickQuoteResult[] = useMemo(() => {
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

  const isValid = form.gender && form.age >= 18 && form.productTypes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden bg-background border-0 shadow-2xl ring-0 outline-none"
        hideCloseButton
      >
        <DialogTitle className="sr-only">Quick Quote Calculator</DialogTitle>

        <div className="flex h-[75vh] overflow-hidden">
          {/* Left Panel - Branding */}
          <div className="hidden lg:flex lg:w-[240px] bg-foreground relative overflow-hidden flex-shrink-0">
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id="quickquote-grid"
                    width="32"
                    height="32"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 32 0 L 0 0 0 32"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#quickquote-grid)" />
              </svg>
            </div>

            {/* Animated glow orbs */}
            <div className="absolute top-1/4 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-1/4 -right-16 w-56 h-56 bg-emerald-400/5 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between p-6 w-full">
              {/* Logo */}
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-lg blur-lg group-hover:bg-emerald-500/30 transition-all duration-500" />
                  <img
                    src="/logos/Light Letter Logo .png"
                    alt="The Standard"
                    className="relative h-10 w-10 drop-shadow-xl dark:hidden"
                  />
                  <img
                    src="/logos/LetterLogo.png"
                    alt="The Standard"
                    className="relative h-10 w-10 drop-shadow-xl hidden dark:block"
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-white dark:text-black text-lg font-bold tracking-wide"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Quick Quote
                  </span>
                  <span className="text-emerald-400 text-[9px] uppercase tracking-[0.2em] font-medium">
                    Instant Comparison
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="flex-1 flex flex-col justify-center space-y-4 py-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/80 dark:text-black/80">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium">Real-time rates</span>
                  </div>
                  <p className="text-xs text-white/50 dark:text-black/50 pl-6">
                    Quotes calculate instantly as you adjust parameters
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/80 dark:text-black/80">
                    <Calculator className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium">
                      Compare products
                    </span>
                  </div>
                  <p className="text-xs text-white/50 dark:text-black/50 pl-6">
                    Term, Whole Life, Part. WL, and IUL side by side
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-[10px] text-white/30 dark:text-black/30">
                Rates are estimates. Final premium depends on underwriting.
              </div>
            </div>
          </div>

          {/* Right Panel - Form & Results */}
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 lg:hidden">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Quick Quote</span>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Configure parameters below
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mx-4 mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  Failed to load rates: {error.message}
                </p>
              </div>
            )}

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Demographics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                {/* Age */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Age
                  </Label>
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
                    className="h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Gender
                  </Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, gender: v as GenderType }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
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
                  <Label className="text-[10px] text-muted-foreground">
                    Tobacco
                  </Label>
                  <div className="flex items-center h-7 gap-1.5">
                    <Checkbox
                      id="qq-tobacco"
                      checked={form.tobaccoUse}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, tobaccoUse: !!checked }))
                      }
                      className="h-3.5 w-3.5"
                    />
                    <label
                      htmlFor="qq-tobacco"
                      className="text-xs cursor-pointer"
                    >
                      Yes
                    </label>
                  </div>
                </div>

                {/* Health Class */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Health Class
                  </Label>
                  <Select
                    value={form.healthClass}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        healthClass: v as HealthClass,
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
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

                {/* Term Selector (conditional) */}
                {showTermSelector && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Term
                    </Label>
                    <Select
                      value={form.termYears.toString()}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          termYears: parseInt(v) as TermYears,
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTermYears.map((term) => (
                          <SelectItem key={term} value={term.toString()}>
                            {term}yr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Products Row */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Products
                </span>
                {PRODUCT_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-1">
                    <Checkbox
                      id={`qq-product-${opt.value}`}
                      checked={form.productTypes.includes(opt.value)}
                      onCheckedChange={(checked) =>
                        handleProductToggle(opt.value, !!checked)
                      }
                      className="h-3.5 w-3.5"
                    />
                    <label
                      htmlFor={`qq-product-${opt.value}`}
                      className={cn(
                        "text-xs cursor-pointer",
                        form.productTypes.includes(opt.value)
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>

              {/* Mode & Amounts */}
              <div className="space-y-3 p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                <RadioGroup
                  value={form.mode}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, mode: v as QuoteMode }))
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="coverage" id="qq-mode-coverage" />
                    <label
                      htmlFor="qq-mode-coverage"
                      className={cn(
                        "text-xs cursor-pointer",
                        form.mode === "coverage" && "font-medium",
                      )}
                    >
                      By Face Amount
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="budget" id="qq-mode-budget" />
                    <label
                      htmlFor="qq-mode-budget"
                      className={cn(
                        "text-xs cursor-pointer",
                        form.mode === "budget" && "font-medium",
                      )}
                    >
                      By Monthly Budget
                    </label>
                  </div>
                </RadioGroup>

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
                  customPresets={
                    form.mode === "coverage" ? coveragePresets : undefined
                  }
                />
              </div>

              {/* Results */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium">Results</span>
                  {quotes.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      ({quotes.length} products)
                    </span>
                  )}
                  {isLoadingMatrices && (
                    <span className="text-[10px] text-emerald-600">
                      Loading rates...
                    </span>
                  )}
                </div>

                {!isValid ? (
                  <div className="flex items-center justify-center p-6 text-center border rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      Enter age, select gender, and choose at least one product
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
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuickQuoteDialog;
