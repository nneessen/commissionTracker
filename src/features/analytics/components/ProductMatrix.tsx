// src/features/analytics/components/ProductMatrix.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useAnalyticsData } from '../../../hooks';
import { cn } from '@/lib/utils';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';

/**
 * ProductMatrix - Product performance matrix
 */
export function ProductMatrix() {
  const { dateRange } = useAnalyticsDateRange();
  const { attribution, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading product data...
        </CardContent>
      </Card>
    );
  }

  const { productMix } = attribution;
  const latestMonth = productMix[productMix.length - 1];

  // Helper function to format product names (whole_life -> Whole Life)
  const formatProductName = (product: string): string => {
    return product
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Product Mix - {latestMonth?.periodLabel}
          </div>
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

        {showInfo && (
          <Alert className="bg-gradient-to-r from-primary/20 via-info/10 to-card shadow-md mb-4">
            <AlertDescription>
              <div className="flex justify-between items-start mb-3">
                <h3 className="m-0 text-sm font-bold text-foreground">
                  Understanding Product Mix
                </h3>
                <Button
                  onClick={() => setShowInfo(false)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 text-foreground">
                <strong>What is this?</strong> Product Mix shows which insurance products you're selling most and how your portfolio is balanced.
                This helps you identify gaps and opportunities in your product offerings.
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-info/15 to-card rounded-md shadow-sm">
                <strong>Why It Matters:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  • <strong>Diversification:</strong> Relying too heavily on one product type is risky<br/>
                  • <strong>Income Stability:</strong> Different products have different commission structures<br/>
                  • <strong>Client Needs:</strong> Shows if you're serving all client segments<br/>
                  • <strong>Growth Opportunities:</strong> Identifies underutilized product lines
                </div>
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-success/15 to-card rounded-md shadow-sm">
                <strong className="text-foreground">Real Example:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  Your current mix:<br/>
                  • <span className="text-success font-bold">60% Term Life</span> (30 policies, $180K premium)<br/>
                  • <span className="text-info font-bold">25% Whole Life</span> (10 policies, $150K premium)<br/>
                  • <span className="text-warning font-bold">10% Health</span> (8 policies, $80K premium)<br/>
                  • <span className="text-destructive font-bold">5% Disability</span> (2 policies, $20K premium)<br/>
                  <div className="mt-2 text-primary font-semibold">
                    <strong>Insight:</strong> You're heavily term-focused. Consider pushing whole life and disability for better commission rates!
                  </div>
                </div>
              </div>

              <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/10 rounded text-xs text-center text-primary font-semibold shadow-sm">
                <strong>Pro Tip:</strong> Aim for a balanced mix - don't put all your eggs in one product basket!
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          {latestMonth?.productBreakdown.map((product, idx) => {
            const getProductColor = (index: number) => {
              const colors = [
                { bg: "bg-gradient-to-r from-success/20 via-status-active/10 to-card", text: "text-success" },
                { bg: "bg-gradient-to-r from-info/20 via-status-earned/10 to-card", text: "text-info" },
                { bg: "bg-gradient-to-r from-primary/20 via-accent/10 to-card", text: "text-primary" },
                { bg: "bg-gradient-to-r from-warning/20 via-status-pending/10 to-card", text: "text-warning" },
              ];
              return colors[index % colors.length];
            };

            const colorScheme = getProductColor(idx);

            return (
              <Card
                key={product.product}
                className={cn("shadow-md hover:shadow-lg transition-all duration-200", colorScheme.bg)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-foreground mb-1">
                        {formatProductName(product.product)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {product.count} policies · {product.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div className={cn("text-sm font-bold font-mono", colorScheme.text)}>
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
