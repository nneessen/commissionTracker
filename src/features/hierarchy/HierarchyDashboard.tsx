// src/features/hierarchy/HierarchyDashboard.tsx

import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Users, DollarSign, GitBranch, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMyDownlines, useMyOverrideSummary, useMyHierarchyStats } from '@/hooks';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { InviteDownline } from './components/InviteDownline';

/**
 * HierarchyDashboard - Main landing page for the hierarchy/team section
 * Provides quick overview and navigation to different hierarchy features
 */
export function HierarchyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: downlines } = useMyDownlines();
  const { data: overrideSummary } = useMyOverrideSummary();
  const { data: stats } = useMyHierarchyStats();

  const isAdmin = user?.email === 'nick@nickneessen.com';

  const quickLinks = [
    {
      title: 'Organization Chart',
      description: 'View your team hierarchy as a tree structure',
      icon: GitBranch,
      href: '/hierarchy/tree',
      color: 'text-blue-600',
    },
    {
      title: 'Override Commissions',
      description: 'View and manage override earnings',
      icon: DollarSign,
      href: '/hierarchy/overrides',
      color: 'text-green-600',
    },
    {
      title: 'Downline Performance',
      description: 'Monitor performance metrics for your team',
      icon: Users,
      href: '/hierarchy/downlines',
      color: 'text-purple-600',
    },
  ];

  if (isAdmin) {
    quickLinks.push({
      title: 'Manage Hierarchy',
      description: 'Assign agents and manage organizational structure',
      icon: Settings,
      href: '/hierarchy/manage',
      color: 'text-orange-600',
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team & Hierarchy</h1>
        <p className="text-muted-foreground mt-1">
          Manage your agency hierarchy and track override commissions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold mt-1">{stats?.total_downlines || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.direct_downlines || 0} direct reports
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Override Income MTD</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats?.total_override_income_mtd || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Month to date</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Override Income YTD</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats?.total_override_income_ytd || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Year to date</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Card
                key={link.href}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => navigate({ to: link.href })}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted/50 ${link.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <CardDescription className="mt-1">{link.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invite/Add Downlines */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Build Your Team</h2>
        <InviteDownline />
      </div>

      {/* Recent Activity or Additional Info */}
      {(!downlines || downlines.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have any downline agents yet. Use the tools above to invite team members!
              Once they join, you'll be able to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>View your organizational hierarchy in a tree structure</li>
              <li>Track override commissions earned from downline policy sales</li>
              <li>Monitor performance metrics for each downline agent</li>
              <li>Analyze team productivity and earnings</li>
            </ul>
            {isAdmin && (
              <div className="mt-4">
                <Button onClick={() => navigate({ to: '/hierarchy/manage' })}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Hierarchy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
