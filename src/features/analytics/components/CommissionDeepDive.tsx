// src/features/analytics/components/CommissionDeepDive.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useAnalyticsData } from '../../../hooks';

/**
 * CommissionDeepDive - Detailed commission analysis
 */
export function CommissionDeepDive() {
  const { cohort, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading commission data...
        </CardContent>
      </Card>
    );
  }

  const { earningProgress } = cohort;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalAdvance = earningProgress.reduce((sum, p) => sum + p.totalAdvance, 0);
  const totalEarned = earningProgress.reduce((sum, p) => sum + p.totalEarned, 0);
  const totalUnearned = earningProgress.reduce((sum, p) => sum + p.totalUnearned, 0);

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Commission Deep Dive
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
          <Alert className="bg-primary/10 border-primary mb-4">
            <AlertDescription>
              <div className="flex justify-between items-start mb-3">
                <h3 className="m-0 text-sm font-bold text-foreground">
                  Understanding Commission Deep Dive
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

              <div className="mb-4">
                <strong>What is this?</strong> Commission Deep Dive tracks your advance payments and shows how much you've actually earned versus what you still owe back.
                This is critical for managing cash flow and understanding your true income.
              </div>

              <div className="mb-4">
                <strong>Key Terms:</strong>
              </div>

              <div className="mb-3 pl-4">
                <div className="mb-2">
                  <strong className="text-primary">Total Advance:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Money you received upfront from the carrier
                    <div className="text-xs mt-0.5">
                      Example: $10,000 paid to you when policy was sold
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-status-active">Total Earned:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Portion of the advance you've actually earned (policies still active)
                    <div className="text-xs mt-0.5">
                      As months pass and clients keep paying, you earn more
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-destructive">Total Unearned:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Money you still owe back if policies lapse/cancel
                    <div className="text-xs mt-0.5">
                      Risk amount - this could be charged back
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-card rounded-md border border-border">
                <strong>How It Works:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  Most insurance carriers pay you upfront but you only "earn" it over time:
                  <div className="pl-3 mt-1">
                    • <strong>Month 1:</strong> Get $1,000 advance (100% unearned)<br/>
                    • <strong>Month 6:</strong> Client still paying → 50% earned, 50% unearned<br/>
                    • <strong>Month 12:</strong> Client still paying → 100% earned, 0% unearned<br/>
                    • <strong>If client cancels at Month 3:</strong> Chargeback! You owe back ~75%
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-card rounded-md border border-border">
                <strong>Real Example:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  You sell 10 policies, receive $50,000 in advances<br/>
                  After 6 months:<br/>
                  • 8 policies still active → $40,000 earned<br/>
                  • 2 policies lapsed → $10,000 unearned (at risk)<br/>
                  <div className="mt-2 text-primary">
                    <strong>Your actual income:</strong> $40,000 (not $50,000!)<br/>
                    <strong>Potential chargeback:</strong> $10,000 if those 2 don't reinstate
                  </div>
                </div>
              </div>

              <div className="p-2 bg-primary/10 rounded text-xs text-center text-primary">
                <strong>Pro Tip:</strong> High unearned balance = high risk! Focus on keeping those clients happy and policies active!
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-5">
          <Card className="bg-primary/10 border-primary">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Total Advance
              </div>
              <div className="text-lg font-bold text-primary font-mono">
                {formatCurrency(totalAdvance)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-status-active-bg border-status-active">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Total Earned
              </div>
              <div className="text-lg font-bold text-status-active font-mono">
                {formatCurrency(totalEarned)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Total Unearned
              </div>
              <div className="text-lg font-bold text-destructive font-mono">
                {formatCurrency(totalUnearned)}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
