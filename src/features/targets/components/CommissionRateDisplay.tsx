// src/features/targets/components/CommissionRateDisplay.tsx

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../../../components/ui/card';
import {Badge} from '../../../components/ui/badge';
import {Alert, AlertDescription, AlertTitle} from '../../../components/ui/alert';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '../../../components/ui/table';
import {useUserCommissionProfile} from '../../../hooks/commissions/useUserCommissionProfile';
import {formatCurrency, formatPercent} from '../../../lib/format';
import {AlertCircle, TrendingUp, Info, ChevronDown} from 'lucide-react';
import {CommissionDataQuality} from '../../../types/product.types';
import {useState} from 'react';

/**
 * Component to display user's commission rate profile with full transparency
 * Shows contract level, recommended rate, data quality, and product breakdown
 *
 * This builds trust by showing users exactly how their commission rates are calculated
 */
export function CommissionRateDisplay() {
  const { data: profile, isLoading, error } = useUserCommissionProfile();
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted/50 rounded w-48 mb-2" />
            <div className="h-4 bg-muted/50 rounded w-64" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse">
            <div className="h-20 bg-muted/50 rounded w-full mb-4" />
            <div className="h-20 bg-muted/50 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Commission Data Error</AlertTitle>
        <AlertDescription>
          {error.message || 'Unable to load commission rate data. Please check your contract level settings.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle>No Commission Data</AlertTitle>
        <AlertDescription>
          Commission rate data is not available. Please ensure your contract level is configured.
        </AlertDescription>
      </Alert>
    );
  }

  const dataQualityColor = getDataQualityColor(profile.dataQuality);
  const dataQualityLabel = getDataQualityLabel(profile.dataQuality);
  const useWeighted = profile.dataQuality === 'HIGH' || profile.dataQuality === 'MEDIUM';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Your Commission Profile</CardTitle>
            <CardDescription>
              Based on your contract level and {useWeighted ? 'historical sales mix' : 'available products'}
            </CardDescription>
          </div>
          <Badge variant={dataQualityColor as any}>
            {dataQualityLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Contract Level */}
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">Contract Level</div>
            <div className="mt-2 text-3xl font-bold">{profile.contractLevel}</div>
          </div>

          {/* Recommended Rate */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" />
              Recommended Commission Rate
            </div>
            <div className="mt-2 text-3xl font-bold">
              {formatPercent(profile.recommendedRate)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {useWeighted ? 'Premium-weighted average' : 'Simple average'}
            </div>
          </div>
        </div>

        {/* Data Quality Explanation */}
        {profile.dataQuality === 'INSUFFICIENT' && (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Limited Sales History</AlertTitle>
            <AlertDescription>
              We're using a simple average of all products at your contract level.
              As you sell more policies, we'll calculate a more accurate weighted average based on your product mix.
            </AlertDescription>
          </Alert>
        )}

        {profile.dataQuality === 'LOW' && (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Moderate Data Quality</AlertTitle>
            <AlertDescription>
              Your commission rate is based on limited sales history ({profile.lookbackMonths} months).
              The weighted average will become more accurate as you sell more policies.
            </AlertDescription>
          </Alert>
        )}

        {/* Calculation Details */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm font-medium">Calculation Method</div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Simple Average Rate:</span>
              <span className="font-medium">{formatPercent(profile.simpleAverageRate)}</span>
            </div>
            {useWeighted && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weighted Average Rate:</span>
                <span className="font-medium">{formatPercent(profile.weightedAverageRate)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Using:</span>
              <span className="font-bold">{formatPercent(profile.recommendedRate)}</span>
            </div>
          </div>
        </div>

        {/* Product Breakdown */}
        {profile.productBreakdown.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors"
            >
              <span>Product-Level Breakdown ({profile.productBreakdown.length} products)</span>
              <ChevronDown className={`size-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
            </button>

            {showBreakdown && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Commission Rate</TableHead>
                      {useWeighted && (
                        <>
                          <TableHead className="text-right">Your Mix</TableHead>
                          <TableHead className="text-right">Policies</TableHead>
                          <TableHead className="text-right">Premium Volume</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.productBreakdown
                      .filter(p => !useWeighted || p.premiumWeight > 0)
                      .sort((a, b) => b.premiumWeight - a.premiumWeight)
                      .slice(0, 20)
                      .map(product => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{product.carrierName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatPercent(product.commissionRate)}
                          </TableCell>
                          {useWeighted && (
                            <>
                              <TableCell className="text-right font-mono">
                                {formatPercent(product.premiumWeight)}
                              </TableCell>
                              <TableCell className="text-right">
                                {product.policyCount}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(product.totalPremium)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {useWeighted && profile.productBreakdown.filter(p => p.premiumWeight > 0).length > 20 && (
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    Showing top 20 products by premium volume
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          Last calculated: {profile.calculatedAt.toLocaleString()} •
          Based on last {profile.lookbackMonths} months of sales
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getDataQualityColor(quality: CommissionDataQuality): string {
  switch (quality) {
    case 'HIGH':
      return 'success';
    case 'MEDIUM':
      return 'default';
    case 'LOW':
      return 'warning';
    case 'INSUFFICIENT':
      return 'destructive';
    default:
      return 'default';
  }
}

function getDataQualityLabel(quality: CommissionDataQuality): string {
  switch (quality) {
    case 'HIGH':
      return 'High Quality Data';
    case 'MEDIUM':
      return 'Medium Quality Data';
    case 'LOW':
      return 'Low Quality Data';
    case 'INSUFFICIENT':
      return 'Insufficient Data';
    default:
      return quality;
  }
}
