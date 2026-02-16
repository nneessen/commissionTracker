// src/features/admin/components/lead-vendors/LeadKpiTabs.tsx

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type { HeatLevel, LeadPackRow, LeadRecentPolicy, PackHeatMetrics, VendorAdminOverview } from "@/types/lead-purchase.types";

import type { FreshAgedAggregates, VendorIntelligenceRow } from "./LeadIntelligenceDashboard";
import { MarketPulse } from "./MarketPulse";
import { HeatDistribution } from "./HeatDistribution";
import { FreshVsAgedPanel } from "./FreshVsAgedPanel";
import { ConversionPanel } from "./ConversionPanel";
import { SpeedPanel } from "./SpeedPanel";
import { TopPerformersPanel } from "./TopPerformersPanel";

interface PortfolioMetrics {
  totalSpend: number;
  totalLeads: number;
  totalPolicies: number;
  totalCommission: number;
  totalPremium: number;
  convRate: number;
  roi: number;
  cpl: number;
}

interface LeadKpiTabsProps {
  portfolioMetrics: PortfolioMetrics;
  packCount: number;
  heatDistribution: Record<HeatLevel, number>;
  vendorRowCount: number;
  freshAgedAggregates: FreshAgedAggregates;
  filteredPacks: LeadPackRow[];
  recentPolicies: LeadRecentPolicy[];
  vendors: VendorAdminOverview[];
  packMetrics: PackHeatMetrics[];
  allPacks: LeadPackRow[];
  vendorIntelligenceRows: VendorIntelligenceRow[];
}

export function LeadKpiTabs({
  portfolioMetrics,
  packCount,
  heatDistribution,
  vendorRowCount,
  freshAgedAggregates,
  filteredPacks,
  recentPolicies,
  vendors,
  packMetrics,
  allPacks,
  vendorIntelligenceRows,
}: LeadKpiTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList variant="segment" size="sm" className="w-fit">
        <TabsTrigger value="overview" variant="segment" size="sm">
          Overview
        </TabsTrigger>
        <TabsTrigger value="conversion" variant="segment" size="sm">
          Conversion
        </TabsTrigger>
        <TabsTrigger value="speed" variant="segment" size="sm">
          Speed
        </TabsTrigger>
        <TabsTrigger value="performers" variant="segment" size="sm">
          Top Performers
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-3">
          <MarketPulse metrics={portfolioMetrics} packCount={packCount} />
          <div className="space-y-3">
            <HeatDistribution counts={heatDistribution} total={vendorRowCount} />
            <FreshVsAgedPanel aggregates={freshAgedAggregates} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="conversion" className="mt-2">
        <ConversionPanel
          filteredPacks={filteredPacks}
          freshAgedAggregates={freshAgedAggregates}
        />
      </TabsContent>

      <TabsContent value="speed" className="mt-2">
        <SpeedPanel
          packMetrics={packMetrics}
          recentPolicies={recentPolicies}
          allPacks={allPacks}
          vendors={vendors}
        />
      </TabsContent>

      <TabsContent value="performers" className="mt-2">
        <TopPerformersPanel
          filteredPacks={filteredPacks}
          vendorIntelligenceRows={vendorIntelligenceRows}
        />
      </TabsContent>
    </Tabs>
  );
}
