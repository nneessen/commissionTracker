// src/features/comps/components/ActiveFilterBadges.tsx

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompFilters } from '../../../types/comp.types';
import { formatProductType } from '../../../lib/format';

interface ActiveFilterBadgesProps {
  filters: CompFilters;
  onRemoveFilter: (key: keyof CompFilters) => void;
}

/**
 * Displays active filter badges with remove buttons
 */
export function ActiveFilterBadges({ filters, onRemoveFilter }: ActiveFilterBadgesProps) {
  const hasFilters = Object.keys(filters).length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Filters:</h4>
      <div className="flex flex-wrap gap-2">
        {filters.carrier_id && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-success/20 to-status-active/10 text-success shadow-sm">
            Carrier: {filters.carrier_id}
            <Button
              onClick={() => onRemoveFilter('carrier_id')}
              variant="ghost"
              size="icon"
              className="ml-1 h-auto w-auto p-0 text-success hover:text-success/80 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          </span>
        )}
        {filters.product_type && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary/20 to-accent/10 text-primary shadow-sm">
            Product: {formatProductType(filters.product_type)}
            <Button
              onClick={() => onRemoveFilter('product_type')}
              variant="ghost"
              size="icon"
              className="ml-1 h-auto w-auto p-0 text-primary hover:text-primary/80 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          </span>
        )}
        {filters.contract_level && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-warning/20 to-status-pending/10 text-warning shadow-sm">
            Contract Level: {filters.contract_level}
            <Button
              onClick={() => onRemoveFilter('contract_level')}
              variant="ghost"
              size="icon"
              className="ml-1 h-auto w-auto p-0 text-warning hover:text-warning/80 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}
