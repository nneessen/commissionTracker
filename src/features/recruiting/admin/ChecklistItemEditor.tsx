// src/features/recruiting/admin/ChecklistItemEditor.tsx

import React, { useState } from 'react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Plus, Edit2, Trash2, GripVertical, Loader2, FileText, CheckSquare, BookOpen, UserCheck, Zap, PenTool} from 'lucide-react';
import {showToast} from '@/utils/toast';
import {useChecklistItems, useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem} from '../hooks/usePipeline';
import type {PhaseChecklistItem, CreateChecklistItemInput, ChecklistItemType, CompletedBy} from '@/types/recruiting.types';

interface ChecklistItemEditorProps {
  phaseId: string;
}

const ITEM_TYPES: { value: ChecklistItemType; label: string; icon: any }[] = [
  { value: 'document_upload', label: 'Document Upload', icon: FileText },
  { value: 'task_completion', label: 'Task Completion', icon: CheckSquare },
  { value: 'training_module', label: 'Training Module', icon: BookOpen },
  { value: 'manual_approval', label: 'Manual Approval', icon: UserCheck },
  { value: 'automated_check', label: 'Automated Check', icon: Zap },
  { value: 'signature_required', label: 'Signature Required', icon: PenTool },
];

const CAN_BE_COMPLETED_BY: { value: CompletedBy; label: string }[] = [
  { value: 'recruit', label: 'Recruit' },
  { value: 'upline', label: 'Upline' },
  { value: 'system', label: 'System' },
];

export function ChecklistItemEditor({ phaseId }: ChecklistItemEditorProps) {
  const { data: items, isLoading } = useChecklistItems(phaseId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PhaseChecklistItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<CreateChecklistItemInput>({
    item_name: '',
    item_description: undefined,
    item_type: 'task_completion',
    is_required: true,
    can_be_completed_by: 'recruit' as const,
    requires_verification: false,
    external_link: undefined,
  });

  const sortedItems = [...(items || [])].sort((a, b) => a.item_order - b.item_order);

  const handleCreate = async () => {
    if (!itemForm.item_name.trim()) {
      showToast.error('Item name is required');
      return;
    }

    try {
      await createItem.mutateAsync({
        phaseId,
        data: itemForm,
      });
      showToast.success('Item created');
      setCreateDialogOpen(false);
      setItemForm({
        item_name: '',
        item_description: undefined,
        item_type: 'task_completion',
        is_required: true,
        can_be_completed_by: 'recruit' as const,
        requires_verification: false,
        external_link: undefined,
      });
    } catch (_error) {
      showToast.error('Failed to create item');
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    try {
      await updateItem.mutateAsync({
        itemId: editingItem.id,
        updates: {
          item_name: editingItem.item_name,
          item_description: editingItem.item_description ?? undefined,
          item_type: editingItem.item_type,
          is_required: editingItem.is_required,
          can_be_completed_by: editingItem.can_be_completed_by,
          requires_verification: editingItem.requires_verification,
          external_link: editingItem.external_link ?? undefined,
        },
      });
      showToast.success('Item updated');
      setEditingItem(null);
    } catch (_error) {
      showToast.error('Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ itemId: id, phaseId });
      showToast.success('Item deleted');
      setDeleteConfirmId(null);
    } catch (_error) {
      showToast.error('Failed to delete item');
    }
  };

  const getTypeIcon = (type: ChecklistItemType) => {
    const found = ITEM_TYPES.find((t) => t.value === type);
    return found ? found.icon : CheckSquare;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Checklist Items ({sortedItems.length})
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Item
        </Button>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-2">
          No checklist items
        </div>
      ) : (
        <div className="space-y-1">
          {sortedItems.map((item) => {
            const Icon = getTypeIcon(item.item_type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 p-1 bg-background rounded-sm hover:bg-muted/20"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
                <span className="text-xs text-muted-foreground font-mono w-4">
                  {item.item_order}
                </span>
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs flex-1 truncate">{item.item_name}</span>
                {item.is_required && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Required
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setEditingItem(item)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive"
                  onClick={() => setDeleteConfirmId(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Item Name</Label>
              <Input
                value={itemForm.item_name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, item_name: e.target.value })
                }
                placeholder="e.g., Upload Resume"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={itemForm.item_description || ''}
                onChange={(e) =>
                  setItemForm({ ...itemForm, item_description: e.target.value })
                }
                placeholder="Optional instructions..."
                className="text-sm min-h-16"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Type</Label>
                <Select
                  value={itemForm.item_type}
                  onValueChange={(value: ChecklistItemType) =>
                    setItemForm({ ...itemForm, item_type: value })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Completed By</Label>
                <Select
                  value={itemForm.can_be_completed_by}
                  onValueChange={(value: CompletedBy) =>
                    setItemForm({ ...itemForm, can_be_completed_by: value })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAN_BE_COMPLETED_BY.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {itemForm.item_type === 'training_module' && (
              <div className="space-y-2">
                <Label className="text-sm">External Link</Label>
                <Input
                  value={itemForm.external_link || ''}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, external_link: e.target.value })
                  }
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_required"
                  checked={itemForm.is_required}
                  onCheckedChange={(checked) =>
                    setItemForm({ ...itemForm, is_required: !!checked })
                  }
                />
                <label htmlFor="is_required" className="text-sm cursor-pointer">
                  Required
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires_verification"
                  checked={itemForm.requires_verification}
                  onCheckedChange={(checked) =>
                    setItemForm({ ...itemForm, requires_verification: !!checked })
                  }
                />
                <label htmlFor="requires_verification" className="text-sm cursor-pointer">
                  Requires Verification
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createItem.isPending}>
              {createItem.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">Item Name</Label>
                <Input
                  value={editingItem.item_name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, item_name: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={editingItem.item_description || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item_description: e.target.value,
                    })
                  }
                  className="text-sm min-h-16"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Type</Label>
                  <Select
                    value={editingItem.item_type}
                    onValueChange={(value: ChecklistItemType) =>
                      setEditingItem({ ...editingItem, item_type: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Completed By</Label>
                  <Select
                    value={editingItem.can_be_completed_by}
                    onValueChange={(value: CompletedBy) =>
                      setEditingItem({ ...editingItem, can_be_completed_by: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAN_BE_COMPLETED_BY.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingItem.item_type === 'training_module' && (
                <div className="space-y-2">
                  <Label className="text-sm">External Link</Label>
                  <Input
                    value={editingItem.external_link || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, external_link: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit_is_required"
                    checked={editingItem.is_required}
                    onCheckedChange={(checked) =>
                      setEditingItem({ ...editingItem, is_required: !!checked })
                    }
                  />
                  <label htmlFor="edit_is_required" className="text-sm cursor-pointer">
                    Required
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit_requires_verification"
                    checked={editingItem.requires_verification}
                    onCheckedChange={(checked) =>
                      setEditingItem({
                        ...editingItem,
                        requires_verification: !!checked,
                      })
                    }
                  />
                  <label
                    htmlFor="edit_requires_verification"
                    className="text-sm cursor-pointer"
                  >
                    Requires Verification
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateItem.isPending}>
              {updateItem.isPending && (
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
            <DialogTitle>Delete Item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this checklist item.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteItem.isPending}
            >
              {deleteItem.isPending && (
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
