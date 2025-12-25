// src/features/recruiting/admin/ChecklistItemEditor.tsx

import React, { useState, useCallback } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Loader2,
  FileText,
  CheckSquare,
  BookOpen,
  UserCheck,
  Zap,
  PenTool,
  EyeOff,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useChecklistItems,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useReorderChecklistItems,
} from "../hooks/usePipeline";
import type {
  PhaseChecklistItem,
  CreateChecklistItemInput,
  ChecklistItemType,
  CompletedBy,
} from "@/types/recruiting.types";
import type { SchedulingChecklistMetadata } from "@/types/integration.types";
import { SchedulingItemConfig } from "./SchedulingItemConfig";
import { ChecklistItemAutomationConfig } from "./ChecklistItemAutomationConfig";

interface ChecklistItemEditorProps {
  phaseId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- icon component type
const ITEM_TYPES: { value: ChecklistItemType; label: string; icon: any }[] = [
  { value: "document_upload", label: "Document Upload", icon: FileText },
  { value: "task_completion", label: "Task Completion", icon: CheckSquare },
  { value: "training_module", label: "Training Module", icon: BookOpen },
  { value: "manual_approval", label: "Manual Approval", icon: UserCheck },
  { value: "automated_check", label: "Automated Check", icon: Zap },
  { value: "signature_required", label: "Signature Required", icon: PenTool },
  { value: "scheduling_booking", label: "Schedule Booking", icon: Calendar },
];

const CAN_BE_COMPLETED_BY: { value: CompletedBy; label: string }[] = [
  { value: "recruit", label: "Recruit" },
  { value: "upline", label: "Upline" },
  { value: "system", label: "System" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- icon component type
function getTypeIcon(type: ChecklistItemType): any {
  const found = ITEM_TYPES.find((t) => t.value === type);
  return found ? found.icon : CheckSquare;
}

// Sortable Checklist Item Component
interface SortableChecklistItemProps {
  item: PhaseChecklistItem;
  index: number;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableChecklistItem({
  item,
  index,
  isExpanded,
  isFirst,
  isLast,
  onToggleExpand,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = getTypeIcon(item.item_type as ChecklistItemType);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card rounded-md border border-border shadow-sm"
    >
      {/* Item Row */}
      <div
        className="flex items-center gap-2 p-2 hover:bg-accent/50 cursor-pointer rounded-t-md"
        onClick={onToggleExpand}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          disabled={isFirst}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
        >
          <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          disabled={isLast}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
        >
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono w-4">
          {index + 1}
        </span>
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-foreground flex-1 truncate">
          {item.item_name}
        </span>
        {item.is_required && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 border-border"
          >
            Required
          </Badge>
        )}
        {!item.visible_to_recruit && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 border-[hsl(var(--warning))]/50 text-[hsl(var(--warning))]"
          >
            <EyeOff className="h-2 w-2" />
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="h-3 w-3 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-destructive hover:text-destructive/80"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Expanded: Automations */}
      {isExpanded && (
        <div className="m-2 p-2 rounded bg-muted/30 border-t border-border/30">
          <ChecklistItemAutomationConfig checklistItemId={item.id} />
        </div>
      )}
    </div>
  );
}

export function ChecklistItemEditor({ phaseId }: ChecklistItemEditorProps) {
  const { data: items, isLoading } = useChecklistItems(phaseId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const reorderItems = useReorderChecklistItems();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PhaseChecklistItem | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<CreateChecklistItemInput>({
    item_name: "",
    item_description: undefined,
    item_type: "task_completion",
    is_required: true,
    visible_to_recruit: true,
    can_be_completed_by: "recruit" as const,
    requires_verification: false,
    external_link: undefined,
    metadata: undefined,
  });
  const [schedulingMetadata, setSchedulingMetadata] =
    useState<SchedulingChecklistMetadata | null>(null);

  const sortedItems = [...(items || [])].sort(
    (a, b) => a.item_order - b.item_order,
  );

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
      const newIndex = sortedItems.findIndex((i) => i.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedItems, oldIndex, newIndex);
        try {
          await reorderItems.mutateAsync({
            phaseId,
            itemIds: newOrder.map((i) => i.id),
          });
        } catch (_error) {
          toast.error("Failed to reorder items");
        }
      }
    },
    [sortedItems, phaseId, reorderItems],
  );

  // Handle move up button
  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index === 0) return;
      const newOrder = arrayMove(sortedItems, index, index - 1);
      try {
        await reorderItems.mutateAsync({
          phaseId,
          itemIds: newOrder.map((i) => i.id),
        });
      } catch (_error) {
        toast.error("Failed to reorder items");
      }
    },
    [sortedItems, phaseId, reorderItems],
  );

  // Handle move down button
  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index === sortedItems.length - 1) return;
      const newOrder = arrayMove(sortedItems, index, index + 1);
      try {
        await reorderItems.mutateAsync({
          phaseId,
          itemIds: newOrder.map((i) => i.id),
        });
      } catch (_error) {
        toast.error("Failed to reorder items");
      }
    },
    [sortedItems, phaseId, reorderItems],
  );

  // Handle editing an item
  const handleEditItem = useCallback((item: PhaseChecklistItem) => {
    setEditingItem(item);
    if (item.item_type === "scheduling_booking" && item.metadata) {
      setSchedulingMetadata(item.metadata as SchedulingChecklistMetadata);
    } else {
      setSchedulingMetadata(null);
    }
  }, []);

  const handleCreate = async () => {
    if (!itemForm.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }

    // Include scheduling metadata if this is a scheduling_booking item
    const dataToSubmit: CreateChecklistItemInput = {
      ...itemForm,
      metadata:
        itemForm.item_type === "scheduling_booking" && schedulingMetadata
          ? schedulingMetadata
          : itemForm.metadata,
    };

    try {
      await createItem.mutateAsync({
        phaseId,
        data: dataToSubmit,
      });
      toast.success("Item created");
      setCreateDialogOpen(false);
      setItemForm({
        item_name: "",
        item_description: undefined,
        item_type: "task_completion",
        is_required: true,
        visible_to_recruit: true,
        can_be_completed_by: "recruit" as const,
        requires_verification: false,
        external_link: undefined,
        metadata: undefined,
      });
      setSchedulingMetadata(null);
    } catch (_error) {
      toast.error("Failed to create item");
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    // Prepare metadata - use scheduling metadata if it's a scheduling_booking item
    const metadata =
      editingItem.item_type === "scheduling_booking" && schedulingMetadata
        ? schedulingMetadata
        : (editingItem.metadata ?? undefined);

    try {
      await updateItem.mutateAsync({
        itemId: editingItem.id,
        updates: {
          item_name: editingItem.item_name,
          item_description: editingItem.item_description ?? undefined,
          item_type: editingItem.item_type as ChecklistItemType,
          is_required: editingItem.is_required,
          visible_to_recruit: editingItem.visible_to_recruit,
          can_be_completed_by: editingItem.can_be_completed_by as CompletedBy,
          requires_verification: editingItem.requires_verification,
          external_link: editingItem.external_link ?? undefined,
          metadata,
        },
      });
      toast.success("Item updated");
      setEditingItem(null);
      setSchedulingMetadata(null);
    } catch (_error) {
      toast.error("Failed to update item");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ itemId: id, phaseId });
      toast.success("Item deleted");
      setDeleteConfirmId(null);
    } catch (_error) {
      toast.error("Failed to delete item");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Checklist Items ({sortedItems.length})
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px]"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Item
        </Button>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center py-2">
          No checklist items
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {sortedItems.map((item, index) => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  index={index}
                  isExpanded={expandedItemId === item.id}
                  isFirst={index === 0}
                  isLast={index === sortedItems.length - 1}
                  onToggleExpand={() =>
                    setExpandedItemId(
                      expandedItemId === item.id ? null : item.id,
                    )
                  }
                  onEdit={() => handleEditItem(item)}
                  onDelete={() => setDeleteConfirmId(item.id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Item Name
              </Label>
              <Input
                value={itemForm.item_name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, item_name: e.target.value })
                }
                placeholder="e.g., Upload Resume"
                className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Description
              </Label>
              <Textarea
                value={itemForm.item_description || ""}
                onChange={(e) =>
                  setItemForm({ ...itemForm, item_description: e.target.value })
                }
                placeholder="Optional instructions..."
                className="text-[11px] min-h-14 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Type
                </Label>
                <Select
                  value={itemForm.item_type}
                  onValueChange={(value: ChecklistItemType) =>
                    setItemForm({ ...itemForm, item_type: value })
                  }
                >
                  <SelectTrigger className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(({ value, label }) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="text-[11px]"
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Completed By
                </Label>
                <Select
                  value={itemForm.can_be_completed_by}
                  onValueChange={(value: CompletedBy) =>
                    setItemForm({ ...itemForm, can_be_completed_by: value })
                  }
                >
                  <SelectTrigger className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAN_BE_COMPLETED_BY.map(({ value, label }) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="text-[11px]"
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {itemForm.item_type === "training_module" && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  External Link
                </Label>
                <Input
                  value={itemForm.external_link || ""}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, external_link: e.target.value })
                  }
                  placeholder="https://..."
                  className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
            )}
            {itemForm.item_type === "scheduling_booking" && (
              <SchedulingItemConfig
                metadata={schedulingMetadata}
                onChange={setSchedulingMetadata}
              />
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
                <label
                  htmlFor="is_required"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Required
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires_verification"
                  checked={itemForm.requires_verification}
                  onCheckedChange={(checked) =>
                    setItemForm({
                      ...itemForm,
                      requires_verification: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="requires_verification"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Requires Verification
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="item_visible_to_recruit"
                checked={itemForm.visible_to_recruit !== false}
                onCheckedChange={(checked) =>
                  setItemForm({ ...itemForm, visible_to_recruit: !!checked })
                }
              />
              <label
                htmlFor="item_visible_to_recruit"
                className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Visible to recruits
              </label>
            </div>
            {itemForm.visible_to_recruit === false && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 ml-5">
                This item will be hidden from recruits.
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
              onClick={handleCreate}
              disabled={createItem.isPending}
            >
              {createItem.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Checklist Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Item Name
                </Label>
                <Input
                  value={editingItem.item_name}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item_name: e.target.value,
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
                  value={editingItem.item_description || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item_description: e.target.value,
                    })
                  }
                  className="text-[11px] min-h-14 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    Type
                  </Label>
                  <Select
                    value={editingItem.item_type}
                    onValueChange={(value: ChecklistItemType) =>
                      setEditingItem({ ...editingItem, item_type: value })
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(({ value, label }) => (
                        <SelectItem
                          key={value}
                          value={value}
                          className="text-[11px]"
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    Completed By
                  </Label>
                  <Select
                    value={editingItem.can_be_completed_by}
                    onValueChange={(value: CompletedBy) =>
                      setEditingItem({
                        ...editingItem,
                        can_be_completed_by: value,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAN_BE_COMPLETED_BY.map(({ value, label }) => (
                        <SelectItem
                          key={value}
                          value={value}
                          className="text-[11px]"
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingItem.item_type === "training_module" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    External Link
                  </Label>
                  <Input
                    value={editingItem.external_link || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        external_link: e.target.value,
                      })
                    }
                    className="h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              )}
              {editingItem.item_type === "scheduling_booking" && (
                <SchedulingItemConfig
                  metadata={schedulingMetadata}
                  onChange={setSchedulingMetadata}
                />
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
                  <label
                    htmlFor="edit_is_required"
                    className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
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
                    className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Requires Verification
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_item_visible_to_recruit"
                  checked={editingItem.visible_to_recruit}
                  onCheckedChange={(checked) =>
                    setEditingItem({
                      ...editingItem,
                      visible_to_recruit: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="edit_item_visible_to_recruit"
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Visible to recruits
                </label>
              </div>
              {!editingItem.visible_to_recruit && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 ml-5">
                  This item will be hidden from recruits.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleUpdate}
              disabled={updateItem.isPending}
            >
              {updateItem.isPending && (
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
        <DialogContent className="max-w-sm p-3 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Item?</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            This will permanently delete this checklist item.
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
              disabled={deleteItem.isPending}
            >
              {deleteItem.isPending && (
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
