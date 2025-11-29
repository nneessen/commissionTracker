// src/features/hierarchy/HierarchyDashboard.tsx

import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMyDownlines, useMyHierarchyStats, useHierarchyTree } from '@/hooks';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { HierarchyTree } from './components/HierarchyTree';
import { SendInvitationModal } from './components/SendInvitationModal';
import { PendingInvitationBanner } from './components/PendingInvitationBanner';
import { SentInvitationsCard } from './components/SentInvitationsCard';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';

/**
 * HierarchyDashboard - Main landing page for the hierarchy/team section
 * Displays team stats and the hierarchy tree directly on the page
 */
export function HierarchyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: downlines } = useMyDownlines();
  const { data: stats } = useMyHierarchyStats();
  const { data: hierarchyTree } = useHierarchyTree();
  const [sendInvitationModalOpen, setSendInvitationModalOpen] = useState(false);

  const isAdmin = user?.email === 'nick@nickneessen.com';

  return (
    <div className="space-y-4">
      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Team Hierarchy</h2>
        <Button
          size="sm"
          onClick={() => setSendInvitationModalOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Agent
        </Button>
      </div>

      {/* Pending Invitation Banner (for invitees) */}
      <PendingInvitationBanner />

      {/* Compact Team Overview - Horizontal Inline Layout */}
      <div className="rounded-lg border bg-gradient-to-br from-blue-50/50 to-emerald-50/50 shadow-sm">
        <div className="p-3">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Team Overview
          </h3>
          <div className="flex items-center justify-between gap-4">
            {/* Total Agents */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-bold font-mono">{stats?.total_downlines || 0}</div>
              </div>
            </div>

            {/* Direct Reports */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Direct</div>
                <div className="text-lg font-bold font-mono">{stats?.direct_downlines || 0}</div>
              </div>
            </div>

            {/* Override MTD */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">MTD Override</div>
                <div className="text-lg font-bold font-mono">{formatCurrency(stats?.total_override_income_mtd || 0)}</div>
              </div>
            </div>

            {/* Override YTD */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">YTD Override</div>
                <div className="text-lg font-bold font-mono">{formatCurrency(stats?.total_override_income_ytd || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sent Invitations Card (for inviters) */}
      <SentInvitationsCard />

      {/* Hierarchy Tree - Display immediately */}
      <HierarchyTree
        nodes={hierarchyTree || []}
        onNodeClick={(node) => {
          // Could navigate to agent detail view or do nothing for now
        }}
      />

      {/* Send Invitation Modal */}
      <SendInvitationModal
        open={sendInvitationModalOpen}
        onOpenChange={setSendInvitationModalOpen}
      />
    </div>
  );
}
