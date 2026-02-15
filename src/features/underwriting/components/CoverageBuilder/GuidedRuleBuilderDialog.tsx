// src/features/underwriting/components/CoverageBuilder/GuidedRuleBuilderDialog.tsx
// Multi-step guided dialog for quickly creating condition acceptance rules with tiered support

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateRuleSet,
  useUpdateRuleSet,
  ruleEngineKeys,
} from "../../hooks/useRuleSets";
import { useCreateRule } from "../../hooks/useRules";
import { coverageStatsKeys } from "../../hooks/useCoverageStats";
import type { PredicateGroup } from "@/services/underwriting/ruleEngineDSL";
import type {
  HealthClass,
  TableRating,
} from "@/services/underwriting/ruleService";

// ============================================================================
// Types
// ============================================================================

type Decision =
  | "always_decline"
  | "tiered_acceptance"
  | "case_by_case"
  | "always_accept";

interface TierRow {
  yearsAgo: number;
  healthClass: HealthClass;
  tableRating: TableRating;
}

type CatchAllOutcome = "decline" | "refer";

interface GuidedRuleBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrierId: string;
  carrierName: string;
  productId: string;
  productName: string;
  conditionCode: string;
  conditionName: string;
}

const HEALTH_CLASS_OPTIONS: { value: HealthClass; label: string }[] = [
  { value: "preferred_plus", label: "Preferred Plus" },
  { value: "preferred", label: "Preferred" },
  { value: "standard_plus", label: "Standard Plus" },
  { value: "standard", label: "Standard" },
  { value: "substandard", label: "Substandard" },
];

const TABLE_RATING_OPTIONS: { value: TableRating; label: string }[] = [
  { value: "none", label: "None" },
  { value: "A", label: "A (+25%)" },
  { value: "B", label: "B (+50%)" },
  { value: "C", label: "C (+75%)" },
  { value: "D", label: "D (+100%)" },
  { value: "E", label: "E (+125%)" },
  { value: "F", label: "F (+150%)" },
  { value: "G", label: "G (+175%)" },
  { value: "H", label: "H (+200%)" },
];

const DEFAULT_TIER: TierRow = {
  yearsAgo: 5,
  healthClass: "standard",
  tableRating: "none",
};

// ============================================================================
// Component
// ============================================================================

