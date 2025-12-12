// src/features/hierarchy/HierarchyDashboard.tsx

import React from 'react';
import {useMyHierarchyStats as useHierarchyStats, useCurrentUserProfile} from '@/hooks';
import {DownlinePerformance} from './components/DownlinePerformance';
import {HierarchyManagement} from './components/HierarchyManagement';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {formatCurrency} from '@/lib/format';

/**
 * HierarchyDashboard - Main landing page for the hierarchy/team section
 * Displays team stats and components based on user permissions
 */
export function HierarchyDashboard() {
  const { data: stats } = useHierarchyStats();

  // Check admin status from profile, not hardcoded email
  const { data: profile } = useCurrentUserProfile();
  const isAdmin = profile?.is_admin === true;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Downlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_downlines || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Direct Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.direct_downlines || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MTD Override</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total_override_income_mtd || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">YTD Override</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total_override_income_ytd || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Downline Performance */}
      <DownlinePerformance />

      {/* Admin-only Hierarchy Management */}
      {isAdmin && <HierarchyManagement />}
    </div>
  );
}