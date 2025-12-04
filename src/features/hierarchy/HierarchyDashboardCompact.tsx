// src/features/hierarchy/HierarchyDashboardCompact.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMyDownlines,
  useMyHierarchyStats,
  useHierarchyTree
} from '@/hooks';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { SendInvitationModal } from './components/SendInvitationModal';
import { TeamMetricsCard } from './components/TeamMetricsCard';
import { AgentTable } from './components/AgentTable';
import { InvitationsList } from './components/InvitationsList';
import { TeamActivityFeed } from './components/TeamActivityFeed';
import showToast from '@/utils/toast';
import { downloadCSV } from '@/utils/exportHelpers';
import type { UserProfile } from '@/types/hierarchy.types';

// Extended agent type with additional fields
interface Agent extends UserProfile {
  name?: string;
  is_active?: boolean;
  contract_level?: string;
  parent_agent_id?: string | null;
}

interface TeamFilters {
  status: 'all' | 'active' | 'inactive' | 'pending';
  level: string;
  performance: 'all' | 'above' | 'below';
  directOnly: boolean;
  searchTerm: string;
}

export function HierarchyDashboardCompact() {
  const { user } = useAuth();
  const { data: downlinesRaw = [], isLoading: downlinesLoading } = useMyDownlines();
  const { data: stats, isLoading: statsLoading } = useMyHierarchyStats();
  const { data: hierarchyTree = [] } = useHierarchyTree();

  // Transform UserProfile to Agent type
  const downlines: Agent[] = downlinesRaw.map(profile => ({
    ...profile,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
    is_active: profile.approval_status === 'approved',
    contract_level: 'Associate', // Default, would need actual data
    parent_agent_id: profile.upline_id
  }));

  const [sendInvitationModalOpen, setSendInvitationModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TeamFilters>({
    status: 'all',
    level: 'all',
    performance: 'all',
    directOnly: false,
    searchTerm: ''
  });

  // Update filters when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Calculate filter count
  const filterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.level !== 'all' ? 1 : 0) +
    (filters.performance !== 'all' ? 1 : 0) +
    (filters.directOnly ? 1 : 0) +
    (filters.searchTerm ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      status: 'all',
      level: 'all',
      performance: 'all',
      directOnly: false,
      searchTerm: ''
    });
    setSearchTerm('');
  };

  // Filter agents based on criteria
  const filteredAgents = useMemo(() => {
    let agents = [...downlines];

    // Apply search filter
    if (filters.searchTerm) {
      agents = agents.filter(agent =>
        agent.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        agent.email?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      agents = agents.filter(agent => {
        if (filters.status === 'active') return agent.is_active;
        if (filters.status === 'inactive') return !agent.is_active;
        // Add pending logic if needed
        return true;
      });
    }

    // Apply level filter
    if (filters.level !== 'all') {
      agents = agents.filter(agent =>
        agent.contract_level === filters.level
      );
    }

    // Apply direct only filter
    if (filters.directOnly) {
      agents = agents.filter(agent => agent.parent_agent_id === user?.id);
    }

    // Apply performance filter (would need actual metrics)
    if (filters.performance !== 'all') {
      // This would require actual performance data
      // For now, just return the filtered list
    }

    return agents;
  }, [downlines, filters, user?.id]);

  const handleExportCSV = () => {
    try {
      const exportData = filteredAgents.map(agent => ({
        Name: agent.name || 'N/A',
        Email: agent.email || 'N/A',
        'Contract Level': agent.contract_level || 'N/A',
        Status: agent.is_active ? 'Active' : 'Inactive',
        'Join Date': agent.created_at ? formatDate(agent.created_at) : 'N/A',
        'MTD Override': formatCurrency(0), // Would need actual data
        'YTD Override': formatCurrency(0), // Would need actual data
      }));

      downloadCSV(exportData, 'team-hierarchy');
      showToast.success('Team data exported to CSV!');
    } catch (error) {
      showToast.error('Failed to export CSV');
    }
  };

  const isLoading = downlinesLoading || statsLoading;

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="page-header py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground">Team Hierarchy</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Manage agents, track overrides, and monitor team performance
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={handleExportCSV}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
              <Button
                onClick={() => setSendInvitationModalOpen(true)}
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-2">

            {/* Team Metrics Card */}
            <TeamMetricsCard
              stats={stats}
              agentCount={downlines.length}
              isLoading={isLoading}
            />

            {/* Search and Filters Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative flex items-center">
                <Search size={14} className="absolute left-2 text-muted-foreground/60" />
                <Input
                  type="text"
                  placeholder="Search agents by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 pl-7 text-xs"
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
              >
                <Filter size={12} className="mr-1" />
                Filters {filterCount > 0 && `(${filterCount})`}
              </Button>
              {filterCount > 0 && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Collapsible Filter Panel */}
            {showFilters && (
              <div className="flex gap-2">
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, status: value as TeamFilters['status'] }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.level}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, level: value }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Associate">Associate</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                    <SelectItem value="Director">Director</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.performance}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, performance: value as TeamFilters['performance'] }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Performance</SelectItem>
                    <SelectItem value="above">Above Target</SelectItem>
                    <SelectItem value="below">Below Target</SelectItem>
                  </SelectContent>
                </Select>

                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={filters.directOnly}
                    onChange={(e) =>
                      setFilters(prev => ({ ...prev, directOnly: e.target.checked }))
                    }
                    className="h-3 w-3"
                  />
                  Direct Only
                </label>
              </div>
            )}

            {/* Agent Table */}
            <AgentTable
              agents={filteredAgents}
              isLoading={isLoading}
            />

            {/* Bottom Grid: Invitations and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <InvitationsList />
              <TeamActivityFeed agents={filteredAgents} />
            </div>

            {/* Performance Insights */}
            {stats && stats.direct_downlines > 0 && (
              <Alert className="p-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription>
                  <div className="text-[11px]">
                    <strong>Team Performance Insights</strong>
                    <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                      {stats.total_downlines < 5 && (
                        <p>• Build your team: You have {stats.total_downlines} agents. Consider recruiting more to increase override income.</p>
                      )}
                      {stats.total_override_income_mtd === 0 && (
                        <p>• No override income this month. Check agent activity and commission settings.</p>
                      )}
                      {stats.direct_downlines > 10 && (
                        <p>• Great team size! Focus on helping underperforming agents improve their results.</p>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

          </div>
        </div>
      </div>

      {/* Send Invitation Modal */}
      <SendInvitationModal
        open={sendInvitationModalOpen}
        onOpenChange={setSendInvitationModalOpen}
      />
    </>
  );
}