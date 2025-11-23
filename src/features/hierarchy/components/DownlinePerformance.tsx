// src/features/hierarchy/components/DownlinePerformance.tsx

import React from 'react';
import { Users, TrendingUp, DollarSign, BarChart3, User, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMyDownlines } from '@/hooks';
import type { UserProfile } from '@/types/hierarchy.types';

interface DownlinePerformanceProps {
  onAgentClick?: (agentId: string) => void;
  className?: string;
}

/**
 * Performance metric card for a single downline agent
 */
function DownlineCard({
  downline,
  onClick,
}: {
  downline: UserProfile;
  onClick?: (agentId: string) => void;
}) {
  return (
    <Card
      className={cn(
        'transition-all hover:shadow-lg cursor-pointer',
        onClick && 'hover:border-primary/50'
      )}
      onClick={() => onClick?.(downline.id)}
    >
      <CardContent className="pt-6">
        {/* Agent Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{downline.email}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>Level {downline.hierarchy_depth}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {downline.hierarchy_depth === 1 ? 'Direct' : `L${downline.hierarchy_depth}`}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Policies
            </p>
            <p className="text-lg font-bold">-</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Premium
            </p>
            <p className="text-lg font-bold">-</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Persistency
            </p>
            <p className="text-lg font-bold">-</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Overrides
            </p>
            <p className="text-lg font-bold">-</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DownlinePerformance - Displays a grid of all downline agents with their KPI metrics
 * Shows policies, premium, persistency, and override earnings for each downline
 */
export function DownlinePerformance({ onAgentClick, className }: DownlinePerformanceProps) {
  const { data: downlines, isLoading } = useMyDownlines();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Downline Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Loading downline data...</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  if (!downlines || downlines.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Downline Performance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            View performance metrics for your downline agents
          </p>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No downline agents yet</EmptyTitle>
              <EmptyDescription>
                When agents are assigned to your downline, their performance metrics will appear here
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  // Group downlines by hierarchy level
  const directDownlines = downlines.filter((d) => d.hierarchy_depth === 1);
  const indirectDownlines = downlines.filter((d) => d.hierarchy_depth > 1);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold mt-1">{downlines.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Direct Reports</p>
                <p className="text-2xl font-bold mt-1">{directDownlines.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-muted-foreground">
                <User className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Max Depth</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.max(...downlines.map((d) => d.hierarchy_depth))}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-muted-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Direct Downlines */}
      {directDownlines.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Direct Reports ({directDownlines.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {directDownlines.map((downline) => (
              <DownlineCard
                key={downline.id}
                downline={downline}
                onClick={onAgentClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Indirect Downlines */}
      {indirectDownlines.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Indirect Downlines ({indirectDownlines.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {indirectDownlines.map((downline) => (
              <DownlineCard
                key={downline.id}
                downline={downline}
                onClick={onAgentClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
