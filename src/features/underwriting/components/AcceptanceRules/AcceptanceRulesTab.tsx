// src/features/underwriting/components/AcceptanceRules/AcceptanceRulesTab.tsx
// Tab for managing carrier acceptance rules (v2 - compound predicates)
// NOTE: Approval workflow removed - single-user system, rules are active immediately

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Wand2, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCarriersWithProducts } from "../../hooks/useCarriersWithProducts";
import {
  useRuleSets,
  useRuleSet,
  useCreateRuleSet,
  useUpdateRuleSet,
  useDeleteRuleSet,
  type RuleSetWithRules,
} from "../../hooks/useRuleSets";
import {
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useReorderRules,
} from "../../hooks/useRules";
import {
  useGenerateKnockoutRules,
  useGenerateAgeRules,
  useKnockoutCodes,
  type GenerationStrategy,
} from "../../hooks/useGenerateRules";
import {
  RuleSetList,
  RuleSetEditor,
  type RuleSetFormData,
  type RuleFormData,
} from "../RuleEngine";

export function AcceptanceRulesTab() {
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");
  const [selectedRuleSet, setSelectedRuleSet] =
    useState<RuleSetWithRules | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Generation dialog state
  const [knockoutDialogOpen, setKnockoutDialogOpen] = useState(false);
  const [ageRulesDialogOpen, setAgeRulesDialogOpen] = useState(false);
  const [generationStrategy, setGenerationStrategy] =
    useState<GenerationStrategy>("skip_if_exists");

  // Queries
  const { data: carriers, isLoading: loadingCarriers } =
    useCarriersWithProducts();
  const { data: knockoutCodes } = useKnockoutCodes();
  const { data: ruleSets, isLoading: loadingRuleSets } = useRuleSets(
    selectedCarrierId || undefined,
    { includeInactive: true },
  );
  const { data: ruleSetDetail, isLoading: loadingDetail } = useRuleSet(
    selectedRuleSet?.id,
  );

  // Mutations
  const createRuleSet = useCreateRuleSet();
  const updateRuleSet = useUpdateRuleSet();
  const deleteRuleSet = useDeleteRuleSet();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const reorderRules = useReorderRules();

  // Generation mutations
  const generateKnockout = useGenerateKnockoutRules();
  const generateAge = useGenerateAgeRules();

  // Carriers list
  const carriersList = useMemo(() => {
    if (!carriers) return [];
    return carriers.map((c) => ({ id: c.id, name: c.name }));
  }, [carriers]);

  // Get carriers with rule sets
  const _carriersWithRuleSets = useMemo(() => {
    if (!ruleSets) return new Set<string>();
    return new Set(ruleSets.map((rs) => rs.carrier_id));
  }, [ruleSets]);

  // Handle select rule set
  const handleSelectRuleSet = (rs: RuleSetWithRules) => {
    setSelectedRuleSet(rs);
    setIsCreating(false);
    setEditorOpen(true);
  };

  // Handle create new rule set
  const handleCreateNew = () => {
    setSelectedRuleSet(null);
    setIsCreating(true);
    setEditorOpen(true);
  };

  // Save rule set (create or update)
  const handleSaveRuleSet = async (data: RuleSetFormData) => {
    try {
      if (isCreating) {
        const created = await createRuleSet.mutateAsync({
          carrierId: selectedCarrierId,
          productId: data.productId,
          scope: data.scope,
          conditionCode: data.conditionCode,
          name: data.name,
          description: data.description || undefined,
        });
        setSelectedRuleSet(created as unknown as RuleSetWithRules);
        setIsCreating(false);
        toast.success("Rule set created");
      } else if (selectedRuleSet) {
        await updateRuleSet.mutateAsync({
          id: selectedRuleSet.id,
          updates: {
            name: data.name,
            description: data.description || null,
            scope: data.scope,
            condition_code: data.conditionCode,
            product_id: data.productId,
            is_active: data.isActive,
          },
        });
        toast.success("Rule set updated");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save rule set",
      );
    }
  };

  // Delete rule set
  const handleDeleteRuleSet = async (ruleSetId: string) => {
    try {
      await deleteRuleSet.mutateAsync({
        id: ruleSetId,
        carrierId: selectedCarrierId,
      });
      if (selectedRuleSet?.id === ruleSetId) {
        setEditorOpen(false);
        setSelectedRuleSet(null);
      }
      toast.success("Rule set deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete rule set",
      );
    }
  };

  // Toggle active
  const handleToggleActive = async (ruleSetId: string, isActive: boolean) => {
    try {
      await updateRuleSet.mutateAsync({
        id: ruleSetId,
        updates: { is_active: isActive },
      });
      toast.success(isActive ? "Rule set activated" : "Rule set deactivated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update rule set",
      );
    }
  };

  // Rule operations
  const handleCreateRule = async (data: RuleFormData) => {
    if (!selectedRuleSet) return;
    try {
      await createRule.mutateAsync({
        ruleSetId: selectedRuleSet.id,
        priority: data.priority,
        name: data.name,
        description: data.description || undefined,
        ageBandMin: data.ageBandMin,
        ageBandMax: data.ageBandMax,
        gender: data.gender,
        predicate: data.predicate,
        outcomeEligibility: data.outcome.eligibility,
        outcomeHealthClass: data.outcome.healthClass,
        outcomeTableRating: data.outcome.tableRating,
        outcomeFlatExtraPerThousand: data.outcome.flatExtraPerThousand,
        outcomeFlatExtraYears: data.outcome.flatExtraYears,
        outcomeReason: data.outcome.reason,
        outcomeConcerns: data.outcome.concerns,
      });
      toast.success("Rule created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create rule",
      );
    }
  };

  const handleUpdateRule = async (ruleId: string, data: RuleFormData) => {
    if (!selectedRuleSet) return;
    try {
      await updateRule.mutateAsync({
        id: ruleId,
        carrierId: selectedCarrierId,
        ruleSetId: selectedRuleSet.id,
        updates: {
          priority: data.priority,
          name: data.name,
          description: data.description || null,
          ageBandMin: data.ageBandMin,
          ageBandMax: data.ageBandMax,
          gender: data.gender,
          predicate: data.predicate,
          outcomeEligibility: data.outcome.eligibility,
          outcomeHealthClass: data.outcome.healthClass,
          outcomeTableRating: data.outcome.tableRating,
          outcomeFlatExtraPerThousand: data.outcome.flatExtraPerThousand,
          outcomeFlatExtraYears: data.outcome.flatExtraYears,
          outcomeReason: data.outcome.reason,
          outcomeConcerns: data.outcome.concerns,
        },
      });
      toast.success("Rule updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update rule",
      );
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedRuleSet) return;
    try {
      await deleteRule.mutateAsync({
        id: ruleId,
        carrierId: selectedCarrierId,
        ruleSetId: selectedRuleSet.id,
      });
      toast.success("Rule deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete rule",
      );
    }
  };

  const handleReorderRules = async (ruleIds: string[]) => {
    if (!selectedRuleSet) return;
    try {
      await reorderRules.mutateAsync({
        ruleSetId: selectedRuleSet.id,
        carrierId: selectedCarrierId,
        ruleIds,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder rules",
      );
    }
  };

  // Handle generate knockout rules
  const handleGenerateKnockout = async () => {
    if (!selectedCarrierId) return;
    try {
      const result = await generateKnockout.mutateAsync({
        carrierId: selectedCarrierId,
        strategy: generationStrategy,
      });
      if (result.success) {
        toast.success(
          `Generated ${result.created} knockout rule sets (${result.skipped} skipped)`,
        );
        setKnockoutDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to generate knockout rules");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate knockout rules",
      );
    }
  };

  // Handle generate age rules from products
  const handleGenerateAgeRules = async () => {
    if (!selectedCarrierId) return;
    try {
      const result = await generateAge.mutateAsync({
        carrierId: selectedCarrierId,
        strategy: generationStrategy,
      });
      if (result.success) {
        toast.success(
          `Generated ${result.created} age rule sets from ${result.productsProcessed} products (${result.skipped} skipped)`,
        );
        setAgeRulesDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to generate age rules");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate age rules",
      );
    }
  };

  // Loading state
  if (loadingCarriers) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isAnyMutating =
    createRuleSet.isPending ||
    updateRuleSet.isPending ||
    deleteRuleSet.isPending ||
    createRule.isPending ||
    updateRule.isPending ||
    deleteRule.isPending ||
    reorderRules.isPending ||
    generateKnockout.isPending ||
    generateAge.isPending;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Carrier Acceptance Rules
            </span>
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              Define carrier acceptance criteria with compound rules
            </span>
          </div>

          {/* Generate Rules Dropdown - only show when carrier is selected */}
          {selectedCarrierId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={isAnyMutating}
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Generate Rules
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] text-zinc-400">
                  Auto-Generate Draft Rules
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setKnockoutDialogOpen(true)}
                  className="text-[11px]"
                >
                  <AlertTriangle className="h-3 w-3 mr-2 text-red-500" />
                  <div>
                    <div>Knockout Rules</div>
                    <div className="text-[9px] text-zinc-400">
                      {knockoutCodes?.length ?? 0} conditions available
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setAgeRulesDialogOpen(true)}
                  className="text-[11px]"
                >
                  <Calendar className="h-3 w-3 mr-2 text-blue-500" />
                  <div>
                    <div>Age Rules from Products</div>
                    <div className="text-[9px] text-zinc-400">
                      Based on product min/max age
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Carrier Selector */}
        <div className="mt-2">
          <Select
            value={selectedCarrierId}
            onValueChange={setSelectedCarrierId}
          >
            <SelectTrigger className="w-full max-w-md h-7 text-[11px]">
              <SelectValue placeholder="Select a carrier to manage rules..." />
            </SelectTrigger>
            <SelectContent>
              {carriersList.map((carrier) => (
                <SelectItem
                  key={carrier.id}
                  value={carrier.id}
                  className="text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span>{carrier.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rule Sets List */}
      {selectedCarrierId ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 shadow-sm">
          <RuleSetList
            ruleSets={ruleSets || []}
            isLoading={loadingRuleSets}
            onSelect={handleSelectRuleSet}
            onCreate={handleCreateNew}
            onDelete={handleDeleteRuleSet}
            onToggleActive={handleToggleActive}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 text-center shadow-sm">
          <Shield className="h-10 w-10 mx-auto mb-3 text-zinc-200 dark:text-zinc-700" />
          <p className="text-[11px] font-medium text-zinc-500">
            Select a carrier to manage acceptance rules
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            Start with your most-used carriers: Mutual of Omaha, Baltimore Life,
            Transamerica
          </p>
        </div>
      )}

      {/* Rule Set Editor Sheet */}
      <RuleSetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        ruleSet={isCreating ? null : ruleSetDetail || selectedRuleSet}
        carrierId={selectedCarrierId}
        onSaveRuleSet={handleSaveRuleSet}
        onCreateRule={handleCreateRule}
        onUpdateRule={handleUpdateRule}
        onDeleteRule={handleDeleteRule}
        onReorderRules={handleReorderRules}
        isLoading={isAnyMutating || loadingDetail}
      />

      {/* Generate Knockout Rules Dialog */}
      <AlertDialog
        open={knockoutDialogOpen}
        onOpenChange={setKnockoutDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Generate Knockout Rules
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[11px] text-muted-foreground space-y-2">
                <p>
                  This will create <strong>draft</strong> rule sets for{" "}
                  {knockoutCodes?.length ?? 0} knockout conditions (AIDS/HIV,
                  ALS, Alzheimer's, etc.)
                </p>
                <p>
                  Knockout rules automatically decline or refer applicants with
                  specific high-risk conditions.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">
              If rule set already exists:
            </Label>
            <Select
              value={generationStrategy}
              onValueChange={(v) =>
                setGenerationStrategy(v as GenerationStrategy)
              }
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip_if_exists" className="text-[11px]">
                  Skip (don't overwrite)
                </SelectItem>
                <SelectItem value="create_new_draft" className="text-[11px]">
                  Create new version
                </SelectItem>
                <SelectItem value="upsert_draft" className="text-[11px]">
                  Update existing draft
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-400">
              Note: Approved rule sets are never modified.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-[10px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateKnockout}
              disabled={generateKnockout.isPending}
              className="h-7 text-[10px]"
            >
              {generateKnockout.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Knockout Rules"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Age Rules Dialog */}
      <AlertDialog
        open={ageRulesDialogOpen}
        onOpenChange={setAgeRulesDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Generate Age Rules from Products
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[11px] text-muted-foreground space-y-2">
                <p>
                  This will create <strong>draft</strong> rule sets based on the
                  min/max age defined in each product's metadata.
                </p>
                <p>
                  For example, if a product has min_age=18 and max_age=85, rules
                  will be created to decline applicants outside that range.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">
              If rule set already exists:
            </Label>
            <Select
              value={generationStrategy}
              onValueChange={(v) =>
                setGenerationStrategy(v as GenerationStrategy)
              }
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip_if_exists" className="text-[11px]">
                  Skip (don't overwrite)
                </SelectItem>
                <SelectItem value="create_new_draft" className="text-[11px]">
                  Create new version
                </SelectItem>
                <SelectItem value="upsert_draft" className="text-[11px]">
                  Update existing draft
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-400">
              Note: Approved rule sets are never modified.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-[10px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateAgeRules}
              disabled={generateAge.isPending}
              className="h-7 text-[10px]"
            >
              {generateAge.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Age Rules"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
