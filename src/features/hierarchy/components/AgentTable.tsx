// src/features/hierarchy/components/AgentTable.tsx

import React, { useState, useEffect } from 'react';
import {useNavigate} from '@tanstack/react-router';
import {ChevronRight, ChevronDown, ChevronLeft, MoreVertical, Eye, Edit, UserCheck, UserX, MessageCircle, UserMinus} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {formatCurrency, formatPercent} from '@/lib/format';
import showToast from '@/utils/toast';
import type {UserProfile} from '@/types/hierarchy.types';
import {useQuery} from '@tanstack/react-query';
import {hierarchyService} from '@/services/hierarchy/hierarchyService';
// import {policyService} from '@/services/policies/policyService';
// import {commissionService} from '@/services/commissions/commissionService';
import {supabase} from '@/services/base/supabase';

interface AgentWithMetrics extends UserProfile {
  // Real calculated metrics
  mtd_ap?: number;
  mtd_policies?: number;
  override_spread?: number; // Actual spread between agent and upline contract levels
  override_amount?: number;
  upline_contract_level?: number;
}

interface AgentTableProps {
  agents: UserProfile[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Fetch real metrics for an agent using service layer
async function fetchAgentMetrics(agentId: string): Promise<{
  mtd_ap: number;
  mtd_policies: number;
  override_amount: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = now;

  // Get policies for this agent for the current month
  const policyData = await hierarchyService.getAgentPolicies(agentId);
  const policies = policyData.policies || [];

  const mtdPolicies = policies.filter((p: any) => {
    const pDate = new Date(p.issueDate || '');
    return pDate >= startOfMonth && pDate <= endOfMonth;
  });

  const mtdMetrics = mtdPolicies.reduce(
    (acc: { policies: number; ap: number }, policy: any) => {
      acc.policies++;
      if (policy.status === 'active') {
        acc.ap += parseFloat(String(policy.annualPremium) || '0');
      }
      return acc;
    },
    { policies: 0, ap: 0 }
  );

  // Get override commissions for this month
  // getAgentOverrides returns { mtd, ytd } not an array
  const overrides = await hierarchyService.getAgentOverrides(agentId);
  const overrideAmount = overrides.mtd || 0;

  return {
    mtd_ap: mtdMetrics.ap,
    mtd_policies: mtdMetrics.policies,
    override_amount: overrideAmount,
  };
}

function AgentRow({
  agent,
  depth,
  isExpanded,
  onToggle,
  hasChildren,
  uplineContractLevel,
  onRemove,
}: {
  agent: AgentWithMetrics;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  uplineContractLevel: number | null;
  onRemove: (agent: AgentWithMetrics) => void;
}) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    mtd_ap: 0,
    mtd_policies: 0,
    override_amount: 0,
  });

  // Fetch real metrics for this agent
  useEffect(() => {
    fetchAgentMetrics(agent.id).then(setMetrics);
  }, [agent.id]);

  // Calculate real override spread
  // If viewing from upline's perspective: spread = upline level - agent level
  // For the agent row, we're showing what the upline earns from this agent
  const agentContractLevel = agent.contract_level || 100; // Default to 100%
  const uplineLevel = uplineContractLevel || 100;

  // Debug: Log what we're getting
  console.log('Debug Override Calculation:', {
    agentEmail: agent.email,
    agentContractLevel,
    uplineLevel,
    agentData: agent,
    hasContractLevel: 'contract_level' in agent,
    uplineContractLevel
  });

  const overrideSpread = uplineLevel > agentContractLevel ? uplineLevel - agentContractLevel : 0;

  // Determine status display based on actual fields
  const getStatusDisplay = () => {
    if (agent.current_onboarding_phase) {
      return {
        label: agent.current_onboarding_phase,
        className: 'bg-blue-500/10 text-blue-600',
      };
    }
    switch (agent.approval_status) {
      case 'approved':
        return {
          label: `Level ${agent.contract_level || 100}`,
          className: 'bg-emerald-500/10 text-emerald-600',
        };
      case 'pending':
        return {
          label: 'Pending Approval',
          className: 'bg-yellow-500/10 text-yellow-600',
        };
      case 'denied':
        return {
          label: 'Denied',
          className: 'bg-red-500/10 text-red-600',
        };
      default:
        return {
          label: agent.onboarding_status || 'Unknown',
          className: 'bg-gray-500/10 text-gray-600',
        };
    }
  };

  const handleViewDetails = () => {
    navigate({
      to: '/hierarchy/agent/$agentId',
      params: { agentId: agent.id },
    });
  };

  const handleEditAgent = () => {
    // Will implement edit modal
    showToast.success('Edit functionality coming soon');
  };

  const handleSendMessage = () => {
    // Navigate to email composer or open message modal
    showToast.success('Message functionality coming soon');
  };

  const statusDisplay = getStatusDisplay();

  return (
    <tr className="hover:bg-muted/50">
      {/* Agent Name with Hierarchy */}
      <td className="px-2 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-4 w-4 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!hasChildren && depth > 0 && (
            <span className="text-muted-foreground/50 text-[10px] mr-1">└─</span>
          )}
          <span className="font-medium">
            {agent.first_name && agent.last_name
              ? `${agent.first_name} ${agent.last_name}`
              : agent.email}
          </span>
          {agent.approval_status === 'approved' && (
            <UserCheck className="h-3 w-3 text-success" />
          )}
        </div>
      </td>

      {/* Phase/Status */}
      <td className="px-2 py-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            'inline-block px-1.5 py-0.5 rounded text-[9px] font-medium',
            statusDisplay.className
          )}
        >
          {statusDisplay.label}
        </span>
      </td>

      {/* MTD AP */}
      <td className="px-2 py-1.5 text-right text-xs font-mono">
        {metrics.mtd_ap > 0 ? (
          <span className="font-semibold text-foreground">{formatCurrency(metrics.mtd_ap)}</span>
        ) : (
          <span className="text-muted-foreground">$0</span>
        )}
      </td>

      {/* MTD Policies */}
      <td className="px-2 py-1.5 text-center text-xs font-mono">
        {metrics.mtd_policies > 0 ? (
          <span className="font-semibold text-foreground">{metrics.mtd_policies}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>

      {/* Override Spread % */}
      <td className="px-2 py-1.5 text-center text-xs font-mono">
        {overrideSpread > 0 ? (
          <span className="font-medium text-emerald-600">{overrideSpread}%</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Override $ MTD */}
      <td className="px-2 py-1.5 text-right text-xs font-mono">
        {metrics.override_amount > 0 ? (
          <span className="font-bold text-emerald-600">
            {formatCurrency(metrics.override_amount)}
          </span>
        ) : (
          <span className="text-muted-foreground">$0</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-2 py-1.5 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="text-xs" onClick={handleViewDetails}>
              <Eye className="mr-1.5 h-3 w-3" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={handleEditAgent}>
              <Edit className="mr-1.5 h-3 w-3" />
              Edit Agent
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={handleSendMessage}>
              <MessageCircle className="mr-1.5 h-3 w-3" />
              Send Message
            </DropdownMenuItem>
            {depth > 0 && (
              <DropdownMenuItem
                className="text-destructive text-xs"
                onClick={() => onRemove(agent)}
              >
                <UserMinus className="mr-1.5 h-3 w-3" />
                Remove from Team
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export function AgentTable({ agents, isLoading, onRefresh }: AgentTableProps) {
  const _navigate = useNavigate();
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [agentToRemove, setAgentToRemove] = useState<AgentWithMetrics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Get current user's contract level for override calculation
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, contract_level')
        .eq('id', user.id)
        .single();

      console.log('Current User Profile:', profile);
      return profile;
    }
  });

  // Add current user's contract level to agents that are direct downlines
  const { data: agentsWithUplines } = useQuery({
    queryKey: ['agents-with-uplines', agents, currentUser],
    queryFn: async () => {
      if (!currentUser) return agents;

      console.log('Processing agents with uplines:', {
        agents,
        currentUserId: currentUser.id,
        currentUserContractLevel: currentUser.contract_level
      });

      // For each agent, determine their upline's contract level
      return agents.map(agent => {
        // If this agent's upline is the current user, use current user's contract level
        if (agent.upline_id === currentUser.id) {
          return {
            ...agent,
            upline_contract_level: currentUser.contract_level || 100
          };
        }

        // Otherwise, this agent might be a downline of a downline, don't show override
        return {
          ...agent,
          upline_contract_level: null
        };
      });
    },
    enabled: agents.length > 0 && !!currentUser,
  });

  const agentsToDisplay = agentsWithUplines || agents;

  // Build hierarchy structure
  const agentMap = new Map(agentsToDisplay.map(a => [a.id, a]));
  const rootAgents = agentsToDisplay.filter(
    a => !a.upline_id || !agentMap.has(a.upline_id)
  );
  const childrenMap = new Map<string, AgentWithMetrics[]>();

  agentsToDisplay.forEach(agent => {
    if (agent.upline_id && agentMap.has(agent.upline_id)) {
      const children = childrenMap.get(agent.upline_id) || [];
      children.push(agent as AgentWithMetrics);
      childrenMap.set(agent.upline_id, children);
    }
  });

  const toggleExpanded = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  const handleRemoveAgent = async () => {
    if (!agentToRemove) return;

    try {
      // Remove the agent from the upline's team using service
      await hierarchyService.updateAgentHierarchy({
        agent_id: agentToRemove.id,
        new_upline_id: null,
        reason: 'Removed from team by upline'
      });

      showToast.success(`${agentToRemove.email} removed from team`);
      setAgentToRemove(null);
      onRefresh?.();
    } catch (error) {
      console.error('Error removing agent:', error);
      showToast.error('Failed to remove agent from team');
    }
  };

  // Pagination calculations
  const totalRootAgents = rootAgents.length;
  const totalPages = Math.ceil(totalRootAgents / rowsPerPage);

  // Ensure current page is valid
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Paginate root agents
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRootAgents = rootAgents.slice(startIndex, endIndex);

  // Reset to first page when rowsPerPage changes
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Recursively render agents with their children
  const renderAgentRows = (
    agentList: AgentWithMetrics[],
    depth = 0
  ): React.ReactElement[] => {
    const rows: React.ReactElement[] = [];

    agentList.forEach(agent => {
      const children = childrenMap.get(agent.id) || [];
      const isExpanded = expandedAgents.has(agent.id);

      rows.push(
        <AgentRow
          key={agent.id}
          agent={agent}
          depth={depth}
          isExpanded={isExpanded}
          onToggle={() => toggleExpanded(agent.id)}
          hasChildren={children.length > 0}
          uplineContractLevel={agent.upline_contract_level || null}
          onRemove={setAgentToRemove}
        />
      );

      if (isExpanded && children.length > 0) {
        rows.push(...renderAgentRows(children, depth + 1));
      }
    });

    return rows;
  };

  return (
    <>
      <div className="bg-card rounded-md shadow-sm border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold text-foreground text-xs">
                  Agent
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-foreground text-xs">
                  Status
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-foreground text-xs">
                  MTD AP
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-foreground text-xs">
                  Policies
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-foreground text-xs">
                  Override %
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-foreground text-xs">
                  Override $
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-foreground text-xs">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="text-[11px] text-muted-foreground">
                        Loading team members...
                      </div>
                    </td>
                  </tr>
                ) : agentsToDisplay.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-1">
                        <UserX className="h-6 w-6 text-muted-foreground/30" />
                        <span className="text-[11px] text-muted-foreground">
                          No team members found
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Start by inviting agents to join your team
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  renderAgentRows(paginatedRootAgents as AgentWithMetrics[])
                )}
              </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalRootAgents > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Total: {totalRootAgents} agent{totalRootAgents !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page:</span>
                <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Remove Agent Confirmation Dialog */}
      <AlertDialog
        open={!!agentToRemove}
        onOpenChange={() => setAgentToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Agent from Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              <span className="font-semibold">{agentToRemove?.email}</span> from
              your team hierarchy. They will no longer be your downline and you
              will not receive overrides from their production.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAgent}
              className="bg-destructive text-destructive-foreground"
            >
              Remove from Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}