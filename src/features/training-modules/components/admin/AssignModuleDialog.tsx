// src/features/training-modules/components/admin/AssignModuleDialog.tsx
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserSearchCombobox } from "@/components/shared/user-search-combobox";
import { useCreateTrainingAssignment } from "../../hooks/useTrainingAssignments";
import { useImo } from "@/contexts/ImoContext";
import { ASSIGNMENT_TYPES, PRIORITY_LEVELS } from "../../types/training-module.types";
import type {
  TrainingModule,
  AssignmentType,
  PriorityLevel,
} from "../../types/training-module.types";

interface AssignModuleDialogProps {
  module: TrainingModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignModuleDialog({
  module,
  open,
  onOpenChange,
}: AssignModuleDialogProps) {
  const { agency } = useImo();
  const createAssignment = useCreateTrainingAssignment();

  const [assignmentType, setAssignmentType] = useState<AssignmentType>("individual");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("normal");
  const [isMandatory, setIsMandatory] = useState(false);

  const handleSubmit = async () => {
    if (!agency) return;
    if (assignmentType === "individual" && !selectedUserId) return;

    try {
      await createAssignment.mutateAsync({
        input: {
          module_id: module.id,
          agency_id: agency.id,
          assigned_to: assignmentType === "individual" ? selectedUserId! : undefined,
          assignment_type: assignmentType,
          due_date: dueDate || undefined,
          priority,
          is_mandatory: isMandatory,
        },
        moduleVersion: module.version,
      });
      resetAndClose();
    } catch {
      // Error handled by mutation
    }
  };

  const resetAndClose = () => {
    setAssignmentType("individual");
    setSelectedUserId(null);
    setDueDate("");
    setPriority("normal");
    setIsMandatory(false);
    onOpenChange(false);
  };

  const canSubmit =
    assignmentType === "agency" || (assignmentType === "individual" && selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Assign: {module.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Assignment Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Assignment Type
            </label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
              className="w-full h-7 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 bg-white dark:bg-zinc-900"
            >
              {ASSIGNMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "individual" ? "Individual User" : "Entire Agency"}
                </option>
              ))}
            </select>
          </div>

          {/* User Search (only for individual) */}
          {assignmentType === "individual" && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500">
                Assign To
              </label>
              <UserSearchCombobox
                value={selectedUserId}
                onChange={setSelectedUserId}
                placeholder="Search for a user..."
                approvalStatus="approved"
              />
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Due Date (optional)
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full h-7 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 bg-white dark:bg-zinc-900"
            >
              {PRIORITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory */}
          <label className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="h-3 w-3 rounded"
            />
            Mandatory assignment
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={resetAndClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleSubmit}
            disabled={!canSubmit || createAssignment.isPending}
          >
            {createAssignment.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
