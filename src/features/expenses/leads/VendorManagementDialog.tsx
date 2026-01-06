// src/features/expenses/leads/VendorManagementDialog.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Edit,
  Power,
  Merge,
  Loader2,
  Building2,
  Users,
  DollarSign,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  useLeadVendorsWithStats,
  useUpdateLeadVendor,
  useToggleVendorActive,
} from "@/hooks/lead-purchases";
import type {
  VendorWithStats,
  UpdateLeadVendorData,
} from "@/types/lead-purchase.types";
import { toast } from "sonner";
import { VendorMergeDialog } from "./VendorMergeDialog";

interface VendorManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorManagementDialog({
  open,
  onOpenChange,
}: VendorManagementDialogProps) {
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [editingVendor, setEditingVendor] = useState<VendorWithStats | null>(
    null,
  );
  const [editForm, setEditForm] = useState({ name: "", contactEmail: "" });
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const { data: vendors = [], isLoading } =
    useLeadVendorsWithStats(showInactive);
  const updateVendor = useUpdateLeadVendor();
  const toggleActive = useToggleVendorActive();

  // Filter vendors by search term
  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.contactEmail &&
        v.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleSelectVendor = (vendorId: string, checked: boolean) => {
    if (checked) {
      setSelectedVendors((prev) => [...prev, vendorId]);
    } else {
      setSelectedVendors((prev) => prev.filter((id) => id !== vendorId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVendors(filteredVendors.map((v) => v.id));
    } else {
      setSelectedVendors([]);
    }
  };

  const handleStartEdit = (vendor: VendorWithStats) => {
    setEditingVendor(vendor);
    setEditForm({
      name: vendor.name,
      contactEmail: vendor.contactEmail || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingVendor(null);
    setEditForm({ name: "", contactEmail: "" });
  };

  const handleSaveEdit = async () => {
    if (!editingVendor) return;

    try {
      const updateData: UpdateLeadVendorData = {
        name: editForm.name.trim(),
      };
      if (editForm.contactEmail.trim()) {
        updateData.contactEmail = editForm.contactEmail.trim();
      }

      await updateVendor.mutateAsync({
        id: editingVendor.id,
        data: updateData,
      });
      toast.success("Vendor updated successfully");
      handleCancelEdit();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update vendor",
      );
    }
  };

  const handleToggleActive = async (vendor: VendorWithStats) => {
    try {
      await toggleActive.mutateAsync({
        id: vendor.id,
        isActive: !vendor.isActive,
      });
      toast.success(
        vendor.isActive ? "Vendor deactivated" : "Vendor activated",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update vendor status",
      );
    }
  };

  const handleMergeSelected = () => {
    if (selectedVendors.length < 2) {
      toast.error("Select at least 2 vendors to merge");
      return;
    }
    setShowMergeDialog(true);
  };

  const handleMergeComplete = () => {
    setShowMergeDialog(false);
    setSelectedVendors([]);
  };

  const selectedVendorObjects = vendors.filter((v) =>
    selectedVendors.includes(v.id),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Vendor Management
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 w-48 pl-7 text-xs"
                />
              </div>

              {/* Show inactive toggle */}
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={showInactive}
                  onCheckedChange={(checked) =>
                    setShowInactive(checked === true)
                  }
                  className="h-3 w-3"
                />
                Show inactive
              </label>
            </div>

            <div className="flex items-center gap-2">
              {selectedVendors.length > 0 && (
                <>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedVendors.length} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    onClick={handleMergeSelected}
                    disabled={selectedVendors.length < 2}
                  >
                    <Merge className="h-3 w-3 mr-1" />
                    Merge
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Building2 className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-[11px] text-muted-foreground">
                  {searchTerm
                    ? "No vendors match your search"
                    : "No vendors found"}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="w-8 px-2 py-1.5">
                      <Checkbox
                        checked={
                          selectedVendors.length === filteredVendors.length &&
                          filteredVendors.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                        className="h-3 w-3"
                      />
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">
                      Vendor Name
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">
                      Contact
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="h-3 w-3" />
                        Users
                      </div>
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">
                      Purchases
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3" />
                        Total Spent
                      </div>
                    </th>
                    <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="w-10 px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className={cn(
                        "hover:bg-zinc-50 dark:hover:bg-zinc-800/30",
                        !vendor.isActive && "opacity-50",
                      )}
                    >
                      <td className="px-2 py-2">
                        <Checkbox
                          checked={selectedVendors.includes(vendor.id)}
                          onCheckedChange={(checked) =>
                            handleSelectVendor(vendor.id, checked === true)
                          }
                          className="h-3 w-3"
                        />
                      </td>
                      <td className="px-2 py-2">
                        {editingVendor?.id === vendor.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="h-6 text-xs"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {vendor.name}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {editingVendor?.id === vendor.id ? (
                          <Input
                            value={editForm.contactEmail}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                contactEmail: e.target.value,
                              }))
                            }
                            placeholder="Email"
                            className="h-6 text-xs"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {vendor.contactEmail || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {vendor.uniqueUsers}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {vendor.totalPurchases}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatCurrency(vendor.totalSpent)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-medium",
                            vendor.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
                          )}
                        >
                          {vendor.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {editingVendor?.id === vendor.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={handleSaveEdit}
                              disabled={updateVendor.isPending}
                            >
                              {updateVendor.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 text-emerald-500" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => handleStartEdit(vendor)}
                                className="text-[11px]"
                              >
                                <Edit className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(vendor)}
                                className="text-[11px]"
                              >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                {vendor.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-muted-foreground">
              {filteredVendors.length} vendor
              {filteredVendors.length !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 text-[10px]"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VendorMergeDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        vendors={selectedVendorObjects}
        onMergeComplete={handleMergeComplete}
      />
    </>
  );
}
