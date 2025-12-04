// src/features/hierarchy/components/AgentTable.tsx

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import showToast from '@/utils/toast';
import type { UserProfile } from '@/types/hierarchy.types';

// Extended agent type
interface Agent extends UserProfile {
  name?: string;
  is_active?: boolean;
  contract_level?: string;
  parent_agent_id?: string | null;
}

interface AgentTableProps {
  agents: Agent[];
  isLoading?: boolean;
}

interface AgentRowProps {
  agent: Agent;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
}

function AgentRow({ agent, depth, isExpanded, onToggle, hasChildren }: AgentRowProps) {
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState('');

  // Real data calculations (would need to be passed from parent or fetched)
  const mtdAP = 0; // Would come from actual policy/commission data for this agent
  const mtdPolicies = 0; // Would come from actual policy count for this month
  const overridePercent = agent.contract_level === 'Director' ? 5 :
                          agent.contract_level === 'Executive' ? 3 :
                          agent.contract_level === 'Senior' ? 2 : 1;
  const overrideAmount = mtdAP * (overridePercent / 100);
  const trend = 'flat'; // Would be calculated from comparing to previous period
  const isPerforming = mtdPolicies > 0; // Basic check if agent has any activity

  const handleSaveOverride = async () => {
    const value = parseFloat(overrideValue);
    if (isNaN(value) || value < 0 || value > 100) {
      showToast.error('Please enter a valid percentage between 0 and 100');
      return;
    }

    // Would make API call here
    showToast.success(`Override updated to ${value}%`);
    setIsEditingOverride(false);
    setOverrideValue('');
  };

  const handleCancelOverride = () => {
    setIsEditingOverride(false);
    setOverrideValue('');
  };

  // Contract level badge colors
  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'Director':
        return 'bg-purple-500/10 text-purple-600';
      case 'Executive':
        return 'bg-blue-500/10 text-blue-600';
      case 'Senior':
        return 'bg-emerald-500/10 text-emerald-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <tr className="border-b hover:bg-muted/20">
      {/* Agent Name with Hierarchy */}
      <td className="p-2 text-[11px]">
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
          <span className="font-medium">{agent.name || 'Unnamed Agent'}</span>
          {agent.is_active && (
            <span className="text-[9px] text-success">●</span>
          )}
        </div>
      </td>

      {/* Contract Level */}
      <td className="p-2">
        <span className={cn(
          "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium",
          getLevelBadgeClass(agent.contract_level || 'Associate')
        )}>
          {agent.contract_level || 'Associate'}
        </span>
      </td>

      {/* Status */}
      <td className="p-2 text-center">
        {agent.is_active ? (
          <UserCheck className="h-3 w-3 text-success inline" />
        ) : (
          <UserX className="h-3 w-3 text-muted-foreground inline" />
        )}
      </td>

      {/* MTD AP */}
      <td className="p-2 text-right text-[11px] font-mono font-semibold">
        {formatCurrency(mtdAP)}
      </td>

      {/* MTD Policies */}
      <td className="p-2 text-center text-[11px] font-mono">
        {mtdPolicies}
      </td>

      {/* Override % */}
      <td className="p-2 text-center">
        {!isEditingOverride ? (
          <button
            onClick={() => {
              setOverrideValue(overridePercent.toString());
              setIsEditingOverride(true);
            }}
            className="text-[11px] font-mono hover:underline"
          >
            {overridePercent}%
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveOverride();
                if (e.key === 'Escape') handleCancelOverride();
              }}
              className="w-12 h-5 text-[10px] px-1"
              autoFocus
            />
            <span className="text-[10px]">%</span>
            <Button
              size="sm"
              onClick={handleSaveOverride}
              className="h-5 px-1 text-[9px]"
            >
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelOverride}
              className="h-5 px-1 text-[9px]"
            >
              ✗
            </Button>
          </div>
        )}
      </td>

      {/* Override $ */}
      <td className="p-2 text-right text-[11px] font-mono font-bold text-success">
        {formatCurrency(overrideAmount)}
      </td>

      {/* Trend */}
      <td className="p-2 text-center">
        {trend === 'up' ? (
          <TrendingUp className="h-3 w-3 text-success inline" />
        ) : trend === 'down' ? (
          <TrendingDown className="h-3 w-3 text-error inline" />
        ) : (
          <Minus className="h-3 w-3 text-muted-foreground inline" />
        )}
      </td>

      {/* Actions */}
      <td className="p-2 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="text-xs">
              <Edit className="mr-1.5 h-3 w-3" />
              Edit Agent
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              View Commissions
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs">
              Send Message
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive text-xs">
              Remove from Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export function AgentTable({ agents, isLoading }: AgentTableProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  // Build hierarchy structure
  const agentMap = new Map(agents.map(a => [a.id, a]));
  const rootAgents = agents.filter(a => !a.parent_agent_id || !agentMap.has(a.parent_agent_id));
  const childrenMap = new Map<string, Agent[]>();

  agents.forEach(agent => {
    if (agent.parent_agent_id && agentMap.has(agent.parent_agent_id)) {
      const children = childrenMap.get(agent.parent_agent_id) || [];
      children.push(agent);
      childrenMap.set(agent.parent_agent_id, children);
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

  // Recursively render agents with their children
  const renderAgentRows = (agentList: Agent[], depth = 0): React.ReactElement[] => {
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
        />
      );

      if (isExpanded && children.length > 0) {
        rows.push(...renderAgentRows(children, depth + 1));
      }
    });

    return rows;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-[11px] font-medium text-muted-foreground">
                  Agent
                </th>
                <th className="text-left p-2 text-[11px] font-medium text-muted-foreground">
                  Level
                </th>
                <th className="text-center p-2 text-[11px] font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right p-2 text-[11px] font-medium text-muted-foreground">
                  MTD AP
                </th>
                <th className="text-center p-2 text-[11px] font-medium text-muted-foreground">
                  Policies
                </th>
                <th className="text-center p-2 text-[11px] font-medium text-muted-foreground">
                  Override %
                </th>
                <th className="text-right p-2 text-[11px] font-medium text-muted-foreground">
                  Override $
                </th>
                <th className="text-center p-2 text-[11px] font-medium text-muted-foreground">
                  Trend
                </th>
                <th className="text-center p-2 text-[11px] font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <div className="text-[11px] text-muted-foreground">
                      Loading team members...
                    </div>
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
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
                renderAgentRows(rootAgents)
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}