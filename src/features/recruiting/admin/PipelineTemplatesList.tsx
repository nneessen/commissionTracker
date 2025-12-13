// src/features/recruiting/admin/PipelineTemplatesList.tsx

import React, { useState } from 'react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Copy, Loader2} from 'lucide-react';
import {showToast} from '@/utils/toast';
import {useTemplates, useCreateTemplate, useDeleteTemplate, useSetDefaultTemplate} from '../hooks/usePipeline';
import {PipelineTemplate} from '@/types/recruiting.types';
import { Plus, Star, Edit2, Trash2 } from 'lucide-react';

interface PipelineTemplatesListProps {
  onSelectTemplate: (id: string) => void;
}

export function PipelineTemplatesList({ onSelectTemplate }: PipelineTemplatesListProps) {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) {
      showToast.error('Template name is required');
      return;
    }

    try {
      const created = await createTemplate.mutateAsync({
        name: newTemplate.name,
        description: newTemplate.description || undefined,
        is_active: newTemplate.is_active,
      });
      showToast.success('Template created');
      setCreateDialogOpen(false);
      setNewTemplate({ name: '', description: '', is_active: true });
      onSelectTemplate(created.id);
    } catch (_error) {
      showToast.error('Failed to create template');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      showToast.success('Template deleted');
      setDeleteConfirmId(null);
    } catch (_error) {
      showToast.error('Failed to delete template');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultTemplate.mutateAsync(id);
      showToast.success('Default template updated');
    } catch (_error) {
      showToast.error('Failed to set default template');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage pipeline templates and their phases
        </p>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="p-2 text-xs font-mono">Name</TableHead>
                <TableHead className="p-2 text-xs font-mono">Description</TableHead>
                <TableHead className="p-2 text-xs font-mono w-20">Status</TableHead>
                <TableHead className="p-2 text-xs font-mono w-20">Default</TableHead>
                <TableHead className="p-2 text-xs font-mono w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                    No templates found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
              {templates?.map((template) => (
                <TableRow key={template.id} className="h-8 hover:bg-muted/30">
                  <TableCell className="p-2 text-xs font-medium">
                    {template.name}
                  </TableCell>
                  <TableCell className="p-2 text-xs text-muted-foreground truncate max-w-64">
                    {template.description || '-'}
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge
                      variant={template.is_active ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2">
                    {template.is_default ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleSetDefault(template.id)}
                        disabled={setDefaultTemplate.isPending}
                      >
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => onSelectTemplate(template.id)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-destructive"
                        onClick={() => setDeleteConfirmId(template.id)}
                        disabled={template.is_default}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Pipeline Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
                placeholder="e.g., Insurance Agent Onboarding"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description (optional)</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, description: e.target.value })
                }
                placeholder="Describe this pipeline template..."
                className="text-sm min-h-20"
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
              <label htmlFor="is_active" className="text-sm cursor-pointer">
                Active (can be assigned to recruits)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>
              {createTemplate.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this template and all its phases. This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending && (
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
