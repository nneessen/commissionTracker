// src/features/expenses/components/CategoryManagementDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import {
  useAllExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
} from '@/hooks/expenses/useExpenseCategories';
import type { ExpenseCategoryModel } from '@/types/expense.types';

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagementDialog({
  open,
  onOpenChange,
}: CategoryManagementDialogProps) {
  const { data: categories = [], isLoading } = useAllExpenseCategories();
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return;

    await createCategory.mutateAsync({
      name: newCategoryName.trim(),
      is_active: true,
    });

    setNewCategoryName('');
  };

  const handleStartEdit = (category: ExpenseCategoryModel) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editingName.trim()) return;

    await updateCategory.mutateAsync({
      id: categoryId,
      updates: { name: editingName.trim() },
    });

    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? Existing expenses will not be affected.')) {
      await deleteCategory.mutateAsync(categoryId);
    }
  };

  const handleToggleActive = async (category: ExpenseCategoryModel) => {
    await updateCategory.mutateAsync({
      id: category.id,
      updates: { is_active: !category.is_active },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Expense Categories</DialogTitle>
          <DialogDescription>
            Add, edit, or remove expense categories. Changes will be reflected in all dropdowns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-category" className="sr-only">
                New Category Name
              </Label>
              <Input
                id="new-category"
                placeholder="Enter new category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <Button onClick={handleAdd} disabled={!newCategoryName.trim() || createCategory.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Category List */}
          <div className="space-y-2">
            <Label>Current Categories</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="text-sm text-muted-foreground">No categories yet. Add one above!</div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 p-3 border rounded-md bg-card"
                  >
                    {editingId === category.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(category.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(category.id)}
                          disabled={updateCategory.isPending}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className={`font-medium ${!category.is_active ? 'text-muted-foreground line-through' : ''}`}>
                            {category.name}
                          </div>
                          {category.description && (
                            <div className="text-sm text-muted-foreground">{category.description}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(category)}
                          disabled={updateCategory.isPending}
                          title={category.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(category)}
                          disabled={updateCategory.isPending}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.id)}
                          disabled={deleteCategory.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
