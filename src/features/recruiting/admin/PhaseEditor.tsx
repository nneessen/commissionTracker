// src/features/recruiting/admin/PhaseEditor.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePhases,
  useCreatePhase,
  useUpdatePipelinePhase,
  useDeletePhase,
} from "../hooks/usePipeline";
import { ChecklistItemEditor } from "./ChecklistItemEditor";
import { PhaseAutomationConfig } from "./PhaseAutomationConfig";
import type { PipelinePhase, CreatePhaseInput } from "@/types/recruiting.types";

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
    phase_name: "",
    phase_description: "",
    estimated_days: 7,
    auto_advance: false,
    visible_to_recruit: true,
  });

  const sortedPhases = [...(phases || [])].sort(
    (a, b) => a.phase_order - b.phase_order,
  );

  const handleCreatePhase = async () => {
    if (!phaseForm.phase_name.trim()) {
      toast.error("Phase name is required");
      return;
    }

    try {
      await createPhase.mutateAsync({
        templateId,
        data: phaseForm,
      });
      toast.success("Phase created");
      setCreateDialogOpen(false);
      setPhaseForm({
        phase_name: "",
        phase_description: "",
        estimated_days: 7,
        auto_advance: false,
        visible_to_recruit: true,
      });
    } catch (_error) {
      toast.error("Failed to create phase");
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
          visible_to_recruit: editingPhase.visible_to_recruit,
        },
      });
      toast.success("Phase updated");
      setEditingPhase(null);
    } catch (_error) {
      toast.error("Failed to update phase");
    }
  };

  const handleDeletePhase = async (id: string) => {
    try {
      await deletePhase.mutateAsync({ phaseId: id, templateId });
      toast.success("Phase deleted");
      setDeleteConfirmId(null);
      if (expandedPhase === id) {
        setExpandedPhase(null);
      }
    } catch (_error) {
      toast.error("Failed to delete phase");
    }
  };

  const toggleExpand = (phaseId: string) => {
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Pipeline Phases ({sortedPhases.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[11px]"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Add Phase
        </Button>
      </div>

      {sortedPhases.length === 0 ? (
        <div className="text-center py-6 text-[11px] text-zinc-500 dark:text-zinc-400">
          No phases yet. Add your first phase to get started.
        </div>
      ) : (
        <div className="space-y-1">
          {sortedPhases.map((phase) => (
            <div
              key={phase.id}
              className="bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-100 dark:border-zinc-800"
            >
              {/* Phase Row */}
              <div
                className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer rounded-t-md"
                onClick={() => toggleExpand(phase.id)}
              >
                <GripVertical className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 cursor-grab" />
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  {expandedPhase === phase.id ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  )}
                </Button>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono w-5">
                  {phase.phase_order}
                </span>
                <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 flex-1">
                  {phase.phase_name}
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 border-zinc-200 dark:border-zinc-700"
                >
                  {phase.estimated_days || 0} days
                </Badge>
                {phase.auto_advance && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] h-4 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    Auto
                  </Badge>
                )}
                {!phase.visible_to_recruit && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                  >
                    <EyeOff className="h-2.5 w-2.5 mr-0.5" />
                    Hidden
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPhase(phase);
                  }}
                >
                  <Edit2 className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-red-500 hover:text-red-600 dark:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(phase.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Expanded: Checklist Items & Automations */}
              {expandedPhase === phase.id && (
                <div className="ml-8 mr-2 mb-2 pb-2 border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-3">
                  <ChecklistItemEditor phaseId={phase.id} />
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
                    <PhaseAutomationConfig phaseId={phase.id} />
                  </div>
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
            <DialogTitle className="text-sm">Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Phase Name
              </Label>
              <Input
                value={phaseForm.phase_name}
                onChange={(e) =>
                  setPhaseForm({ ...phaseForm, phase_name: e.target.value })
                }
                placeholder="e.g., Background Check"
                className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Description
              </Label>
              <Textarea
                value={phaseForm.phase_description || ""}
                onChange={(e) =>
                  setPhaseForm({
                    ...phaseForm,
                    phase_description: e.target.value,
                  })
                }
                placeholder="Optional description..."
                className="text-[11px] min-h-14 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Estimated Days
              </Label>
              <Input
                type="number"
                value={phaseForm.estimated_days || 7}
                onChange={(e) =>
                  setPhaseForm({
                    ...phaseForm,
                    estimated_days: parseInt(e.target.value) || 7,
                  })
                }
                className="h-7 text-[11px] w-20 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
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
              <label
                htmlFor="auto_advance"
                className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Auto-advance when all items complete
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="visible_to_recruit"
                checked={phaseForm.visible_to_recruit !== false}
                onCheckedChange={(checked) =>
                  setPhaseForm({ ...phaseForm, visible_to_recruit: !!checked })
                }
              />
              <label
                htmlFor="visible_to_recruit"
                className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Visible to recruits
              </label>
            </div>
            {phaseForm.visible_to_recruit === false && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 ml-5">
                This phase will be hidden from recruits. They will see a
                &quot;waiting&quot; state instead.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleCreatePhase}
              disabled={createPhase.isPending}
            >
              {createPhase.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
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
            <DialogTitle className="text-sm">Edit Phase</DialogTitle>
          </DialogHeader>
          {editingPhase && (
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Phase Name
                </Label>
                <Input
                  value={editingPhase.phase_name}
                  onChange={(e) =>
                    setEditingPhase({
                      ...editingPhase,
                      phase_name: e.target.value,
                    })
                  }
                  className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Description
                </Label>
                <Textarea
                  value={editingPhase.phase_description || ""}
                  onChange={(e) =>
                    setEditingPhase({
                      ...editingPhase,
                      phase_description: e.target.value,
                    })
                  }
                  className="text-[11px] min-h-14 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Estimated Days
                </Label>
                <Input
                  type="number"
                  value={editingPhase.estimated_days || 7}
                  onChange={(e) =>
                    setEditingPhase({
                      ...editingPhase,
                      estimated_days: parseInt(e.target.value) || 7,
                    })
                  }
                  className="h-7 text-[11px] w-20 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_auto_advance"
                  checked={editingPhase.auto_advance}
                  onCheckedChange={(checked) =>
                    setEditingPhase({
                      ...editingPhase,
                      auto_advance: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="edit_auto_advance"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Auto-advance when all items complete
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_visible_to_recruit"
                  checked={editingPhase.visible_to_recruit}
                  onCheckedChange={(checked) =>
                    setEditingPhase({
                      ...editingPhase,
                      visible_to_recruit: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="edit_visible_to_recruit"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Visible to recruits
                </label>
              </div>
              {!editingPhase.visible_to_recruit && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 ml-5">
                  This phase will be hidden from recruits. They will see a
                  &quot;waiting&quot; state instead.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setEditingPhase(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleUpdatePhase}
              disabled={updatePhase.isPending}
            >
              {updatePhase.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Phase?</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            This will permanently delete this phase and all its checklist items.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() =>
                deleteConfirmId && handleDeletePhase(deleteConfirmId)
              }
              disabled={deletePhase.isPending}
            >
              {deletePhase.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
