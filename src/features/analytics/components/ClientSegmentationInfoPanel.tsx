// src/features/analytics/components/ClientSegmentationInfoPanel.tsx

import React from 'react';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {X} from 'lucide-react';

interface ClientSegmentationInfoPanelProps {
  onClose: () => void;
}

/**
 * Info panel explaining client segmentation concepts
 */
export function ClientSegmentationInfoPanel({ onClose }: ClientSegmentationInfoPanelProps) {
  return (
    <Alert className="bg-gradient-to-r from-primary/20 via-info/10 to-card shadow-md mb-4">
      <AlertDescription>
        <div className="flex justify-between items-start mb-3">
          <h3 className="m-0 text-sm font-bold text-foreground">
            Understanding Client Segmentation
          </h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

      <div className="mb-4 text-foreground">
        <strong>What is this?</strong> Client Segmentation divides your clients into three value tiers (High, Medium, Low) based on their total annual premium.
        This helps you identify your most valuable relationships and where to focus your time and energy.
      </div>

      <div className="mb-4">
        <strong className="text-foreground">The Three Tiers:</strong>
      </div>

      <div className="mb-3 pl-4">
        <div className="mb-2">
          <strong className="text-success">High Value:</strong>
          <div className="mt-1 text-muted-foreground">
            Your top clients with the <span className="text-success font-bold">highest total premiums</span>
            <div className="text-xs mt-0.5">
              These are your <span className="text-success font-bold">VIPs</span> - nurture these relationships!
            </div>
          </div>
        </div>

        <div className="mb-2">
          <strong className="text-primary">Medium Value:</strong>
          <div className="mt-1 text-muted-foreground">
            Solid clients with moderate premiums
            <div className="text-xs mt-0.5">
              Great <span className="text-primary font-bold">growth opportunities</span> - potential to upgrade to high value
            </div>
          </div>
        </div>

        <div className="mb-2">
          <strong className="text-warning">Low Value:</strong>
          <div className="mt-1 text-muted-foreground">
            Clients with lower total premiums
            <div className="text-xs mt-0.5">
              May benefit from <span className="text-warning font-bold">cross-sell opportunities</span> to increase value
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gradient-to-r from-info/15 via-status-earned/10 to-card rounded-md shadow-sm">
        <strong className="text-foreground">Cross-Sell Opportunities:</strong>
        <div className="text-xs mt-2 text-muted-foreground">
          The list shows clients who might benefit from additional policies based on:
          <div className="pl-3 mt-1">
            • Current <span className="text-info font-bold">policy count</span> (fewer = more opportunity)<br/>
            • Client <span className="text-info font-bold">value tier</span> (high value = more receptive)<br/>
            • Missing <span className="text-info font-bold">product types</span> (gaps in coverage)
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gradient-to-r from-success/15 via-status-active/10 to-card rounded-md shadow-sm">
        <strong className="text-foreground">Real Example:</strong>
        <div className="text-xs mt-2 text-muted-foreground">
          John Smith: <span className="text-primary font-bold">3 policies</span>, <span className="text-success font-bold">$15,000</span> total annual premium<br/>
          • Classified as: <strong className="text-success">High Value</strong><br/>
          • Has: Term Life, Health, Auto<br/>
          • Missing: <span className="text-warning font-bold">Disability, Umbrella</span><br/>
          <div className="mt-2 text-foreground">
            <strong className="text-success">Opportunity:</strong> Approach with disability insurance - estimated <span className="text-success font-bold">$3,000</span> additional premium
          </div>
        </div>
      </div>

      <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/10 rounded text-xs text-center text-primary font-semibold shadow-sm">
        <strong>Pro Tip:</strong> Focus 80% of your service time on high-value clients, but don't ignore cross-sell opportunities in medium-value clients!
      </div>
      </AlertDescription>
    </Alert>
  );
}
