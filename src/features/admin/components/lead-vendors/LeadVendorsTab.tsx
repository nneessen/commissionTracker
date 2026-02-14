// src/features/admin/components/lead-vendors/LeadVendorsTab.tsx

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useLeadVendorAdminOverview,
  useLeadPackList,
  usePackHeatScores,
} from "@/hooks/lead-purchases";
import { VendorSummaryBar } from "./VendorSummaryBar";
import { LeadPackTable } from "./LeadPackTable";
import { RecentPoliciesTable } from "./RecentPoliciesTable";

type FreshnessTab = "all" | "fresh" | "aged";

export function LeadVendorsTab() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FreshnessTab>("all");

  const { data: vendors } = useLeadVendorAdminOverview(
    startDate || undefined,
    endDate || undefined,
  );

  const { data: freshPacks, isLoading: freshLoading } = useLeadPackList(
    "fresh",
    startDate || undefined,
    endDate || undefined,
  );

  const { data: agedPacks, isLoading: agedLoading } = useLeadPackList(
    "aged",
    startDate || undefined,
    endDate || undefined,
  );

  const { packScores, isLoading: heatLoading } = usePackHeatScores();

  const tabs: { key: FreshnessTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "fresh", label: "Fresh" },
    { key: "aged", label: "Aged" },
  ];

  return (
    <div className="space-y-3">
      {/* Header: Title, Date Filters, Search, Tab Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Lead Vendors
          </h2>
          <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-zinc-500 uppercase">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-6 text-[11px] w-[120px] px-1.5"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-zinc-500 uppercase">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-6 text-[11px] w-[120px] px-1.5"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <Input
              placeholder="Search packs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-6 text-[11px] w-[160px] pl-6"
            />
          </div>
        </div>
      </div>

      {/* Recent Policies Sold */}
      <RecentPoliciesTable />

      {/* Vendor Summary Bar */}
      {vendors && <VendorSummaryBar vendors={vendors} />}

      {/* Pack Tables */}
      {(activeTab === "all" || activeTab === "fresh") && (
        <LeadPackTable
          packs={freshPacks}
          isLoading={freshLoading || heatLoading}
          title="Fresh Lead Packs"
          heatScores={packScores}
          searchTerm={searchTerm}
        />
      )}

      {(activeTab === "all" || activeTab === "aged") && (
        <LeadPackTable
          packs={agedPacks}
          isLoading={agedLoading || heatLoading}
          title="Aged Lead Packs"
          heatScores={packScores}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
}
