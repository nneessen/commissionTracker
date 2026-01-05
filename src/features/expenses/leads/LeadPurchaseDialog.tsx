// src/features/expenses/leads/LeadPurchaseDialog.tsx

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, DollarSign } from "lucide-react";
import { useLeadVendors } from "@/hooks/lead-purchases";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
  LeadFreshness,
  LeadVendor,
} from "@/types/lead-purchase.types";
import { LeadVendorDialog } from "./LeadVendorDialog";
import { useCreateLeadVendor } from "@/hooks/lead-purchases";
import { toast } from "sonner";

interface LeadPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase?: LeadPurchase | null;
  onSave: (data: CreateLeadPurchaseData) => Promise<void>;
  isLoading?: boolean;
}

export function LeadPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  onSave,
  isLoading = false,
}: LeadPurchaseDialogProps) {
  const { data: vendors = [] } = useLeadVendors();
  const createVendor = useCreateLeadVendor();
  const [showVendorDialog, setShowVendorDialog] = useState(false);

  const [formData, setFormData] = useState({
    vendorId: "",
    purchaseName: "",
    leadFreshness: "fresh" as LeadFreshness,
    leadCount: "",
    totalCost: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    policiesSold: "0",
    commissionEarned: "0",
    notes: "",
  });

  useEffect(() => {
    if (purchase) {
      setFormData({
        vendorId: purchase.vendorId,
        purchaseName: purchase.purchaseName || "",
        leadFreshness: purchase.leadFreshness,
        leadCount: String(purchase.leadCount),
        totalCost: String(purchase.totalCost),
        purchaseDate: purchase.purchaseDate,
        policiesSold: String(purchase.policiesSold),
        commissionEarned: String(purchase.commissionEarned),
        notes: purchase.notes || "",
      });
    } else {
      setFormData({
        vendorId: "",
        purchaseName: "",
        leadFreshness: "fresh",
        leadCount: "",
        totalCost: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        policiesSold: "0",
        commissionEarned: "0",
        notes: "",
      });
    }
  }, [purchase, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      vendorId: formData.vendorId,
      purchaseName: formData.purchaseName.trim() || null,
      leadFreshness: formData.leadFreshness,
      leadCount: parseInt(formData.leadCount, 10),
      totalCost: parseFloat(formData.totalCost),
      purchaseDate: formData.purchaseDate,
      policiesSold: parseInt(formData.policiesSold, 10) || 0,
      commissionEarned: parseFloat(formData.commissionEarned) || 0,
      notes: formData.notes.trim() || null,
    });
  };

  const handleAddVendor = async (data: { name: string }) => {
    try {
      const newVendor = await createVendor.mutateAsync(data);
      setFormData({ ...formData, vendorId: newVendor.id });
      setShowVendorDialog(false);
      toast.success("Vendor added successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add vendor",
      );
    }
  };

  // Calculate cost per lead
  const leadCount = parseInt(formData.leadCount, 10) || 0;
  const totalCost = parseFloat(formData.totalCost) || 0;
  const costPerLead = leadCount > 0 ? totalCost / leadCount : 0;

  // Calculate ROI
  const commissionEarned = parseFloat(formData.commissionEarned) || 0;
  const roi =
    totalCost > 0 ? ((commissionEarned - totalCost) / totalCost) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {purchase ? "Edit Lead Purchase" : "Add Lead Purchase"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Vendor Selection */}
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Vendor <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-1">
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendorId: value })
                  }
                  required
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor: LeadVendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setShowVendorDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Purchase Name & Freshness */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Purchase Name
                </Label>
                <Input
                  value={formData.purchaseName}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaseName: e.target.value })
                  }
                  className="h-8 text-xs"
                  placeholder="e.g., March 2024 Pack"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Lead Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.leadFreshness}
                  onValueChange={(value: LeadFreshness) =>
                    setFormData({ ...formData, leadFreshness: value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">Fresh (High-Intent)</SelectItem>
                    <SelectItem value="aged">Aged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lead Count & Total Cost */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  # of Leads <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.leadCount}
                  onChange={(e) =>
                    setFormData({ ...formData, leadCount: e.target.value })
                  }
                  required
                  className="h-8 text-xs"
                  placeholder="50"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Total Cost <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalCost}
                    onChange={(e) =>
                      setFormData({ ...formData, totalCost: e.target.value })
                    }
                    required
                    className="h-8 text-xs pl-6"
                    placeholder="500.00"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Cost/Lead
                </Label>
                <div className="h-8 flex items-center px-2 bg-muted/30 rounded-md text-xs font-mono">
                  ${costPerLead.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Purchase Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value })
                }
                required
                className="h-8 text-xs"
              />
            </div>

            {/* ROI Tracking Section */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                ROI Tracking
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    Policies Sold
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.policiesSold}
                    onChange={(e) =>
                      setFormData({ ...formData, policiesSold: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    Commission Earned
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.commissionEarned}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionEarned: e.target.value,
                        })
                      }
                      className="h-8 text-xs pl-6"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    ROI
                  </Label>
                  <div
                    className={`h-8 flex items-center px-2 rounded-md text-xs font-mono font-semibold ${
                      roi >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {roi >= 0 ? "+" : ""}
                    {roi.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-[11px] text-muted-foreground">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="h-12 text-xs resize-none"
                placeholder="Any notes about this lead pack..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {purchase ? "Update" : "Add Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LeadVendorDialog
        open={showVendorDialog}
        onOpenChange={setShowVendorDialog}
        onSave={handleAddVendor}
        isLoading={createVendor.isPending}
      />
    </>
  );
}
