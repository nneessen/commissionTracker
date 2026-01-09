// src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx

import { useState, useEffect, useRef } from "react";
import { Plus, Save, TreeDeciduous, Undo2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import RuleBuilder from "./RuleBuilder";
import type {
  DecisionTree,
  DecisionTreeRule,
  DecisionTreeRules,
} from "../../types/underwriting.types";
import {
  useDecisionTree,
  useUpdateDecisionTree,
  useCreateDecisionTree,
  useHealthConditions,
  useCarriersWithProducts,
} from "../../hooks";

interface DecisionTreeEditorProps {
  treeId?: string;
  onSaved?: (tree: DecisionTree) => void;
  onCancel?: () => void;
}

// Counter for generating unique rule IDs
let ruleIdCounter = 0;

function generateRuleId(): string {
  ruleIdCounter += 1;
  return `rule_${Date.now()}_${ruleIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyRule(): DecisionTreeRule {
  return {
    id: generateRuleId(),
    name: "New Rule",
    conditions: { all: [] },
    recommendations: [],
    isActive: true,
  };
}

export default function DecisionTreeEditor({
  treeId,
  onSaved,
  onCancel,
}: DecisionTreeEditorProps) {
  const isEditMode = !!treeId;

  // Fetch existing tree if editing
  const { data: existingTree, isLoading: isLoadingTree } =
    useDecisionTree(treeId);

  // Mutations
  const createMutation = useCreateDecisionTree();
  const updateMutation = useUpdateDecisionTree();

  // Fetch carriers with products for rule actions (with limit)
  const { data: carriers = [], isLoading: isLoadingCarriers } =
    useCarriersWithProducts(100);

  // Fetch health conditions for condition options
  const { data: healthConditions = [], isLoading: isLoadingConditions } =
    useHealthConditions();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<DecisionTreeRule[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (existingTree) {
      setName(existingTree.name);
      setDescription(existingTree.description || "");
      const treeRules = existingTree.rules as unknown as DecisionTreeRules;
      setRules(treeRules?.rules || []);
      setHasUnsavedChanges(false);
    }
  }, [existingTree]);

  // Track changes using a ref for the original rules to avoid expensive comparisons
  const originalRulesRef = useRef<DecisionTreeRule[]>([]);
  const _rulesChangeCountRef = useRef(0);

  // Store original rules when tree loads (only once)
  useEffect(() => {
    if (existingTree) {
      const treeRules = existingTree.rules as unknown as DecisionTreeRules;
      originalRulesRef.current = treeRules?.rules || [];
    }
  }, [existingTree]);

  // Track changes incrementally - use rulesChangeCountRef to detect any rule modification
  useEffect(() => {
    if (isEditMode && existingTree) {
      // Check basic field changes first (cheap)
      const basicFieldsChanged =
        name !== existingTree.name ||
        description !== (existingTree.description || "");

      // Check rules count change (cheap)
      const rulesCountChanged =
        rules.length !== originalRulesRef.current.length;

      // Only do deep comparison if counts match and no basic changes
      let rulesContentChanged = false;
      if (!basicFieldsChanged && !rulesCountChanged) {
        // Compare rule IDs and basic properties without full serialization
        rulesContentChanged = rules.some((rule, idx) => {
          const original = originalRulesRef.current[idx];
          if (!original) return true;
          return (
            rule.id !== original.id ||
            rule.name !== original.name ||
            rule.isActive !== original.isActive ||
            rule.conditions.all?.length !== original.conditions.all?.length ||
            rule.conditions.any?.length !== original.conditions.any?.length ||
            rule.recommendations.length !== original.recommendations.length
          );
        });
      }

      setHasUnsavedChanges(
        basicFieldsChanged || rulesCountChanged || rulesContentChanged,
      );
    } else if (!isEditMode) {
      setHasUnsavedChanges(name.length > 0 || rules.length > 0);
    }
  }, [name, description, rules, existingTree, isEditMode]);

  // Format health conditions for condition row
  const formattedConditions = healthConditions.map((c) => ({
    code: c.code,
    name: c.name,
  }));

  // Store pending delete rule ID
  const [pendingDeleteRuleId, setPendingDeleteRuleId] = useState<string | null>(
    null,
  );

  // Handlers
  const handleAddRule = () => {
    setRules((prev) => [...prev, createEmptyRule()]);
  };

  const handleUpdateRule = (ruleId: string, updated: DecisionTreeRule) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
  };

  const handleDeleteRule = (ruleId: string) => {
    setPendingDeleteRuleId(ruleId);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateRule = (ruleId: string) => {
    setRules((prev) => {
      const index = prev.findIndex((r) => r.id === ruleId);
      if (index === -1) return prev;
      const ruleToDuplicate = prev[index];
      const duplicated: DecisionTreeRule = {
        ...ruleToDuplicate,
        id: generateRuleId(),
        name: `${ruleToDuplicate.name} (Copy)`,
      };
      return [
        ...prev.slice(0, index + 1),
        duplicated,
        ...prev.slice(index + 1),
      ];
    });
  };

  const confirmDeleteRule = () => {
    if (pendingDeleteRuleId !== null) {
      setRules((prev) => prev.filter((r) => r.id !== pendingDeleteRuleId));
    }
    setDeleteDialogOpen(false);
    setPendingDeleteRuleId(null);
  };

  const cancelDeleteRule = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteRuleId(null);
  };

  const handleResetChanges = () => {
    if (existingTree) {
      setName(existingTree.name);
      setDescription(existingTree.description || "");
      const treeRules = existingTree.rules as unknown as DecisionTreeRules;
      setRules(treeRules?.rules || []);
      setHasUnsavedChanges(false);
    } else {
      setName("");
      setDescription("");
      setRules([]);
      setHasUnsavedChanges(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    const rulesData: DecisionTreeRules = { rules };

    try {
      let savedTree: DecisionTree;

      if (isEditMode && treeId) {
        savedTree = await updateMutation.mutateAsync({
          id: treeId,
          name: name.trim(),
          description: description.trim() || undefined,
          rules: rulesData,
        });
      } else {
        savedTree = await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          rules: rulesData,
        });
      }

      setHasUnsavedChanges(false);
      onSaved?.(savedTree);
    } catch {
      // Error handled by mutation
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingTree || isLoadingCarriers || isLoadingConditions;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LogoSpinner size="lg" />
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Loading editor...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-3">
          <TreeDeciduous className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditMode ? "Edit Decision Tree" : "New Decision Tree"}
          </h2>
          {hasUnsavedChanges && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Health Rules"
              className="h-8 text-[12px] mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="h-8 text-[12px] mt-1"
            />
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {carriers.length === 0 && (
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-[11px] text-amber-700 dark:text-amber-300">
              No carriers found. Add carriers with products before creating
              rules.
            </AlertDescription>
          </Alert>
        )}

        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <TreeDeciduous className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              No rules yet
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mb-4">
              Create rules to automatically match clients with recommended
              carriers and products based on their profile.
            </p>
            <Button
              onClick={handleAddRule}
              size="sm"
              className="h-7 text-[11px]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Rule
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {rules.length} rule{rules.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRule}
                className="h-6 text-[10px] px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Rule
              </Button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, index) => (
                <RuleBuilder
                  key={rule.id}
                  ruleId={rule.id}
                  rule={rule}
                  index={index}
                  onUpdate={handleUpdateRule}
                  onDelete={handleDeleteRule}
                  onDuplicate={handleDuplicateRule}
                  carriers={carriers}
                  healthConditions={formattedConditions}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 text-[11px]"
            >
              Cancel
            </Button>
          )}
          {hasUnsavedChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetChanges}
              className="h-7 text-[11px] text-zinc-500"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          size="sm"
          className="h-7 text-[11px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Create Tree"}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteRule}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRule}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
