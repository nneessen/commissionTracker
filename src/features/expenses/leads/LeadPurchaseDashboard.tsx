// src/features/expenses/leads/LeadPurchaseDashboard.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  useLeadPurchases,
  useLeadPurchaseStats,
  useLeadStatsByVendor,
  useCreateLeadPurchase,
  useUpdateLeadPurchase,
  useDeleteLeadPurchase,
} from "@/hooks/lead-purchases";
import { LeadPurchaseDialog } from "./LeadPurchaseDialog";
import { LeadVendorDialog } from "./LeadVendorDialog";
import { useCreateLeadVendor } from "@/hooks/lead-purchases";
import { toast } from "sonner";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
} from "@/types/lead-purchase.types";

export function LeadPurchaseDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<LeadPurchase | null>(
    null,
  );

  const { data: purchases = [], isLoading } = useLeadPurchases();
  const { data: stats } = useLeadPurchaseStats();
  const { data: vendorStats = [] } = useLeadStatsByVendor();

  const createPurchase = useCreateLeadPurchase();
  const updatePurchase = useUpdateLeadPurchase();
  const deletePurchase = useDeleteLeadPurchase();
  const createVendor = useCreateLeadVendor();

  const handleSave = async (data: CreateLeadPurchaseData) => {
    try {
      if (selectedPurchase) {
        await updatePurchase.mutateAsync({ id: selectedPurchase.id, data });
        toast.success("Lead purchase updated!");
      } else {
        await createPurchase.mutateAsync(data);
        toast.success("Lead purchase added!");
      }
      setIsDialogOpen(false);
      setSelectedPurchase(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save purchase",
      );
    }
  };

  const handleDelete = async (purchase: LeadPurchase) => {
    if (confirm("Delete this lead purchase?")) {
      try {
        await deletePurchase.mutateAsync(purchase.id);
        toast.success("Lead purchase deleted!");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete",
        );
      }
    }
  };

  const handleAddVendor = async (data: { name: string }) => {
    try {
      await createVendor.mutateAsync(data);
      setIsVendorDialogOpen(false);
      toast.success("Vendor added!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add vendor",
      );
    }
  };

  return (
    <>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Lead Purchases
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Track life insurance lead pack ROI
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setIsVendorDialogOpen(true)}
            >
              <Building2 className="h-3 w-3 mr-1" />
              Vendors
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => {
                setSelectedPurchase(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Purchase
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] text-muted-foreground">
                  Total Leads
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {stats.totalLeads.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">
                from {stats.totalPurchases} purchases
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] text-muted-foreground">
                  Total Spent
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(stats.totalSpent)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                ${stats.avgCostPerLead.toFixed(2)}/lead avg
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">
                  Conversion
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {formatPercent(stats.conversionRate)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {stats.totalPolicies} policies sold
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                {stats.avgRoi >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  Avg ROI
                </span>
              </div>
              <div
                className={cn(
                  "text-lg font-bold",
                  stats.avgRoi >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {stats.avgRoi >= 0 ? "+" : ""}
                {stats.avgRoi.toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatCurrency(stats.totalCommission)} earned
              </div>
            </div>
          </div>
        )}

        {/* Vendor Performance */}
        {vendorStats.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Vendor Performance
            </div>
            <div className="grid grid-cols-3 gap-2">
              {vendorStats.slice(0, 6).map((vendor) => (
                <div
                  key={vendor.vendorId}
                  className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-2"
                >
                  <div className="text-xs font-medium truncate">
                    {vendor.vendorName}
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {vendor.totalLeads} leads
                    </span>
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold",
                        vendor.avgRoi >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {vendor.avgRoi >= 0 ? "+" : ""}
                      {vendor.avgRoi.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchases Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Purchases
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                    Vendor
                  </th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                    Leads
                  </th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                    Cost
                  </th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                    $/Lead
                  </th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                    Sold
                  </th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                    ROI
                  </th>
                  <th className="w-8 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No lead purchases yet. Click "Add Purchase" to get
                      started.
                    </td>
                  </tr>
                ) : (
                  purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {new Date(purchase.purchaseDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {purchase.vendor?.name || "Unknown"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium",
                            purchase.leadFreshness === "fresh"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                          )}
                        >
                          {purchase.leadFreshness === "fresh"
                            ? "Fresh"
                            : "Aged"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {purchase.leadCount}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(purchase.totalCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        ${purchase.costPerLead.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {purchase.policiesSold}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={cn(
                            "font-mono font-semibold",
                            purchase.roiPercentage >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {purchase.roiPercentage >= 0 ? "+" : ""}
                          {purchase.roiPercentage.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(purchase)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LeadPurchaseDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onSave={handleSave}
        isLoading={createPurchase.isPending || updatePurchase.isPending}
      />

      <LeadVendorDialog
        open={isVendorDialogOpen}
        onOpenChange={setIsVendorDialogOpen}
        onSave={handleAddVendor}
        isLoading={createVendor.isPending}
      />
    </>
  );
}
