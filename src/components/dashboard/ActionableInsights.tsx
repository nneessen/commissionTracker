// src/components/dashboard/ActionableInsights.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, AlertCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'target';
  message: string;
  action?: string;
}

interface ActionableInsightsProps {
  insights: Insight[];
}

export const ActionableInsights: React.FC<ActionableInsightsProps> = ({ insights }) => {
  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-[18px] w-[18px]" />;
      case 'warning':
        return <AlertCircle className="h-[18px] w-[18px]" />;
      case 'target':
        return <Target className="h-[18px] w-[18px]" />;
      default:
        return <Lightbulb className="h-[18px] w-[18px]" />;
    }
  };

  const getColorClasses = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-l-status-active',
          icon: 'text-status-active',
        };
      case 'warning':
        return {
          border: 'border-l-status-pending',
          icon: 'text-status-pending',
        };
      case 'target':
        return {
          border: 'border-l-primary',
          icon: 'text-primary',
        };
      default:
        return {
          border: 'border-l-status-earned',
          icon: 'text-status-earned',
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Lightbulb className="h-5 w-5" />
          Actionable Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
            <Lightbulb className="h-8 w-8 opacity-30 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No insights available yet. Add more policies to see recommendations.
            </p>
          </div>
        ) : (
          insights.map((insight, index) => {
            const colors = getColorClasses(insight.type);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-4 bg-muted border-l-4 rounded-lg transition-all hover:translate-x-1 hover:shadow-md",
                  colors.border
                )}
              >
                <div className={cn("flex-shrink-0 mt-0.5", colors.icon)}>
                  {getIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {insight.message}
                  </p>
                  {insight.action && (
                    <p className="text-xs text-muted-foreground italic">
                      {insight.action}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
