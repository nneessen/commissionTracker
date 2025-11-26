// src/features/recruiting/components/RecruitListTable.tsx

import React from 'react';
import { UserProfile } from '@/types/hierarchy.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ONBOARDING_STATUS_COLORS } from '@/types/recruiting';
import { formatDistanceToNow } from 'date-fns';

interface RecruitListTableProps {
  recruits: UserProfile[];
  isLoading?: boolean;
  selectedRecruitId?: string;
  onSelectRecruit: (recruit: UserProfile) => void;
}

export function RecruitListTable({
  recruits,
  isLoading,
  selectedRecruitId,
  onSelectRecruit,
}: RecruitListTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (recruits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No recruits found
      </div>
    );
  }

  const getStatusIndicator = (recruit: UserProfile) => {
    const status = recruit.onboarding_status;
    const updatedAt = new Date(recruit.updated_at || recruit.created_at);
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // 🟢 on-track: active, updated within 7 days
    // 🟡 needs attention: updated 7-14 days ago OR lead status
    // 🔴 blocked/dropped OR stale (>14 days no update)

    if (status === 'dropped') return '🔴';
    if (status === 'completed') return '✅';
    if (daysSinceUpdate > 14) return '🔴';
    if (daysSinceUpdate > 7 || status === 'lead') return '🟡';
    return '🟢';
  };

  return (
    <div className="border rounded-lg overflow-auto max-h-[calc(100vh-200px)]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Current Phase</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recruits.map((recruit) => (
            <TableRow
              key={recruit.id}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                selectedRecruitId === recruit.id ? 'bg-muted' : ''
              }`}
              onClick={() => onSelectRecruit(recruit)}
            >
              <TableCell className="text-center">
                <span className="text-lg">{getStatusIndicator(recruit)}</span>
              </TableCell>
              <TableCell className="font-medium">
                {recruit.first_name} {recruit.last_name}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {recruit.current_onboarding_phase?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                    'Not started'}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={recruit.onboarding_status ? ONBOARDING_STATUS_COLORS[recruit.onboarding_status] : ONBOARDING_STATUS_COLORS.lead}
                >
                  {recruit.onboarding_status || 'lead'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {recruit.updated_at
                  ? formatDistanceToNow(new Date(recruit.updated_at), { addSuffix: true })
                  : 'Never'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
