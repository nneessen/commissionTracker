// src/features/underwriting/components/DecisionTreeList.tsx

import { useState } from "react";
import { Plus, Pencil, Trash2, Star, MoreHorizontal } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDecisionTrees,
  useSetDefaultDecisionTree,
  useDeleteDecisionTree,
} from "../hooks/useDecisionTrees";
import { DecisionTreeEditor } from "./DecisionTreeEditor";
import type {
  DecisionTree,
  DecisionTreeRules,
} from "../types/underwriting.types";

export function DecisionTreeList() {
  const { data: trees, isLoading, error } = useDecisionTrees();
  const setDefaultMutation = useSetDefaultDecisionTree();
  const deleteMutation = useDeleteDecisionTree();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTreeId, setEditingTreeId] = useState<string | undefined>(
    undefined,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [treeToDelete, setTreeToDelete] = useState<DecisionTree | null>(null);

  const handleCreateNew = () => {
    setEditingTreeId(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (tree: DecisionTree) => {
    setEditingTreeId(tree.id);
    setEditorOpen(true);
  };

  const handleSetDefault = async (tree: DecisionTree) => {
    if (tree.is_default) return;
    try {
      await setDefaultMutation.mutateAsync(tree.id);
    } catch {
      // Error already handled by mutation's onError toast
    }
  };

  const handleDeleteClick = (tree: DecisionTree) => {
    setTreeToDelete(tree);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!treeToDelete) return;
    try {
      await deleteMutation.mutateAsync(treeToDelete.id);
      setDeleteConfirmOpen(false);
      setTreeToDelete(null);
    } catch {
      // Keep dialog open on error so user can retry - toast shown by mutation
    }
  };

  const handleEditorSaved = () => {
    setEditorOpen(false);
    setEditingTreeId(undefined);
  };

  const handleEditorCancel = () => {
    setEditorOpen(false);
    setEditingTreeId(undefined);
  };

  const getRulesCount = (tree: DecisionTree): number => {
    const rules = tree.rules as DecisionTreeRules | null;
    return rules?.rules?.length || 0;
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400 text-[11px]">
        Failed to load decision trees: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
            Decision Trees
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Configure rule-based recommendation strategies
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleCreateNew}
          className="h-6 px-2 text-[10px]"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Tree
        </Button>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
              <TableHead className="h-8 px-3 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                Name
              </TableHead>
              <TableHead className="h-8 px-3 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                Description
              </TableHead>
              <TableHead className="h-8 px-3 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 text-center">
                Rules
              </TableHead>
              <TableHead className="h-8 px-3 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 text-center">
                Status
              </TableHead>
              <TableHead className="h-8 px-3 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 w-[80px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-3 py-2">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center">
                    <Skeleton className="h-5 w-16 mx-auto" />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Skeleton className="h-6 w-6" />
                  </TableCell>
                </TableRow>
              ))
            ) : trees && trees.length > 0 ? (
              trees.map((tree) => (
                <TableRow
                  key={tree.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                >
                  <TableCell className="px-3 py-2 text-[11px] text-zinc-900 dark:text-zinc-100 font-medium">
                    <div className="flex items-center gap-1.5">
                      {tree.is_default && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                      {tree.name}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                    {tree.description || "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-[11px] text-zinc-700 dark:text-zinc-300 text-center">
                    {getRulesCount(tree)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center">
                    {tree.is_default ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] px-1.5 py-0">
                        Default
                      </Badge>
                    ) : tree.is_active ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[9px] px-1.5 py-0">
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0"
                      >
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => handleEdit(tree)}
                          className="text-[11px]"
                        >
                          <Pencil className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!tree.is_default && (
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(tree)}
                            className="text-[11px]"
                            disabled={setDefaultMutation.isPending}
                          >
                            <Star className="h-3 w-3 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(tree)}
                          className="text-[11px] text-red-600 dark:text-red-400"
                          disabled={tree.is_default ?? false}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-3 py-8 text-center text-[11px] text-zinc-500 dark:text-zinc-400"
                >
                  No decision trees found. Create your first one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingTreeId ? "Edit Decision Tree" : "Create Decision Tree"}
            </DialogTitle>
          </DialogHeader>
          <DecisionTreeEditor
            treeId={editingTreeId}
            onSaved={handleEditorSaved}
            onCancel={handleEditorCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Delete Decision Tree
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[11px]">
              Are you sure you want to delete "{treeToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-[11px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-7 text-[11px] bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
