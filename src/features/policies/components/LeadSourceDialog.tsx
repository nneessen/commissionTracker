// src/features/policies/components/LeadSourceDialog.tsx
// Dialog shown after policy submission to track lead source for ROI

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Gift, HelpCircle, Plus, Loader2, Check } from "lucide-react";
import { LeadPurchaseSelector } from "./LeadPurchaseSelector";
import { ManageLeadPurchaseDialog } from "@/features/expenses";
import { useUpdatePolicyLeadSource } from "../hooks";
import {
  useCreateLeadPurchase,
  useLeadPurchases,
} from "@/hooks/lead-purchases";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
} from "@/types/lead-purchase.types";
import type { LeadSourceType } from "@/types/policy.types";

interface LeadSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  policyNumber: string | null;
  onComplete: () => void;
}

type SourceOption = "lead_purchase" | "free_lead" | "other" | "skip";

export function LeadSourceDialog({
  open,
  onOpenChange: _onOpenChange,
  policyId,
  policyNumber,
  onComplete,
}: LeadSourceDialogProps) {
  const [sourceOption, setSourceOption] = useState<SourceOption | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<LeadPurchase | null>(
    null,
  );
  const [showAddPurchaseDialog, setShowAddPurchaseDialog] = useState(false);

  const updateLeadSource = useUpdatePolicyLeadSource();
  const createLeadPurchase = useCreateLeadPurchase();
  // Prefetch purchases for child components
  useLeadPurchases();

  const isSubmitting = updateLeadSource.isPending;

  const handleSave = async () => {
    if (!sourceOption || sourceOption === "skip") {
      onComplete();
      return;
    }

    try {
      let leadSourceType: LeadSourceType | null = null;
      let leadPurchaseId: string | null = null;

      if (sourceOption === "lead_purchase") {
        if (!selectedPurchase) {
          toast.error("Please select a lead purchase");
          return;
        }
        leadSourceType = "lead_purchase";
        leadPurchaseId = selectedPurchase.id;
      } else if (sourceOption === "free_lead") {
        leadSourceType = "free_lead";
      } else if (sourceOption === "other") {
        leadSourceType = "other";
      }

      await updateLeadSource.mutateAsync({
        policyId,
        leadSourceType,
        leadPurchaseId,
      });

      if (leadSourceType === "lead_purchase") {
        toast.success("Policy linked to lead purchase for ROI tracking");
      } else {
        toast.success("Lead source recorded");
      }

      onComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update lead source",
      );
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAddPurchase = async (data: CreateLeadPurchaseData) => {
    try {
      const newPurchase = await createLeadPurchase.mutateAsync(data);
      setSelectedPurchase(newPurchase);
      setSourceOption("lead_purchase");
      setShowAddPurchaseDialog(false);
      toast.success("Lead purchase added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add lead purchase",
      );
    }
  };

  const handleDismiss = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      onComplete();
    }
  };

  const handleOptionSelect = (option: SourceOption) => {
    setSourceOption(option);
    if (option !== "lead_purchase") {
      setSelectedPurchase(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDismiss}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40">
                <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </span>
              Track Lead Source
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              {policyNumber
                ? `Link policy ${policyNumber} to its lead source`
                : "Link this policy to its lead source"}
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 py-3 space-y-1.5">
            {/* Option: From Lead Purchase */}
            <OptionButton
              selected={sourceOption === "lead_purchase"}
              onClick={() => handleOptionSelect("lead_purchase")}
              icon={Package}
              label="Lead Purchase"
              description="From a purchased lead pack"
              colorClass="info"
            />

            {/* Expanded section for lead purchase selection */}
            {sourceOption === "lead_purchase" && (
              <div className="ml-6 pl-2 border-l-2 border-blue-300 dark:border-blue-700/60">
                <LeadPurchaseSelector
                  selectedId={selectedPurchase?.id}
                  onSelect={setSelectedPurchase}
                  className="mt-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 h-7 text-xs w-full justify-start text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => setShowAddPurchaseDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add New Lead Pack
                </Button>
              </div>
            )}

            {/* Option: Free / Hand-me-down */}
            <OptionButton
              selected={sourceOption === "free_lead"}
              onClick={() => handleOptionSelect("free_lead")}
              icon={Gift}
              label="Free Lead"
              description="Hand-me-down from upline/agent"
              colorClass="success"
            />

            {/* Option: Other */}
            <OptionButton
              selected={sourceOption === "other"}
              onClick={() => handleOptionSelect("other")}
              icon={HelpCircle}
              label="Other Source"
              description="Referral, organic, etc."
              colorClass="neutral"
            />
          </div>

          <DialogFooter className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex-row justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="h-7 text-xs text-muted-foreground"
            >
              Skip
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                isSubmitting ||
                !sourceOption ||
                (sourceOption === "lead_purchase" && !selectedPurchase)
              }
              className="h-7 text-xs px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Purchase Dialog */}
      <ManageLeadPurchaseDialog
        open={showAddPurchaseDialog}
        onOpenChange={setShowAddPurchaseDialog}
        onSave={handleAddPurchase}
        isLoading={createLeadPurchase.isPending}
      />
    </>
  );
}

type ColorClass = "info" | "success" | "neutral";

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  colorClass: ColorClass;
}

const colorStyles: Record<
  ColorClass,
  {
    selectedBg: string;
    selectedBorder: string;
    selectedRing: string;
    iconBg: string;
    iconColor: string;
    radioSelected: string;
  }
> = {
  info: {
    selectedBg: "bg-blue-50 dark:bg-blue-950/30",
    selectedBorder: "border-blue-200 dark:border-blue-800",
    selectedRing: "ring-1 ring-blue-200/60 dark:ring-blue-800/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    radioSelected:
      "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500",
  },
  success: {
    selectedBg: "bg-emerald-50 dark:bg-emerald-950/30",
    selectedBorder: "border-emerald-200 dark:border-emerald-800",
    selectedRing: "ring-1 ring-emerald-200/60 dark:ring-emerald-800/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    radioSelected:
      "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500",
  },
  neutral: {
    selectedBg: "bg-zinc-100 dark:bg-zinc-800/50",
    selectedBorder: "border-zinc-300 dark:border-zinc-700",
    selectedRing: "ring-1 ring-zinc-200/60 dark:ring-zinc-700/40",
    iconBg: "bg-zinc-200 dark:bg-zinc-700/50",
    iconColor: "text-zinc-600 dark:text-zinc-400",
    radioSelected:
      "border-zinc-600 bg-zinc-600 dark:border-zinc-400 dark:bg-zinc-400",
  },
};

function OptionButton({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  colorClass,
}: OptionButtonProps) {
  const colors = colorStyles[colorClass];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left border transition-all duration-150",
        selected
          ? `${colors.selectedBg} ${colors.selectedBorder} ${colors.selectedRing}`
          : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/60",
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
          selected
            ? `${colors.radioSelected} text-white`
            : "border-muted-foreground/40",
        )}
      >
        {selected && <Check className="h-2.5 w-2.5" />}
      </div>

      {/* Icon in tinted pill */}
      <div
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
          selected ? colors.iconBg : "bg-zinc-100 dark:bg-zinc-800",
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            selected ? colors.iconColor : "text-muted-foreground",
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-xs font-medium",
            selected ? "text-foreground" : "text-foreground/80",
          )}
        >
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {description}
        </div>
      </div>
    </button>
  );
}
