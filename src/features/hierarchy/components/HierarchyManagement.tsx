// src/features/hierarchy/components/HierarchyManagement.tsx

import React, { useState } from 'react';
import { Users, Shield, AlertCircle, CheckCircle, Edit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Alert, AlertDescription } from '@/components/ui/alert';
import showToast from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMyDownlines, useUpdateAgentHierarchy } from '@/hooks';
import type { UserProfile, HierarchyChangeRequest } from '@/types/hierarchy.types';

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
    (a) => a.id !== agent?.id && !a.hierarchy_path.includes(agent?.id || '')
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
  const { user } = useAuth();
  const { data: downlines, isLoading } = useMyDownlines();
  const updateHierarchy = useUpdateAgentHierarchy();

  const [selectedAgent, setSelectedAgent] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if user is admin (basic check - enhance with proper admin role check)
  const isAdmin = user?.email === 'nick@nickneessen.com';

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

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Hierarchy Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage agent hierarchy assignments and organizational structure
              </p>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Email</TableHead>
                    <TableHead>Current Upline</TableHead>
                    <TableHead>Hierarchy Level</TableHead>
                    <TableHead>Direct Downlines</TableHead>
                    <TableHead>Total Downlines</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downlines.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.email}</TableCell>
                      <TableCell>
                        {agent.upline_id ? (
                          <span className="text-sm text-muted-foreground">
                            {downlines.find((d) => d.id === agent.upline_id)?.email ||
                              'Unknown'}
                          </span>
                        ) : (
                          <Badge variant="outline">Root Agent</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          Level {agent.hierarchy_depth}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {downlines.filter((d) => d.upline_id === agent.id).length}
                      </TableCell>
                      <TableCell className="text-center">
                        {downlines.filter((d) => d.hierarchy_path.includes(agent.id)).length}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAgent(agent)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditHierarchyDialog
        agent={selectedAgent}
        allAgents={downlines || []}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveHierarchy}
      />
    </div>
  );
}
