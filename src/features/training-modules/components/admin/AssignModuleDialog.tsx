// src/features/training-modules/components/admin/AssignModuleDialog.tsx
import { useState, useCallback, useMemo } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTrainingAssignment, useTrainingAssignments } from "../../hooks/useTrainingAssignments";
import { useImo } from "@/contexts/ImoContext";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import { ASSIGNMENT_TYPES, PRIORITY_LEVELS } from "../../types/training-module.types";
import type {
  TrainingModule,
  AssignmentType,
  PriorityLevel,
} from "../../types/training-module.types";
import type { UserSearchResult } from "@/services/users/userSearchService";
import { toast } from "sonner";

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
  const { data: existingAssignments = [] } = useTrainingAssignments(module.id);

  const [assignmentType, setAssignmentType] = useState<AssignmentType>("individual");
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("normal");
  const [isMandatory, setIsMandatory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all approved agents with no limit — filter client-side
  const { data: allAgents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["assign-dialog-agents"],
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, roles, agent_status")
        .eq("approval_status", "approved")
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });
      if (error) throw error;
      return (data || []) as UserSearchResult[];
    },
    staleTime: 60000,
  });

  // Build set of already-assigned user IDs for this module
  const alreadyAssignedIds = useMemo(
    () =>
      new Set(
        existingAssignments
          .filter((a) => a.assigned_to !== null)
          .map((a) => a.assigned_to as string),
      ),
    [existingAssignments],
  );

  // Filter: exclude already-assigned agents, then apply search term
  const visibleAgents = useMemo(() => {
    const unassigned = allAgents.filter((u) => !alreadyAssignedIds.has(u.id));
    if (!searchTerm) return unassigned;
    const term = searchTerm.toLowerCase();
    return unassigned.filter(
      (u) =>
        `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term),
    );
  }, [allAgents, alreadyAssignedIds, searchTerm]);

  const toggleUser = useCallback((user: UserSearchResult) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  }, []);

  const isSelected = (userId: string) =>
    selectedUsers.some((u) => u.id === userId);

  const handleSubmit = async () => {
    if (!agency) return;
    if (assignmentType === "individual" && selectedUsers.length === 0) return;

    setIsSubmitting(true);
    try {
      if (assignmentType === "agency") {
        await createAssignment.mutateAsync({
          input: {
            module_id: module.id,
            agency_id: agency.id,
            assignment_type: "agency",
            due_date: dueDate || undefined,
            priority,
            is_mandatory: isMandatory,
          },
          moduleVersion: module.version,
        });
      } else {
        const results = await Promise.allSettled(
          selectedUsers.map((user) =>
            createAssignment.mutateAsync({
              input: {
                module_id: module.id,
                agency_id: agency.id,
                assigned_to: user.id,
                assignment_type: "individual",
                due_date: dueDate || undefined,
                priority,
                is_mandatory: isMandatory,
              },
              moduleVersion: module.version,
            }),
          ),
        );

        const failed = results.filter((r) => r.status === "rejected").length;
        const succeeded = results.filter((r) => r.status === "fulfilled").length;

        if (failed > 0) {
          toast.warning(
            `${succeeded} assignment${succeeded !== 1 ? "s" : ""} created, ${failed} failed`,
          );
        }
      }
      resetAndClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setAssignmentType("individual");
    setSelectedUsers([]);
    setSearchTerm("");
    setDueDate("");
    setPriority("normal");
    setIsMandatory(false);
    onOpenChange(false);
  };

  const canSubmit =
    !isSubmitting &&
    (assignmentType === "agency" || selectedUsers.length > 0);

  const unassignedCount = allAgents.length - alreadyAssignedIds.size;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); else onOpenChange(true); }}>
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
            <Select
              value={assignmentType}
              onValueChange={(v) => {
                setAssignmentType(v as AssignmentType);
                setSelectedUsers([]);
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="text-xs">
                    {type === "individual" ? "Individual Users" : "Entire Agency"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-user search (only for individual) */}
          {assignmentType === "individual" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500">
                Assign To
                {selectedUsers.length > 0 && (
                  <span className="ml-1 text-zinc-400">
                    ({selectedUsers.length} selected)
                  </span>
                )}
                {unassignedCount > 0 && selectedUsers.length === 0 && (
                  <span className="ml-1 text-zinc-400">
                    — {unassignedCount} unassigned
                  </span>
                )}
              </label>

              {/* Selected user chips */}
              {selectedUsers.length > 0 && (
                <div className="max-h-20 overflow-y-auto flex flex-wrap gap-1 p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-800/50">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="text-[10px] h-5 pl-1.5 pr-1 gap-1"
                    >
                      {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email}
                      <button
                        type="button"
                        onClick={() => toggleUser(user)}
                        className="hover:text-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter agents by name or email..."
                  className="h-7 text-xs pl-7"
                />
              </div>

              {/* Results list */}
              <div className="h-52 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
                {agentsLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                )}
                {!agentsLoading && unassignedCount === 0 && (
                  <div className="py-6 text-center text-[11px] text-zinc-500">
                    All agents have been assigned this module
                  </div>
                )}
                {!agentsLoading && unassignedCount > 0 && visibleAgents.length === 0 && (
                  <div className="py-6 text-center text-[11px] text-zinc-500">
                    No agents match your search
                  </div>
                )}
                {!agentsLoading && visibleAgents.length > 0 && (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {visibleAgents.map((user) => {
                      const selected = isSelected(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleUser(user)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                            selected
                              ? "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <div
                            className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                              selected
                                ? "bg-blue-600 border-blue-600"
                                : "border-zinc-300 dark:border-zinc-600"
                            }`}
                          >
                            {selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium truncate">
                              {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email}
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as PriorityLevel)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level} className="text-xs">
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : null}
            {assignmentType === "individual" && selectedUsers.length > 1
              ? `Assign ${selectedUsers.length} Users`
              : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
