// src/features/hierarchy/components/HierarchyManagement.tsx

import React, { useState } from 'react';
import {Shield, AlertCircle, Edit} from 'lucide-react';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Empty, EmptyHeader, EmptyTitle, EmptyDescription} from '@/components/ui/empty';
import {Alert, AlertDescription} from '@/components/ui/alert';
import showToast from '@/utils/toast';
import {useMyDownlines, useUpdateAgentHierarchy, useCurrentUserProfile} from '@/hooks';
import type {UserProfile, HierarchyChangeRequest} from '@/types/hierarchy.types';

interface HierarchyManagementProps {
  className?: string;
}

/**
 * Dialog for editing agent hierarchy assignment
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
            <AlertCircle className="h-4 w-4" />
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
 * HierarchyManagement - Admin-only component for managing agent hierarchy assignments
 * Allows admins to assign agents to uplines and manage the org structure
 */
export function HierarchyManagement({ className }: HierarchyManagementProps) {
  const { data: downlines, isLoading } = useMyDownlines();
  const updateHierarchy = useUpdateAgentHierarchy();
  const { data: profile } = useCurrentUserProfile();

  const [selectedAgent, setSelectedAgent] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check admin status from database profile
  const isAdmin = profile?.is_admin === true;

  const handleEditAgent = (agent: UserProfile) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  const handleSaveHierarchy = async (request: HierarchyChangeRequest) => {
    await updateHierarchy.mutateAsync(request);
  };

  if (!isAdmin) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Hierarchy Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to manage hierarchy. This feature is restricted to
              administrators only.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Group agents by hierarchy level
  const agentsByLevel = (downlines || []).reduce((acc, agent) => {
    const level = agent.hierarchy_depth ?? 0;
    if (!acc[level]) acc[level] = [];
    acc[level].push(agent);
    return acc;
  }, {} as Record<number, UserProfile[]>);

  const levels = Object.keys(agentsByLevel).map(Number).sort((a, b) => a - b);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              Hierarchy Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {downlines?.length || 0} agents across {levels.length} levels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Admin Only</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Loading agents...</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : !downlines || downlines.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No agents in hierarchy</EmptyTitle>
              <EmptyDescription>
                Agents will appear here once they are added to the system
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-lg shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Reports To</TableHead>
                  <TableHead className="text-right">Direct</TableHead>
                  <TableHead className="text-right">Total Down</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downlines.map((agent) => {
                  const directDownlines = downlines.filter(d => d.upline_id === agent.id).length;
                  const totalDownlines = downlines.filter(d => (d.hierarchy_path || '').includes(agent.id) && d.id !== agent.id).length;
                  const uplineEmail = agent.upline_id
                    ? downlines.find(d => d.id === agent.upline_id)?.email
                    : null;

                  return (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.email}</TableCell>
                      <TableCell>
                        <span className="text-xs">L{agent.hierarchy_depth}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {uplineEmail || <Badge variant="outline" className="text-xs">Root</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{directDownlines}</TableCell>
                      <TableCell className="text-right">{totalDownlines}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAgent(agent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <EditHierarchyDialog
        agent={selectedAgent}
        allAgents={downlines || []}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveHierarchy}
      />
    </Card>
  );
}
