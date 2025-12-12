// src/features/training-hub/components/AutomationTab.tsx

import { useState } from 'react';
import { Plus, Play, Pause, Trash2, Edit, Settings, Clock, Zap, Mail, AlertCircle, Bug, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import WorkflowWizard from './WorkflowWizard';
import WorkflowDiagnostic from './WorkflowDiagnostic';
import EventTypeManager from './EventTypeManager';
import type { Workflow } from '@/types/workflow.types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useCurrentUserProfile } from '@/hooks/admin/useUserApproval';

export default function AutomationTab() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  const [showDialog, setShowDialog] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [showRecentRuns, setShowRecentRuns] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('workflows');

  const { data: workflows = [], isLoading, error } = useWorkflows();
  const { data: runs = [] } = useWorkflowRuns(undefined, 5); // Only fetch 5 most recent
  const updateStatus = useUpdateWorkflowStatus();
  const deleteWorkflow = useDeleteWorkflow();
  const triggerWorkflow = useTriggerWorkflow();

  const isAdmin = profile?.is_admin === true;

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

  const runStatusColors = {
    completed: 'text-green-600',
    failed: 'text-red-600',
    running: 'text-blue-600',
    pending: 'text-gray-500',
    cancelled: 'text-orange-600'
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <TabsList className="h-7">
            <TabsTrigger value="workflows" className="text-xs h-6">
              Workflows
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="events" className="text-xs h-6">
                <Shield className="h-3 w-3 mr-1" />
                Event Types
              </TabsTrigger>
            )}
          </TabsList>

          {activeTab === 'workflows' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowDiagnostic(!showDiagnostic)}
              >
                <Bug className="h-3 w-3 mr-1" />
                Diagnostic
              </Button>
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
          )}
        </div>

        {/* Workflows Tab Content */}
        <TabsContent value="workflows" className="flex-1 mt-0">
          <div className="h-full flex flex-col">
            {/* Workflow Stats Header */}
            <div className="flex items-center gap-4 mb-3">
              <div className="text-sm text-muted-foreground">
                {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
              </div>
              {runs.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <button
                    onClick={() => setShowRecentRuns(!showRecentRuns)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {runs.length} recent run{runs.length !== 1 ? 's' : ''}
                    <span className="ml-1 text-xs">({showRecentRuns ? '−' : '+'})</span>
                  </button>
                </>
              )}
            </div>

      {/* Show diagnostic if enabled */}
      {showDiagnostic && (
        <div className="mb-3">
          <WorkflowDiagnostic />
        </div>
      )}

      {/* Recent Runs - Collapsible inline view */}
      {showRecentRuns && runs.length > 0 && (
        <div className="mb-3 rounded-lg border px-3 py-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
            Recent Activity
          </div>
          <div className="space-y-0.5">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between text-[11px] py-0.5">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", runStatusColors[run.status])}>
                    {run.status === 'completed' ? '✓' : run.status === 'failed' ? '✗' : '○'}
                  </span>
                  <span className="text-muted-foreground">
                    {run.workflow?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }) : 'Pending'}
                  </span>
                </div>
                {run.completedAt && run.startedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflows Table - Full width */}
      <div className="flex-1 rounded-lg border overflow-auto">
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
                <TableHead className="text-[10px] py-1">Description</TableHead>
                <TableHead className="text-[10px] py-1">Type</TableHead>
                <TableHead className="text-[10px] py-1">Status</TableHead>
                <TableHead className="text-[10px] py-1">Last Run</TableHead>
                <TableHead className="text-[10px] py-1 w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => {
                const lastRun = runs.find(r => r.workflowId === workflow.id);
                return (
                  <TableRow key={workflow.id} className="h-8">
                    <TableCell className="py-1">
                      <div className="text-xs font-medium">{workflow.name}</div>
                    </TableCell>
                    <TableCell className="py-1">
                      <div className="text-[10px] text-muted-foreground truncate max-w-[300px]">
                        {workflow.description || '—'}
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
                      {lastRun ? (
                        <div className="flex items-center gap-1">
                          <span className={cn("text-[10px]", runStatusColors[lastRun.status])}>
                            {lastRun.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {lastRun.startedAt ? new Date(lastRun.startedAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Never</span>
                      )}
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
                              onClick={() => {
                                // For testing: trigger with a test recipient
                                const testEmail = prompt('Enter recipient email for test (or leave empty for yourself):');
                                triggerWorkflow.mutate({
                                  workflowId: workflow.id,
                                  context: testEmail ? {
                                    recipientEmail: testEmail,
                                    recipientId: 'test-recipient',
                                    isTest: true
                                  } : {}
                                });
                              }}
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
          </div>
        </TabsContent>

        {/* Event Types Tab Content (Admin Only) */}
        {isAdmin && (
          <TabsContent value="events" className="flex-1 mt-0">
            <EventTypeManager />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <WorkflowWizard
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          // CRITICAL: Reset editing workflow when dialog closes
          if (!open) {
            setEditingWorkflow(null);
          }
        }}
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