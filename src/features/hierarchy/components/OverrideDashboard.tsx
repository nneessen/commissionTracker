// src/features/hierarchy/components/OverrideDashboard.tsx

import React, { useState } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMyOverrides, useMyOverrideSummary } from '@/hooks';
import type { OverrideFilters } from '@/types/hierarchy.types';

interface OverrideDashboardProps {
  className?: string;
}

/**
 * Status badge for override commissions
 */
function OverrideStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'border-status-pending text-status-pending',
    },
    earned: {
      label: 'Earned',
      className: 'border-status-earned text-status-earned',
    },
    paid: {
      label: 'Paid',
      className: 'border-status-active text-status-active',
    },
    chargedback: {
      label: 'Chargedback',
      className: 'border-destructive text-destructive',
    },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

/**
 * Summary card component for override metrics
 */
function SummaryCard({
  title,
  amount,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  amount: number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'info';
}) {
  const variantStyles = {
    default: 'text-muted-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(amount)}</p>
          </div>
          <div className={cn('p-3 rounded-lg bg-muted/50', variantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * OverrideDashboard - Displays override commission table with filters and summary cards
 * Shows all override earnings from downline agents writing policies
 */
export function OverrideDashboard({ className }: OverrideDashboardProps) {
  const [filters] = useState<OverrideFilters | undefined>(undefined);

  const { data: overrides, isLoading } = useMyOverrides({ filters });
  const { data: summary } = useMyOverrideSummary();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Overrides"
          amount={summary?.total_override_amount || 0}
          icon={DollarSign}
          variant="default"
        />
        <SummaryCard
          title="Pending"
          amount={summary?.pending_amount || 0}
          icon={Clock}
          variant="warning"
        />
        <SummaryCard
          title="Earned"
          amount={summary?.earned_amount || 0}
          icon={TrendingUp}
          variant="success"
        />
        <SummaryCard
          title="Paid"
          amount={summary?.paid_amount || 0}
          icon={CheckCircle}
          variant="info"
        />
      </div>

      {/* Overrides Table */}
      <Card>
        <CardHeader>
          <CardTitle>Override Commissions</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Override earnings from your downline agents
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Loading overrides...</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : !overrides || overrides.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No override commissions yet</EmptyTitle>
                <EmptyDescription>
                  Override commissions are automatically created when your downline agents write policies
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Downline Agent</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Base Commission</TableHead>
                    <TableHead className="text-right">Override Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell className="font-medium">
                        {formatDate(override.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {override.base_agent_email || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Hierarchy Level {override.hierarchy_depth}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono">
                          {override.policy_number || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          Level {override.hierarchy_depth}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(override.base_commission_amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(override.override_commission_amount)}
                      </TableCell>
                      <TableCell>
                        <OverrideStatusBadge status={override.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
