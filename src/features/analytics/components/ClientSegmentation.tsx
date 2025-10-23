// src/features/analytics/components/ClientSegmentation.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { useAnalyticsData } from '../../../hooks';
import { ClientSegmentationInfoPanel } from './ClientSegmentationInfoPanel';
import { SegmentCard, SegmentTier } from './SegmentCard';
import { CrossSellOpportunityCard } from './CrossSellOpportunityCard';

/**
 * ClientSegmentation - Client value segmentation and opportunities
 *
 * Segments clients by value (High/Medium/Low) and identifies cross-sell opportunities
 */
export function ClientSegmentation() {
  const { segmentation, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

  // Transform segmentation data into displayable format
  // React 19.1 optimizes automatically - no need for useMemo
  const segments = !segmentation ? [] : (() => {
    const { segments: segmentData } = segmentation;
    const totalRevenue = segmentData.totalPremiumByTier.high + segmentData.totalPremiumByTier.medium + segmentData.totalPremiumByTier.low;

    return [
      {
        tier: 'high' as SegmentTier,
        clientCount: segmentData.highValue.length,
        totalValue: segmentData.totalPremiumByTier.high,
        avgValue: segmentData.avgPremiumByTier.high,
        percentage: totalRevenue > 0 ? (segmentData.totalPremiumByTier.high / totalRevenue) * 100 : 0,
      },
      {
        tier: 'medium' as SegmentTier,
        clientCount: segmentData.mediumValue.length,
        totalValue: segmentData.totalPremiumByTier.medium,
        avgValue: segmentData.avgPremiumByTier.medium,
        percentage: totalRevenue > 0 ? (segmentData.totalPremiumByTier.medium / totalRevenue) * 100 : 0,
      },
      {
        tier: 'low' as SegmentTier,
        clientCount: segmentData.lowValue.length,
        totalValue: segmentData.totalPremiumByTier.low,
        avgValue: segmentData.avgPremiumByTier.low,
        percentage: totalRevenue > 0 ? (segmentData.totalPremiumByTier.low / totalRevenue) * 100 : 0,
      },
    ];
  })();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading segmentation data...
        </CardContent>
      </Card>
    );
  }

  const { crossSell } = segmentation;

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Client Segmentation
          </div>
          {/* Info Icon Button */}
          <Button
            onClick={() => setShowInfo(!showInfo)}
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:scale-110 transition-transform"
            title="Click for detailed explanation"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Panel */}
        {showInfo && <ClientSegmentationInfoPanel onClose={() => setShowInfo(false)} />}

        {/* Segments Overview */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 mb-6">
          {segments.map(segment => (
            <SegmentCard
              key={segment.tier}
              tier={segment.tier}
              clientCount={segment.clientCount}
              totalValue={segment.totalValue}
              avgValue={segment.avgValue}
              percentage={segment.percentage}
            />
          ))}
        </div>

        {/* Top Cross-Sell Opportunities */}
        <div>
          <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
            Top Cross-Sell Opportunities
          </div>
          <div className="grid gap-2">
            {crossSell.slice(0, 5).map((opp, idx) => (
              <CrossSellOpportunityCard
                key={opp.clientName}
                opportunity={opp}
                isTopRanked={idx === 0}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
