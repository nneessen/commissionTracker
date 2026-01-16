// src/features/policies/components/LeadPurchaseLinkDialog.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useLeadPurchases } from "@/hooks/lead-purchases";
import { useUpdatePolicyLeadSource } from "@/features/policies/hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Policy } from "@/types/policy.types";

interface LeadPurchaseLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
  onLinked?: () => void;
}

export function LeadPurchaseLinkDialog({
  open,
  onOpenChange,
  policy,
  onLinked,
}: LeadPurchaseLinkDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: purchases = [], isLoading } = useLeadPurchases();
  const updateLeadSource = useUpdatePolicyLeadSource();

  const handleLink = async () => {
    if (!policy || !selectedId) return;

    try {
      await updateLeadSource.mutateAsync({
        policyId: policy.id,
        leadSourceType: "lead_purchase",
        leadPurchaseId: selectedId,
      });
      toast.success("Policy linked to lead purchase");
      setSelectedId(null);
      onOpenChange(false);
      onLinked?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link policy",
      );
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Link to Lead Purchase
          </DialogTitle>
        </DialogHeader>

        {policy && (
          <div className="text-sm text-muted-foreground mb-2">
            Linking:{" "}
            <span className="font-medium text-foreground">
              {policy.client?.name}
            </span>
            {policy.policyNumber && ` (#${policy.policyNumber})`}
          </div>
        )}

        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Select Lead Purchase</span>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-background">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : purchases.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="divide-y divide-border">
                  {purchases.map((purchase) => (
                    <button
                      key={purchase.id}
                      type="button"
                      onClick={() => setSelectedId(purchase.id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                        selectedId === purchase.id
                          ? "bg-accent"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {purchase.vendor?.name || "Unknown Vendor"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {purchase.purchaseName &&
                            `${purchase.purchaseName} · `}
                          {purchase.leadCount} leads · $
                          {purchase.totalCost.toLocaleString()}
                        </div>
                      </div>
                      {selectedId === purchase.id && (
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="px-3 py-8 text-center">
                <ShoppingCart className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No lead purchases found
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="warning"
            disabled={!selectedId || updateLeadSource.isPending}
            onClick={handleLink}
          >
            {updateLeadSource.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Link Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
