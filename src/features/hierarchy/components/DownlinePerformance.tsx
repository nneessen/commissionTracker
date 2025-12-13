// src/features/hierarchy/components/DownlinePerformance.tsx

import React, { useState } from 'react';
import {Edit, Shield} from 'lucide-react';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Empty, EmptyHeader, EmptyTitle, EmptyDescription} from '@/components/ui/empty';
import {formatCurrency} from '@/lib/format';
import {useAllDownlinePerformance, useMyDownlines, useUpdateAgentHierarchy, useCurrentUserProfile} from '@/hooks';
import showToast from '@/utils/toast';
import type {UserProfile, HierarchyChangeRequest} from '@/types/hierarchy.types';

interface DownlinePerformanceProps {
  className?: string;
}

/**
 * Dialog for editing agent hierarchy assignment (admin only)
 */
function EditHierarchyDialog({
  agent,
  allAgents,
  open,
  onOpenChange,
  onSave,
}: {
  agent: UserProfile | null;
  allAgents: UserProfile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (request: HierarchyChangeRequest) => Promise<void>;
}) {
  const [selectedUplineId, setSelectedUplineId] = useState<string | null>(
    agent?.upline_id || null
  );
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!agent) return;

    setIsSaving(true);
    try {
      await onSave({
        agent_id: agent.id,
        new_upline_id: selectedUplineId,
        reason: reason || 'Hierarchy adjustment',
      });
      showToast.success('Hierarchy updated successfully');
      onOpenChange(false);
    } catch (error) {
      showToast.error('Failed to update hierarchy');
      console.error('Error updating hierarchy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter out the agent itself and its downlines to prevent circular references
  const availableUplines = allAgents.filter(
    (a) => a.id !== agent?.id && !(a.hierarchy_path || '').includes(agent?.id || '')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Hierarchy Assignment</DialogTitle>
          <DialogDescription>
            Assign {agent?.email} to a new upline or make them a root agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="upline">Upline Agent</Label>
            <select
              id="upline"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedUplineId || ''}
              onChange={(e) => setSelectedUplineId(e.target.value || null)}
            >
              <option value="">No Upline (Root Agent)</option>
              {availableUplines.map((upline) => (
                <option key={upline.id} value={upline.id}>
                  {upline.email} (Level {upline.hierarchy_depth})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <textarea
              id="reason"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="e.g., Agent transfer, organizational restructure"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Changing hierarchy will affect override calculations for all policies going forward.
              Existing overrides will not be recalculated.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * DownlinePerformance - Combined view of downline performance metrics and hierarchy management
 * Shows KPI metrics for all agents with admin actions for hierarchy editing
 */
export function DownlinePerformance({ className }: DownlinePerformanceProps) {
  const { data: performanceData, isLoading } = useAllDownlinePerformance();
  const { data: downlines } = useMyDownlines();
  const updateHierarchy = useUpdateAgentHierarchy();
  const { data: profile } = useCurrentUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const itemsPerPage = 50;

  // Check admin status from database profile
  const isAdmin = profile?.is_admin === true;

  // Filter by search term
  const filteredData = performanceData?.filter((d) =>
    d.agent_email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginate
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleEditAgent = (agentEmail: string) => {
    const agent = downlines?.find(d => d.email === agentEmail);
    if (agent) {
      setSelectedAgent(agent);
      setDialogOpen(true);
    }
  };

  const handleSaveHierarchy = async (request: HierarchyChangeRequest) => {
    await updateHierarchy.mutateAsync(request);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Downline Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Loading downline data...</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData || performanceData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Downline Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No downline agents yet</EmptyTitle>
              <EmptyDescription>
                When agents are assigned to your downline, their performance metrics will appear here
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Downline Performance</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Performance metrics and hierarchy management
              </p>
            </div>
            {isAdmin && (
              <Badge variant="outline">Admin Mode</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Input
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Policies</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Avg Premium</TableHead>
                  <TableHead className="text-right">Persistency</TableHead>
                  <TableHead className="text-right">Override Gen.</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground">
                      No agents found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((agent) => (
                    <TableRow key={agent.agent_id}>
                      <TableCell className="font-medium">{agent.agent_email}</TableCell>
                      <TableCell>
                        <span className="text-xs">L{agent.hierarchy_depth}</span>
                      </TableCell>
                      <TableCell className="text-right">{agent.policies_written}</TableCell>
                      <TableCell className="text-right">{agent.policies_active}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(agent.total_premium)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(agent.avg_premium)}
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.persistency_rate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(agent.total_overrides_generated)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAgent(agent.agent_email)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm rounded-lg shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 bg-card"
              >
                Previous
              </button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm rounded-lg shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 bg-card"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Hierarchy Dialog (Admin Only) */}
      {isAdmin && (
        <EditHierarchyDialog
          agent={selectedAgent}
          allAgents={downlines || []}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveHierarchy}
        />
      )}
    </div>
  );
}