export function GuidedRuleBuilderDialog({
  open,
  onOpenChange,
  carrierId,
  carrierName,
  productId,
  productName,
  conditionCode,
  conditionName,
}: GuidedRuleBuilderDialogProps) {
  const queryClient = useQueryClient();
  const createRuleSetMutation = useCreateRuleSet();
  const createRuleMutation = useCreateRule();
  const updateRuleSetMutation = useUpdateRuleSet();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 — Always Accept state
  const [healthClass, setHealthClass] = useState<HealthClass>("standard");
  const [tableRating, setTableRating] = useState<TableRating>("none");
  const [notes, setNotes] = useState("");

  // Step 2 — Tiered Acceptance state
  const [tiers, setTiers] = useState<TierRow[]>([{ ...DEFAULT_TIER }]);
  const [catchAllOutcome, setCatchAllOutcome] =
    useState<CatchAllOutcome>("decline");

  const resetState = () => {
    setStep(1);
    setDecision(null);
    setIsSaving(false);
    setError(null);
    setHealthClass("standard");
    setTableRating("none");
    setNotes("");
    setTiers([{ ...DEFAULT_TIER }]);
    setCatchAllOutcome("decline");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleDecisionSelect = (d: Decision) => {
    setDecision(d);
    if (d === "tiered_acceptance" || d === "always_accept") {
      setStep(2);
    }
  };

  // ---- Tier management ----
  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const nextYears = Math.max(1, (lastTier?.yearsAgo ?? 5) - 2);
    setTiers([
      ...tiers,
      { yearsAgo: nextYears, healthClass: "substandard", tableRating: "none" },
    ]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, updates: Partial<TierRow>) => {
    setTiers(
      tiers.map((tier, i) => (i === index ? { ...tier, ...updates } : tier)),
    );
  };

  // ---- Build rules ----

  const buildSingleRule = (): {
    predicate: PredicateGroup;
    eligibility: "eligible" | "ineligible" | "refer";
    hc: HealthClass;
    tr: TableRating;
    reason: string;
  } => {
    switch (decision) {
      case "always_decline":
        return {
          predicate: {},
          eligibility: "ineligible",
          hc: "decline",
          tr: "none",
          reason: `${conditionName} - Always decline`,
        };
      case "case_by_case":
        return {
          predicate: {},
          eligibility: "refer",
          hc: "unknown",
          tr: "none",
          reason: `${conditionName} - Case by case review required`,
        };
      case "always_accept": {
        const reason = notes.trim()
          ? `${conditionName} - ${notes.trim()}`
          : `${conditionName} - Always accept`;
        return {
          predicate: {},
          eligibility: "eligible",
          hc: healthClass,
          tr: tableRating,
          reason,
        };
      }
      default:
        throw new Error("No decision selected");
    }
  };

  const handleSave = async () => {
    if (!decision) return;
    setIsSaving(true);
    setError(null);

    let ruleSetId: string | null = null;

    try {
      // 1. Create rule set with productId
      const ruleSet = await createRuleSetMutation.mutateAsync({
        carrierId,
        productId,
        scope: "condition",
        conditionCode,
        name: `${conditionName} - ${productName}`,
        description: notes.trim() || undefined,
        source: "manual",
      });
      ruleSetId = ruleSet.id;

      if (decision === "tiered_acceptance") {
        // Sort tiers by years descending (longest lookback = highest priority)
        const sortedTiers = [...tiers].sort(
          (a, b) => b.yearsAgo - a.yearsAgo,
        );

        // Create a rule for each tier
        for (let i = 0; i < sortedTiers.length; i++) {
          const tier = sortedTiers[i];
          const predicate: PredicateGroup = {
            all: [
              {
                type: "date" as const,
                field: `${conditionCode}.diagnosis_date`,
                operator: "years_since_gte" as const,
                value: tier.yearsAgo,
              },
            ],
          };

          await createRuleMutation.mutateAsync({
            ruleSetId: ruleSet.id,
            priority: i + 1,
            name: `${conditionName} - ${tier.yearsAgo}+ years`,
            predicate,
            outcomeEligibility: "eligible",
            outcomeHealthClass: tier.healthClass,
            outcomeTableRating: tier.tableRating,
            outcomeReason: `${conditionName} - Diagnosed ${tier.yearsAgo}+ years ago`,
            outcomeConcerns: [],
          });
        }

        // Create catch-all rule (highest priority number = last evaluated)
        await createRuleMutation.mutateAsync({
          ruleSetId: ruleSet.id,
          priority: sortedTiers.length + 1,
          name: `${conditionName} - Default`,
          predicate: {},
          outcomeEligibility:
            catchAllOutcome === "decline" ? "ineligible" : "refer",
          outcomeHealthClass:
            catchAllOutcome === "decline" ? "decline" : "unknown",
          outcomeTableRating: "none",
          outcomeReason:
            catchAllOutcome === "decline"
              ? `${conditionName} - Does not meet lookback requirements`
              : `${conditionName} - Refer for review`,
          outcomeConcerns: [],
        });
      } else {
        // Single-rule decisions
        const { predicate, eligibility, hc, tr, reason } = buildSingleRule();

        await createRuleMutation.mutateAsync({
          ruleSetId: ruleSet.id,
          priority: 1,
          name: `${conditionName} rule`,
          predicate,
          outcomeEligibility: eligibility,
          outcomeHealthClass: hc,
          outcomeTableRating: tr,
          outcomeReason: reason,
          outcomeConcerns: [],
        });
      }

      // Approve rule set
      await updateRuleSetMutation.mutateAsync({
        id: ruleSet.id,
        updates: {
          review_status: "approved",
        },
      });

      // Invalidate caches
      queryClient.invalidateQueries({
        queryKey: coverageStatsKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(carrierId),
      });

      handleOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);

      // Clean up orphan rule set on failure
      if (ruleSetId) {
        try {
          const { deleteRuleSet } = await import(
            "@/services/underwriting/ruleService"
          );
          await deleteRuleSet(ruleSetId);
        } catch {
          // Silently fail cleanup
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const needsStep2 =
    decision === "tiered_acceptance" || decision === "always_accept";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-semibold">
            {conditionName}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            <span className="text-muted-foreground">{carrierName}</span> /{" "}
            {productName} — Set acceptance rule
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Decision */}
        {step === 1 && (
          <div className="space-y-2 py-2">
            <Label className="text-[11px] text-muted-foreground">
              How does this product handle this condition?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => handleDecisionSelect("always_decline")}
              >
                Always Decline
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)]/10"
                onClick={() => handleDecisionSelect("tiered_acceptance")}
              >
                Tiered Acceptance
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => handleDecisionSelect("case_by_case")}
              >
                Case by Case
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] border-[var(--success)] text-[var(--success)] hover:bg-[var(--success)]/10"
                onClick={() => handleDecisionSelect("always_accept")}
              >
                Always Accept
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Always Accept — simple health class + table rating */}
        {step === 2 && decision === "always_accept" && (
          <div className="space-y-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground -ml-2"
              onClick={() => {
                setStep(1);
                setDecision(null);
              }}
            >
              &larr; Back to decision
            </Button>

            {/* Health Class */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Best Health Class
              </Label>
              <Select
                value={healthClass}
                onValueChange={(v) => setHealthClass(v as HealthClass)}
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_CLASS_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-[11px]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table Rating */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Table Rating
              </Label>
              <Select
                value={tableRating}
                onValueChange={(v) => setTableRating(v as TableRating)}
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_RATING_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-[11px]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12 text-[11px] resize-none"
                placeholder="Additional context..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Tiered Acceptance — multi-tier lookback rules */}
        {step === 2 && decision === "tiered_acceptance" && (
          <div className="space-y-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground -ml-2"
              onClick={() => {
                setStep(1);
                setDecision(null);
              }}
            >
              &larr; Back to decision
            </Button>

            <Label className="text-[11px] text-muted-foreground">
              Acceptance tiers based on time since diagnosis
            </Label>

            {/* Tier rows */}
            <div className="space-y-2">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 p-2 rounded border bg-muted/30"
                >
                  {/* Years ago */}
                  <div className="flex items-center gap-1 min-w-0">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={tier.yearsAgo}
                      onChange={(e) =>
                        updateTier(index, {
                          yearsAgo: Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          ),
                        })
                      }
                      className="h-6 w-12 text-[11px] px-1.5"
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      yr+
                    </span>
                  </div>

                  {/* Health Class */}
                  <Select
                    value={tier.healthClass}
                    onValueChange={(v) =>
                      updateTier(index, { healthClass: v as HealthClass })
                    }
                  >
                    <SelectTrigger className="h-6 text-[10px] w-28 px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_CLASS_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-[11px]"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Table Rating */}
                  <Select
                    value={tier.tableRating}
                    onValueChange={(v) =>
                      updateTier(index, { tableRating: v as TableRating })
                    }
                  >
                    <SelectTrigger className="h-6 text-[10px] w-20 px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_RATING_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-[11px]"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => removeTier(index)}
                    disabled={tiers.length <= 1}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}

              {/* Add tier button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] w-full"
                onClick={addTier}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tier
              </Button>
            </div>

            {/* Catch-all / default */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Default (when no tier matches)
              </Label>
              <Select
                value={catchAllOutcome}
                onValueChange={(v) =>
                  setCatchAllOutcome(v as CatchAllOutcome)
                }
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decline" className="text-[11px]">
                    Decline
                  </SelectItem>
                  <SelectItem value="refer" className="text-[11px]">
                    Refer for Review
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12 text-[11px] resize-none"
                placeholder="Additional context..."
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-destructive">{error}</p>
        )}

        {/* Footer: Save buttons for step 1 (decline/case-by-case) and step 2 */}
        {((step === 1 && decision && !needsStep2) || step === 2) && (
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              Save Rule{decision === "tiered_acceptance" ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
