// src/features/recruiting/admin/PhaseEditor.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import {
  usePhases,
  useCreatePhase,
  useUpdatePipelinePhase,
  useDeletePhase,
} from '../hooks/usePipeline';
import { ChecklistItemEditor } from './ChecklistItemEditor';
import type { PipelinePhase, CreatePhaseInput } from '@/types/recruiting';

interface PhaseEditorProps {
  templateId: string;
}

export function PhaseEditor({ templateId }: PhaseEditorProps) {
  const { data: phases, isLoading } = usePhases(templateId);
  const createPhase = useCreatePhase();
  const updatePhase = useUpdatePipelinePhase();
  const deletePhase = useDeletePhase();

  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<PipelinePhase | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [phaseForm, setPhaseForm] = useState<CreatePhaseInput>({
    phase_name: '',
    phase_description: '',
    estimated_days: 7,
    auto_advance: false,
  });

  const sortedPhases = [...(phases || [])].sort(
    (a, b) => a.phase_order - b.phase_order
  );

  const handleCreatePhase = async () => {
    if (!phaseForm.phase_name.trim()) {
      showToast.error('Phase name is required');
      return;
    }

    try {
      await createPhase.mutateAsync({
        templateId,
        data: phaseForm,
      });
      showToast.success('Phase created');
      setCreateDialogOpen(false);
      setPhaseForm({
        phase_name: '',
        phase_description: '',
        estimated_days: 7,
        auto_advance: false,
      });
    } catch (error) {
      showToast.error('Failed to create phase');
    }
  };

  const handleUpdatePhase = async () => {
    if (!editingPhase) return;

    try {
      await updatePhase.mutateAsync({
        phaseId: editingPhase.id,
        updates: {
          phase_name: editingPhase.phase_name,
          phase_description: editingPhase.phase_description ?? undefined,
          estimated_days: editingPhase.estimated_days ?? undefined,
          auto_advance: editingPhase.auto_advance,
        },
      });
      showToast.success('Phase updated');
      setEditingPhase(null);
    } catch (error) {
      showToast.error('Failed to update phase');
    }
  };

  const handleDeletePhase = async (id: string) => {
    try {
      await deletePhase.mutateAsync({ phaseId: id, templateId });
      showToast.success('Phase deleted');
      setDeleteConfirmId(null);
      if (expandedPhase === id) {
        setExpandedPhase(null);
      }
    } catch (error) {
      showToast.error('Failed to delete phase');
    }
  };

  const toggleExpand = (phaseId: string) => {
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Pipeline Phases ({sortedPhases.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Phase
        </Button>
      </div>

      {sortedPhases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No phases yet. Add your first phase to get started.
        </div>
      ) : (
        <div className="space-y-1">
          {sortedPhases.map((phase) => (
            <div key={phase.id} className="bg-muted/10 rounded-sm">
              {/* Phase Row */}
              <div
                className="flex items-center gap-2 p-2 hover:bg-muted/20 cursor-pointer"
                onClick={() => toggleExpand(phase.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {expandedPhase === phase.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground font-mono w-6">
                  {phase.phase_order}
                </span>
                <span className="text-sm font-medium flex-1">{phase.phase_name}</span>
                <Badge variant="outline" className="text-xs">
                  {phase.estimated_days || 0} days
                </Badge>
                {phase.auto_advance && (
                  <Badge variant="secondary" className="text-xs">
                    Auto
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPhase(phase);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(phase.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Expanded: Checklist Items */}
              {expandedPhase === phase.id && (
                <div className="ml-10 mr-2 mb-2 pb-2">
                  <ChecklistItemEditor phaseId={phase.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Phase Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Phase Name</Label>
              <Input
                value={phaseForm.phase_name}
                onChange={(e) =>
                  setPhaseForm({ ...phaseForm, phase_name: e.target.value })
                }
                placeholder="e.g., Background Check"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={phaseForm.phase_description || ''}
                onChange={(e) =>
                  setPhaseForm({ ...phaseForm, phase_description: e.target.value })
                }
                placeholder="Optional description..."
                className="text-sm min-h-16"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Estimated Days</Label>
              <Input
                type="number"
                value={phaseForm.estimated_days || 7}
                onChange={(e) =>
                  setPhaseForm({
                    ...phaseForm,
                    estimated_days: parseInt(e.target.value) || 7,
                  })
                }
                className="h-8 text-sm w-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto_advance"
                checked={phaseForm.auto_advance}
                onCheckedChange={(checked) =>
                  setPhaseForm({ ...phaseForm, auto_advance: !!checked })
                }
              />
              <label htmlFor="auto_advance" className="text-sm cursor-pointer">
                Auto-advance when all items complete
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePhase} disabled={createPhase.isPending}>
              {createPhase.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Phase Dialog */}
      <Dialog open={!!editingPhase} onOpenChange={() => setEditingPhase(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Phase</DialogTitle>
          </DialogHeader>
          {editingPhase && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">Phase Name</Label>
                <Input
                  value={editingPhase.phase_name}
                  onChange={(e) =>
                    setEditingPhase({ ...editingPhase, phase_name: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={editingPhase.phase_description || ''}
                  onChange={(e) =>
                    setEditingPhase({
                      ...editingPhase,
                      phase_description: e.target.value,
                    })
                  }
                  className="text-sm min-h-16"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Estimated Days</Label>
                <Input
                  type="number"
                  value={editingPhase.estimated_days || 7}
                  onChange={(e) =>
                    setEditingPhase({
                      ...editingPhase,
                      estimated_days: parseInt(e.target.value) || 7,
                    })
                  }
                  className="h-8 text-sm w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_auto_advance"
                  checked={editingPhase.auto_advance}
                  onCheckedChange={(checked) =>
                    setEditingPhase({ ...editingPhase, auto_advance: !!checked })
                  }
                />
                <label htmlFor="edit_auto_advance" className="text-sm cursor-pointer">
                  Auto-advance when all items complete
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhase(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePhase} disabled={updatePhase.isPending}>
              {updatePhase.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Phase?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this phase and all its checklist items.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeletePhase(deleteConfirmId)}
              disabled={deletePhase.isPending}
            >
              {deletePhase.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
