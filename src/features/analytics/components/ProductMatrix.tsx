// src/features/analytics/components/ProductMatrix.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAnalyticsData } from '../../../hooks';
import { cn } from '@/lib/utils';

/**
 * ProductMatrix - Product performance matrix
 */
export function ProductMatrix() {
  const { attribution, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="p-10 text-center text-gray-400 text-xs">
          Loading product data...
        </div>
      </div>
    );
  }

  const { productMix } = attribution;
  const latestMonth = productMix[productMix.length - 1];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Product Mix - {latestMonth?.periodLabel}
        </div>
        <Button
          onClick={() => setShowInfo(!showInfo)}
          size="icon"
          variant="ghost"
          className="h-6 w-6 bg-blue-50 border border-blue-100 hover:bg-blue-200 hover:scale-110 transition-transform"
          title="Click for detailed explanation"
        >
          i
        </Button>
      </div>

      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
              Understanding Product Mix
            </h3>
            <Button
              onClick={() => setShowInfo(false)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-lg text-slate-600 hover:text-slate-900"
            >
              ×
            </Button>
          </div>

          <div className="mb-4">
            <strong>What is this?</strong> Product Mix shows which insurance products you're selling most and how your portfolio is balanced.
            This helps you identify gaps and opportunities in your product offerings.
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Why It Matters:</strong>
            <div className="text-xs mt-2 text-gray-600">
              • <strong>Diversification:</strong> Relying too heavily on one product type is risky<br/>
              • <strong>Income Stability:</strong> Different products have different commission structures<br/>
              • <strong>Client Needs:</strong> Shows if you're serving all client segments<br/>
              • <strong>Growth Opportunities:</strong> Identifies underutilized product lines
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Real Example:</strong>
            <div className="text-xs mt-2 text-gray-600">
              Your current mix:<br/>
              • 60% Term Life (30 policies, $180K premium)<br/>
              • 25% Whole Life (10 policies, $150K premium)<br/>
              • 10% Health (8 policies, $80K premium)<br/>
              • 5% Disability (2 policies, $20K premium)<br/>
              <div className="mt-2 text-blue-700">
                <strong>Insight:</strong> You're heavily term-focused. Consider pushing whole life and disability for better commission rates!
              </div>
            </div>
          </div>

          <div className="p-2 bg-blue-100 rounded text-xs text-center text-blue-700">
            <strong>Pro Tip:</strong> Aim for a balanced mix - don't put all your eggs in one product basket!
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {latestMonth?.productBreakdown.map((product, idx) => (
          <div
            key={product.product}
            className={cn(
              "flex justify-between items-center p-3 rounded-md",
              idx === 0 ? "bg-blue-50" : "bg-muted"
            )}
          >
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">
                {product.product}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {product.count} policies · {product.percentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-sm font-bold text-info font-mono">
              {formatCurrency(product.revenue)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
