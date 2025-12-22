// src/features/hierarchy/components/OrgChartVisualization.tsx
// Phase 12A: Interactive org chart visualization with performance metrics

import React, { useState, useMemo, useCallback } from "react";
import {
  Building2,
  Users,
  User,
  ChevronDown,
  ChevronRight,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Home,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { OrgChartNode, OrgChartNodeType } from "@/types/hierarchy.types";

interface OrgChartVisualizationProps {
  data: OrgChartNode | null;
  onNodeClick?: (node: OrgChartNode) => void;
  onDrillDown?: (node: OrgChartNode) => void;
  className?: string;
  showMetrics?: boolean;
}

interface NodeCardProps {
  node: OrgChartNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  showMetrics: boolean;
  onToggle: () => void;
  onClick: () => void;
  onDrillDown: () => void;
  searchTerm: string;
}

// Node type styling configuration - using CSS variables
const nodeTypeConfig: Record<
  OrgChartNodeType,
  {
    icon: typeof Building2;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    label: string;
  }
> = {
  imo: {
    icon: Building2,
    bgColor: "bg-muted",
    borderColor: "border-border",
    iconColor: "text-foreground",
    label: "IMO",
  },
  agency: {
    icon: Users,
    bgColor: "bg-muted",
    borderColor: "border-border",
    iconColor: "text-foreground",
    label: "Agency",
  },
  agent: {
    icon: User,
    bgColor: "bg-card",
    borderColor: "border-border",
    iconColor: "text-muted-foreground",
    label: "Agent",
  },
};

/**
 * Individual node card in the org chart
 */
const NodeCard: React.FC<NodeCardProps> = ({
  node,
  depth: _depth,
  isExpanded,
  isSelected,
  showMetrics,
  onToggle,
  onClick,
  onDrillDown,
  searchTerm,
}) => {
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;
  const hasChildren = node.children && node.children.length > 0;

  // Check if node matches search
  const matchesSearch =
    searchTerm === "" ||
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.code?.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div
      className={cn(
        "relative rounded-lg border p-2.5 transition-all cursor-pointer min-w-[200px] max-w-[280px]",
        "bg-card border-border shadow-sm",
        "hover:bg-accent hover:shadow-md",
        "active:bg-accent/80 active:shadow-none",
        isSelected && "ring-2 ring-ring ring-offset-1",
        matchesSearch && searchTerm && "ring-2 ring-ring/50",
      )}
      onClick={onClick}
    >
      {/* Header with icon and expand button */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {node.profilePhotoUrl || node.logoUrl ? (
            <img
              src={node.profilePhotoUrl || node.logoUrl || ""}
              alt={node.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {node.type !== "agent" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDrillDown();
                    }}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Focus on this {node.type}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Name and details */}
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-foreground truncate">
          {node.name}
        </div>
        {node.email && (
          <div className="text-[10px] text-muted-foreground truncate">
            {node.email}
          </div>
        )}
        {node.code && (
          <div className="text-[10px] text-muted-foreground/70 truncate">
            Code: {node.code}
          </div>
        )}
        {node.contractLevel !== undefined && (
          <div className="text-[10px] text-muted-foreground">
            Contract: L{node.contractLevel}
          </div>
        )}
      </div>

      {/* Metrics overlay */}
      {showMetrics && node.metrics && (
        <div className="mt-2 pt-2 border-t border-border space-y-0.5">
          {node.metrics.agentCount !== undefined && (
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Agents</span>
              <span className="font-mono font-medium text-foreground">
                {formatNumber(node.metrics.agentCount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Policies</span>
            <span className="font-mono font-medium text-foreground">
              {formatNumber(node.metrics.activePolicyCount)}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Premium</span>
            <span className="font-mono font-medium text-[hsl(var(--success))]">
              {formatCurrency(node.metrics.totalAnnualPremium)}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">YTD Comm.</span>
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(node.metrics.totalCommissionsYtd)}
            </span>
          </div>
        </div>
      )}

      {/* Children count indicator */}
      {hasChildren && !isExpanded && (
        <div className="mt-1.5 text-[9px] text-muted-foreground text-center">
          +{node.children.length}{" "}
          {node.children.length === 1 ? "child" : "children"}
        </div>
      )}
    </div>
  );
};

/**
 * Recursive tree node renderer
 */
const TreeNode: React.FC<{
  node: OrgChartNode;
  depth: number;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  showMetrics: boolean;
  searchTerm: string;
  onToggle: (nodeId: string) => void;
  onSelect: (node: OrgChartNode) => void;
  onDrillDown: (node: OrgChartNode) => void;
}> = ({
  node,
  depth,
  expandedNodes,
  selectedNodeId,
  showMetrics,
  searchTerm,
  onToggle,
  onSelect,
  onDrillDown,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  // Check if node or any descendants match search
  const nodeMatchesSearch =
    searchTerm === "" ||
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.email?.toLowerCase().includes(searchTerm.toLowerCase());

  const hasMatchingDescendants = useMemo(() => {
    if (!searchTerm || !hasChildren) return false;

    const checkDescendants = (n: OrgChartNode): boolean => {
      if (
        n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return true;
      }
      return n.children?.some((child) => checkDescendants(child)) || false;
    };

    return node.children?.some((child) => checkDescendants(child)) || false;
  }, [node, searchTerm, hasChildren]);

  // Skip if doesn't match search and no matching descendants
  if (searchTerm && !nodeMatchesSearch && !hasMatchingDescendants) {
    return null;
  }

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        depth={depth}
        isExpanded={isExpanded}
        isSelected={selectedNodeId === node.id}
        showMetrics={showMetrics}
        searchTerm={searchTerm}
        onToggle={() => onToggle(node.id)}
        onClick={() => onSelect(node)}
        onDrillDown={() => onDrillDown(node)}
      />

      {/* Children container */}
      {hasChildren && isExpanded && (
        <div className="relative mt-4">
          {/* Vertical connector line */}
          <div className="absolute left-1/2 -top-4 w-px h-4 bg-border" />

          {/* Horizontal line above children */}
          {node.children.length > 1 && (
            <div
              className="absolute top-0 h-px bg-border"
              style={{
                left: "calc(50% / " + node.children.length + ")",
                right: "calc(50% / " + node.children.length + ")",
              }}
            />
          )}

          {/* Children */}
          <div className="flex gap-4 justify-center flex-wrap">
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                {/* Vertical connector to child */}
                <div className="absolute left-1/2 -top-4 w-px h-4 bg-border" />
                <TreeNode
                  node={child}
                  depth={depth + 1}
                  expandedNodes={expandedNodes}
                  selectedNodeId={selectedNodeId}
                  showMetrics={showMetrics}
                  searchTerm={searchTerm}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onDrillDown={onDrillDown}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main org chart visualization component
 */
export const OrgChartVisualization: React.FC<OrgChartVisualizationProps> = ({
  data,
  onNodeClick,
  onDrillDown,
  className,
  showMetrics = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Start with first two levels expanded
    const initial = new Set<string>();
    if (data) {
      initial.add(data.id);
      data.children?.forEach((child) => initial.add(child.id));
    }
    return initial;
  });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [focusedNode, setFocusedNode] = useState<OrgChartNode | null>(null);
  const [showMetricsOverlay, setShowMetricsOverlay] = useState(showMetrics);

  // Breadcrumb path to focused node
  const [breadcrumbs, setBreadcrumbs] = useState<OrgChartNode[]>([]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle node selection
  const handleSelect = useCallback(
    (node: OrgChartNode) => {
      setSelectedNodeId(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  // Handle drill-down
  const handleDrillDown = useCallback(
    (node: OrgChartNode) => {
      setBreadcrumbs((prev) => [...prev, focusedNode || data!]);
      setFocusedNode(node);
      setExpandedNodes(new Set([node.id]));
      onDrillDown?.(node);
    },
    [focusedNode, data, onDrillDown],
  );

  // Reset to root
  const handleResetToRoot = useCallback(() => {
    setFocusedNode(null);
    setBreadcrumbs([]);
    if (data) {
      setExpandedNodes(new Set([data.id]));
    }
  }, [data]);

  // Navigate breadcrumb
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index === -1) {
        handleResetToRoot();
      } else {
        const targetNode = breadcrumbs[index];
        setFocusedNode(targetNode);
        setBreadcrumbs((prev) => prev.slice(0, index));
        setExpandedNodes(new Set([targetNode.id]));
      }
    },
    [breadcrumbs, handleResetToRoot],
  );

  // Expand/collapse all
  const expandAll = useCallback(() => {
    const getAllIds = (node: OrgChartNode): string[] => {
      const ids = [node.id];
      node.children?.forEach((child) => ids.push(...getAllIds(child)));
      return ids;
    };
    const rootNode = focusedNode || data;
    if (rootNode) {
      setExpandedNodes(new Set(getAllIds(rootNode)));
    }
  }, [focusedNode, data]);

  const collapseAll = useCallback(() => {
    const rootNode = focusedNode || data;
    if (rootNode) {
      setExpandedNodes(new Set([rootNode.id]));
    }
  }, [focusedNode, data]);

  // Auto-expand on search
  useMemo(() => {
    if (searchTerm) {
      expandAll();
    }
  }, [searchTerm, expandAll]);

  // Calculate stats for current view
  const stats = useMemo(() => {
    const rootNode = focusedNode || data;
    if (!rootNode) return null;

    const countAll = (
      node: OrgChartNode,
    ): { nodes: number; agents: number } => {
      let nodes = 1;
      let agents = node.type === "agent" ? 1 : 0;
      node.children?.forEach((child) => {
        const childCounts = countAll(child);
        nodes += childCounts.nodes;
        agents += childCounts.agents;
      });
      return { nodes, agents };
    };

    return countAll(rootNode);
  }, [focusedNode, data]);

  // Display data (focused or root)
  const displayData = focusedNode || data;

  if (!displayData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No organization data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          {/* Title and stats */}
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Chart
              </CardTitle>
              {stats && (
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.nodes} nodes &bull; {stats.agents} agents
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetricsOverlay(!showMetricsOverlay)}
                className={cn(
                  "text-xs gap-1",
                  showMetricsOverlay && "bg-primary/10",
                )}
              >
                <TrendingUp className="h-3 w-3" />
                Metrics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="text-xs"
              >
                Collapse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="text-xs"
              >
                Expand
              </Button>
            </div>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleResetToRoot}
              >
                <Home className="h-3 w-3 mr-1" />
                Root
              </Button>
              {breadcrumbs.map((node, index) => (
                <React.Fragment key={node.id}>
                  <span className="text-muted-foreground">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    {node.name}
                  </Button>
                </React.Fragment>
              ))}
              <span className="text-muted-foreground">/</span>
              <span className="text-xs font-medium text-foreground">
                {displayData.name}
              </span>
            </div>
          )}

          {/* Search and zoom controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8"
              />
            </div>
            <div className="flex items-center gap-1 border rounded-md px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                disabled={zoomLevel <= 50}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-xs w-10 text-center">{zoomLevel}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                disabled={zoomLevel >= 150}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className="overflow-auto"
          style={{
            maxHeight: "calc(100vh - 350px)",
            minHeight: "400px",
          }}
        >
          <div
            className="flex justify-center p-4 min-w-fit"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
            }}
          >
            <TreeNode
              node={displayData}
              depth={0}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              showMetrics={showMetricsOverlay}
              searchTerm={searchTerm}
              onToggle={toggleNode}
              onSelect={handleSelect}
              onDrillDown={handleDrillDown}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgChartVisualization;
