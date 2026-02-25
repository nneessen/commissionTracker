// src/features/recruiting/admin/PipelineTemplatesList.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Loader2,
  Plus,
  Star,
  Edit2,
  Trash2,
  Inbox,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useSetDefaultTemplate,
  useDuplicateTemplate,
} from "../hooks/usePipeline";

interface PipelineTemplatesListProps {
  onSelectTemplate: (id: string) => void;
  /** Whether the current user is an admin (can edit/delete any pipeline) */
  isAdmin: boolean;
  /** Current user's ID (for ownership checks) */
  currentUserId?: string;
  /** Whether the current user has a staff role (trainer/contracting_manager) */
  isStaffRole: boolean;
}

export function PipelineTemplatesList({
  onSelectTemplate,
  isAdmin,
  currentUserId,
  isStaffRole,
}: PipelineTemplatesListProps) {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [consultationWarningOpen, setConsultationWarningOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [duplicateTemplateId, setDuplicateTemplateId] = useState<string | null>(
    null,
  );
  const [duplicateName, setDuplicateName] = useState("");
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  // Whether the user is a regular agent (not admin or staff) — needs consultation before creating
  const isRegularUser = !isAdmin && !isStaffRole;

  // Helper: Check if user can modify a template (admin, owner, or staff on DEFAULT templates)
  // Regular users (agents) cannot modify any existing templates
  const canModifyTemplate = (
    templateCreatedBy: string | undefined | null,
    templateName?: string,
  ) => {
    if (isRegularUser) return false;
    if (isAdmin) return true;
    if (currentUserId && templateCreatedBy === currentUserId) return true;
    if (isStaffRole && templateName?.toUpperCase().includes("DEFAULT"))
      return true;
    return false;
  };

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      const created = await createTemplate.mutateAsync({
        name: newTemplate.name,
        description: newTemplate.description || undefined,
        is_active: newTemplate.is_active,
      });
      toast.success(
        isRegularUser
          ? "Template created. Contact an admin to configure phases and checklists."
          : "Template created",
      );
      setCreateDialogOpen(false);
      setNewTemplate({ name: "", description: "", is_active: true });
      if (!isRegularUser) {
        onSelectTemplate(created.id);
      }
    } catch (_error) {
      toast.error("Failed to create template");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template deleted");
      setDeleteConfirmId(null);
    } catch (_error) {
      toast.error("Failed to delete template");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultTemplate.mutateAsync(id);
      toast.success("Default template updated");
    } catch (_error) {
      toast.error("Failed to set default template");
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTemplateId || !duplicateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    try {
      const newId = await duplicateTemplate.mutateAsync({
        templateId: duplicateTemplateId,
        newName: duplicateName.trim(),
      });
      toast.success("Template duplicated successfully");
      setDuplicateTemplateId(null);
      setDuplicateName("");
      onSelectTemplate(newId); // Open the new template for editing
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        toast.error("A template with this name already exists");
      } else {
        toast.error("Failed to duplicate template");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Actions */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Manage pipeline templates and their phases
        </p>
        <Button
          size="sm"
          className="h-7 px-3 text-[11px]"
          onClick={() =>
            isRegularUser
              ? setConsultationWarningOpen(true)
              : setCreateDialogOpen(true)
          }
        >
          <Plus className="h-3 w-3 mr-1.5" />
          New Template
        </Button>
      </div>

      {/* Templates Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-8 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <TableHead className="p-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Name
              </TableHead>
              <TableHead className="p-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Description
              </TableHead>
              <TableHead className="p-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 w-20">
                Status
              </TableHead>
              <TableHead className="p-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 w-20">
                Default
              </TableHead>
              <TableHead className="p-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 w-24">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-8">
                  <div className="text-center">
                    <Inbox className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      No templates found. Create one to get started.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {templates?.map((template) => (
              <TableRow
                key={template.id}
                className="h-9 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <TableCell className="p-2 text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                  {template.name}
                </TableCell>
                <TableCell className="p-2 text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-64">
                  {template.description || "-"}
                </TableCell>
                <TableCell className="p-2">
                  <Badge
                    variant={template.is_active ? "default" : "secondary"}
                    className="text-[9px] h-4 px-1.5"
                  >
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="p-2">
                  {template.is_default ? (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleSetDefault(template.id)}
                      disabled={setDefaultTemplate.isPending || !isAdmin}
                      title={
                        !isAdmin
                          ? "Only admins can set the default template"
                          : undefined
                      }
                    >
                      <Star className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="p-2">
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onSelectTemplate(template.id)}
                      disabled={
                        !canModifyTemplate(template.created_by, template.name)
                      }
                      title={
                        !canModifyTemplate(template.created_by, template.name)
                          ? "You can only edit your own templates"
                          : undefined
                      }
                    >
                      <Edit2
                        className={`h-3 w-3 ${canModifyTemplate(template.created_by, template.name) ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-300 dark:text-zinc-600"}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setDuplicateName(`${template.name} (Copy)`);
                        setDuplicateTemplateId(template.id);
                      }}
                      disabled={isRegularUser}
                      title={
                        isRegularUser
                          ? "Only admins and staff can duplicate templates"
                          : undefined
                      }
                    >
                      <Copy
                        className={`h-3 w-3 ${isRegularUser ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-600 dark:text-zinc-400"}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600 dark:text-red-400"
                      onClick={() => setDeleteConfirmId(template.id)}
                      disabled={
                        template.is_default ||
                        !canModifyTemplate(template.created_by, template.name)
                      }
                      title={
                        !canModifyTemplate(template.created_by, template.name)
                          ? "You can only delete your own templates"
                          : undefined
                      }
                    >
                      <Trash2
                        className={`h-3 w-3 ${canModifyTemplate(template.created_by, template.name) ? "" : "opacity-30"}`}
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Create Pipeline Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Name
              </Label>
              <Input
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
                placeholder="e.g., Insurance Agent Onboarding"
                className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Description (optional)
              </Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    description: e.target.value,
                  })
                }
                placeholder="Describe this pipeline template..."
                className="text-[11px] min-h-16 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={newTemplate.is_active}
                onCheckedChange={(checked) =>
                  setNewTemplate({ ...newTemplate, is_active: !!checked })
                }
              />
              <label
                htmlFor="is_active"
                className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Active (can be assigned to recruits)
              </label>
            </div>
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
              onClick={handleCreate}
              disabled={createTemplate.isPending}
            >
              {createTemplate.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-sm p-3 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            This will permanently delete this template including all phases,
            checklist items, and recruit progress records. Users will be
            un-enrolled from this pipeline. This action cannot be undone.
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
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consultation Warning Dialog (regular users only) */}
      <Dialog
        open={consultationWarningOpen}
        onOpenChange={setConsultationWarningOpen}
      >
        <DialogContent className="max-w-md p-4 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Before You Create a Pipeline
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mb-2">
              Pipelines are powerful tools with many configuration options that
              directly affect your recruiting workflow.
            </p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
              You must consult with Teagan Keyser or Nick Neessen before
              creating a new pipeline to ensure it&apos;s set up correctly for
              your needs.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setConsultationWarningOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                setConsultationWarningOpen(false);
                setCreateDialogOpen(true);
              }}
            >
              I&apos;ve Consulted — Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Template Dialog */}
      <Dialog
        open={!!duplicateTemplateId}
        onOpenChange={() => setDuplicateTemplateId(null)}
      >
        <DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm">Duplicate Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                New Template Name
              </Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter unique name"
                className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              This will create a copy of the template with all phases, checklist
              items, and automations.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setDuplicateTemplateId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleDuplicate}
              disabled={duplicateTemplate.isPending || !duplicateName.trim()}
            >
              {duplicateTemplate.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
