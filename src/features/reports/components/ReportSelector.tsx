// src/features/reports/components/ReportSelector.tsx

import React from 'react';
import { ReportType } from '../../../types/reports.types';
import { Button } from '../../../components/ui/button';
import {
  LayoutDashboard,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface ReportSelectorProps {
  selectedType: ReportType;
  onSelectType: (type: ReportType) => void;
  className?: string;
}

const REPORT_TYPES: Array<{
  type: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    type: 'executive-dashboard',
    label: 'Executive Dashboard',
    description: 'High-level overview with key metrics and top insights',
    icon: LayoutDashboard,
  },
  {
    type: 'commission-performance',
    label: 'Commission Performance',
    description: 'Detailed commission analysis by carrier, product, and time period',
    icon: DollarSign,
  },
  {
    type: 'policy-performance',
    label: 'Policy Performance',
    description: 'Persistency analysis, lapse patterns, and policy health metrics',
    icon: FileText,
  },
  {
    type: 'client-relationship',
    label: 'Client Relationship',
    description: 'Client segmentation, cross-sell opportunities, and LTV analysis',
    icon: Users,
  },
  {
    type: 'financial-health',
    label: 'Financial Health',
    description: 'Cash flow, expense analysis, and profitability metrics',
    icon: TrendingUp,
  },
  {
    type: 'predictive-analytics',
    label: 'Predictive Analytics',
    description: 'Revenue forecasts, growth projections, and trend analysis',
    icon: BarChart3,
  },
];

export function ReportSelector({
  selectedType,
  onSelectType,
  className = '',
}: ReportSelectorProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {REPORT_TYPES.map(reportType => {
        const Icon = reportType.icon;
        const isSelected = selectedType === reportType.type;

        return (
          <button
            key={reportType.type}
            onClick={() => onSelectType(reportType.type)}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {reportType.label}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {reportType.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
