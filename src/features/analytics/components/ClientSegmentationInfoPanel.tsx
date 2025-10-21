// src/features/analytics/components/ClientSegmentationInfoPanel.tsx

import React from 'react';
import { Button } from '@/components/ui/button';

interface ClientSegmentationInfoPanelProps {
  onClose: () => void;
}

/**
 * Info panel explaining client segmentation concepts
 */
export function ClientSegmentationInfoPanel({ onClose }: ClientSegmentationInfoPanelProps) {
  return (
    <div className="bg-blue-50 border border-blue-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="m-0 text-sm font-bold text-blue-800">
          Understanding Client Segmentation
        </h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 text-lg text-slate-600 hover:text-slate-900"
        >
          ×
        </Button>
      </div>

      <div className="mb-4">
        <strong>What is this?</strong> Client Segmentation divides your clients into three value tiers (High, Medium, Low) based on their total annual premium.
        This helps you identify your most valuable relationships and where to focus your time and energy.
      </div>

      <div className="mb-4">
        <strong>The Three Tiers:</strong>
      </div>

      <div className="mb-3 pl-4">
        <div className="mb-2">
          <strong className="text-green-500">High Value:</strong>
          <div className="mt-1 text-gray-600">
            Your top clients with the highest total premiums
            <div className="text-xs mt-0.5">
              These are your VIPs - nurture these relationships!
            </div>
          </div>
        </div>

        <div className="mb-2">
          <strong className="text-blue-500">Medium Value:</strong>
          <div className="mt-1 text-gray-600">
            Solid clients with moderate premiums
            <div className="text-xs mt-0.5">
              Great growth opportunities - potential to upgrade to high value
            </div>
          </div>
        </div>

        <div className="mb-2">
          <strong className="text-red-500">Low Value:</strong>
          <div className="mt-1 text-gray-600">
            Clients with lower total premiums
            <div className="text-xs mt-0.5">
              May benefit from cross-sell opportunities to increase value
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-white rounded-md">
        <strong>Cross-Sell Opportunities:</strong>
        <div className="text-xs mt-2 text-gray-600">
          The list shows clients who might benefit from additional policies based on:
          <div className="pl-3 mt-1">
            • Current policy count (fewer = more opportunity)<br/>
            • Client value tier (high value = more receptive)<br/>
            • Missing product types (gaps in coverage)
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-white rounded-md">
        <strong>Real Example:</strong>
        <div className="text-xs mt-2 text-gray-600">
          John Smith: 3 policies, $15,000 total annual premium<br/>
          • Classified as: <strong className="text-green-500">High Value</strong><br/>
          • Has: Term Life, Health, Auto<br/>
          • Missing: Disability, Umbrella<br/>
          <div className="mt-2 text-blue-700">
            <strong>Opportunity:</strong> Approach with disability insurance - estimated $3,000 additional premium
          </div>
        </div>
      </div>

      <div className="p-2 bg-blue-100 rounded text-xs text-center text-blue-700">
        <strong>Pro Tip:</strong> Focus 80% of your service time on high-value clients, but don't ignore cross-sell opportunities in medium-value clients!
      </div>
    </div>
  );
}
