// src/features/training-hub/components/AutomationTab.tsx

import { useState } from 'react';
import { Plus, Play, Pause, Trash2, Edit, Settings, Clock, Zap, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflows, useWorkflowRuns, useUpdateWorkflowStatus, useDeleteWorkflow, useTriggerWorkflow } from '@/hooks/workflows';
import WorkflowDialog from './WorkflowDialog';
import type { Workflow } from '@/types/workflow.types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function AutomationTab() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);

  const { data: workflows = [], isLoading, error } = useWorkflows();
  const { data: runs = [] } = useWorkflowRuns(undefined, 10);
  const updateStatus = useUpdateWorkflowStatus();
  const deleteWorkflow = useDeleteWorkflow();
  const triggerWorkflow = useTriggerWorkflow();

  if (!user) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Please log in to view workflows</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading workflows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-destructive">Error loading workflows</p>
        <p className="text-xs text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const workflowToDelete = deleteWorkflowId
    ? workflows.find((w) => w.id === deleteWorkflowId)
    : null;

  const handleDeleteConfirm = async () => {
    if (deleteWorkflowId) {
      deleteWorkflow.mutate(deleteWorkflowId);
      setDeleteWorkflowId(null);
    }
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500'
  };

  const triggerIcons = {
    manual: <Play className="h-3 w-3" />,
    schedule: <Clock className="h-3 w-3" />,
    event: <Zap className="h-3 w-3" />,
    webhook: <Mail className="h-3 w-3" />
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-sm text-muted-foreground">
            {runs.length} recent run{runs.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setEditingWorkflow(null);
            setShowDialog(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-2 gap-2 flex-1 overflow-auto">
        {/* Workflows List */}
        <div className="rounded-lg border p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">
            Active Workflows
          </div>
          {workflows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">No workflows created yet</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDialog(true)}
              >
                Create Your First Workflow
              </Button>
            </div>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow className="h-7">
                    <TableHead className="text-[10px] py-1">Name</TableHead>
                    <TableHead className="text-[10px] py-1">Type</TableHead>
                    <TableHead className="text-[10px] py-1">Status</TableHead>
                    <TableHead className="text-[10px] py-1 w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((workflow) => (
                    <TableRow key={workflow.id} className="h-8">
                      <TableCell className="py-1">
                        <div>
                          <div className="text-xs font-medium">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {workflow.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex items-center gap-1">
                          {triggerIcons[workflow.triggerType]}
                          <span className="text-[10px]">{workflow.triggerType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] py-0 px-1", statusColors[workflow.status])}
                        >
                          {workflow.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            {workflow.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => triggerWorkflow.mutate({ workflowId: workflow.id })}
                                className="text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Run Now
                              </DropdownMenuItem>
                            )}
                            {workflow.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: workflow.id, status: 'paused' })}
                                className="text-xs"
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {workflow.status === 'paused' && (
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: workflow.id, status: 'active' })}
                                className="text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingWorkflow(workflow);
                                setShowDialog(true);
                              }}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs text-red-600"
                              onClick={() => setDeleteWorkflowId(workflow.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </div>

        {/* Recent Runs */}
        <div className="rounded-lg border p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">
            Recent Runs
          </div>
          {runs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No workflow runs yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex-1">
                    <div className="text-xs font-medium">
                      {run.workflow?.name || 'Unknown Workflow'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] py-0 px-1",
                      run.status === 'completed' && "bg-green-100 text-green-700",
                      run.status === 'failed' && "bg-red-100 text-red-700",
                      run.status === 'running' && "bg-blue-100 text-blue-700"
                    )}
                  >
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <WorkflowDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        workflow={editingWorkflow}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWorkflowId} onOpenChange={(open) => !open && setDeleteWorkflowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{workflowToDelete?.name}"? This action cannot be undone.
              All associated runs and history will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}