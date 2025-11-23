// src/features/hierarchy/components/HierarchyTree.tsx

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, User, Mail, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { HierarchyNode } from '@/types/hierarchy.types';

interface HierarchyTreeProps {
  nodes: HierarchyNode[];
  onNodeClick?: (node: HierarchyNode) => void;
  className?: string;
}

interface TreeNodeProps {
  node: HierarchyNode;
  level: number;
  onNodeClick?: (node: HierarchyNode) => void;
}

/**
 * Recursive tree node component for displaying individual agents in the hierarchy
 */
function TreeNode({ node, level, onNodeClick }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0); // Root node expanded by default

  const hasChildren = node.children && node.children.length > 0;
  const indentation = level * 24; // 24px per level

  return (
    <div className="w-full">
      {/* Node Row */}
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded-lg transition-colors',
          'hover:bg-accent/10 cursor-pointer border-l-2',
          level === 0 ? 'border-l-primary' : 'border-l-muted',
        )}
        style={{ paddingLeft: `${indentation + 12}px` }}
        onClick={() => onNodeClick?.(node)}
      >
        {/* Expand/Collapse Button */}
        <div className="flex-shrink-0">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        {/* Agent Icon */}
        <div className="flex-shrink-0">
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            level === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <User className="h-4 w-4" />
          </div>
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{node.email}</span>
            {level === 0 && (
              <Badge variant="secondary" className="text-primary">
                You
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Level {node.hierarchy_depth}
            </span>
            {hasChildren && (
              <span>
                {node.direct_downline_count} direct · {node.downline_count} total
              </span>
            )}
          </div>
        </div>

        {/* Stats (placeholder for override earnings) */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span className="text-xs">Override</span>
          </div>
        </div>
      </div>

      {/* Children (Recursive) */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * HierarchyTree - Displays the agency hierarchy as a recursive tree structure
 * Shows agent email, hierarchy level, downline counts, and override earnings
 */
export function HierarchyTree({ nodes, onNodeClick, className }: HierarchyTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hierarchy data available</p>
            <p className="text-sm mt-1">You are a root agent with no downlines</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Organization Chart</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          View your downline structure and team hierarchy
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {nodes.map((node) => (
            <TreeNode key={node.id} node={node} level={0} onNodeClick={onNodeClick} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
