// File: /home/nneessen/projects/commissionTracker/src/features/training-hub/components/EventTypeManager.tsx

import { useState, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Power,
  PowerOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useEventTypes,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
} from "@/hooks/workflows";
import type { TriggerEventType } from "@/types/workflow.types";

interface EditableEventType extends Partial<TriggerEventType> {
  isNew?: boolean;
}

const EVENT_CATEGORIES = [
  "recruit",
  "policy",
  "commission",
  "user",
  "email",
  "system",
  "custom",
];

const CATEGORY_COLORS: Record<string, string> = {
  recruit:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
  policy:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0",
  commission:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0",
  user: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0",
  email:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-0",
  system:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-0",
  custom:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-0",
};

export default function EventTypeManager() {
  const { data: eventTypes = [], isLoading } = useEventTypes();
  const createEvent = useCreateEventType();
  const updateEvent = useUpdateEventType();
  const deleteEvent = useDeleteEventType();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableEventType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Start editing an event
  const handleEdit = useCallback((event: TriggerEventType) => {
    setEditingId(event.id);
    setEditData({
      ...event,
      availableVariables: event.availableVariables || {},
    });
    setErrors({});
  }, []);

  // Start creating a new event
  const handleCreate = useCallback(() => {
    const newEvent: EditableEventType = {
      id: "new",
      eventName: "",
      category: "custom",
      description: "",
      availableVariables: {},
      isActive: true,
      isNew: true,
    };
    setEditingId("new");
    setEditData(newEvent);
    setErrors({});
  }, []);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditData(null);
    setErrors({});
  }, []);

  // Validate event data
  const validateEvent = (data: EditableEventType): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.eventName?.trim()) {
      newErrors.eventName = "Event name is required";
    } else if (!/^[a-z]+\.[a-z_]+$/.test(data.eventName)) {
      newErrors.eventName =
        "Event name must be in format: category.action_name";
    }

    if (!data.category) {
      newErrors.category = "Category is required";
    }

    if (!data.description?.trim()) {
      newErrors.description = "Description is required";
    }

    // Validate JSON for availableVariables
    if (data.availableVariables) {
      try {
        if (typeof data.availableVariables === "string") {
          JSON.parse(data.availableVariables);
        }
      } catch (_e) {
        newErrors.availableVariables = "Invalid JSON format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save event (create or update)
  const handleSave = useCallback(async () => {
    if (!editData || !validateEvent(editData)) {
      return;
    }

    try {
      const eventData = {
        eventName: editData.eventName!,
        category: editData.category!,
        description: editData.description || "",
        availableVariables: editData.availableVariables || {},
        isActive: editData.isActive ?? true,
      };

      if (editData.isNew) {
        await createEvent.mutateAsync(eventData);
      } else {
        await updateEvent.mutateAsync({
          id: editData.id!,
          ...eventData,
        });
      }

      handleCancel();
    } catch (error) {
      console.error("Failed to save event:", error);
      setErrors({ submit: "Failed to save event. Please try again." });
    }
  }, [editData, createEvent, updateEvent, handleCancel]);

  // Delete event
  const handleDelete = useCallback(
    async (id: string) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this event type? Workflows using this event will no longer trigger.",
        )
      ) {
        return;
      }

      try {
        await deleteEvent.mutateAsync(id);
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    },
    [deleteEvent],
  );

  // Toggle event active status
  const handleToggleActive = useCallback(
    async (event: TriggerEventType) => {
      try {
        await updateEvent.mutateAsync({
          id: event.id,
          isActive: !event.isActive,
        });
      } catch (error) {
        console.error("Failed to toggle event status:", error);
      }
    },
    [updateEvent],
  );

  // Update edit data field
  const updateEditField = (field: keyof EditableEventType, value: any) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const { [field]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        Loading event types...
      </div>
    );
  }

  // Group events by category
  const groupedEvents = eventTypes.reduce(
    (acc, event) => {
      const category = event.category || "custom";
      if (!acc[category]) acc[category] = [];
      acc[category].push(event);
      return acc;
    },
    {} as Record<string, typeof eventTypes>,
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Event Type Management
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Define events that can trigger workflows
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={editingId === "new"}
          className="h-6 text-[10px]"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Event
        </Button>
      </div>

      {/* New Event Form */}
      {editingId === "new" && editData && (
        <div className="p-3 space-y-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
              Create New Event Type
            </h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                className="h-5 px-1.5 text-[10px]"
                disabled={createEvent.isPending}
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-5 px-1.5 text-[10px]"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Event Name
              </Label>
              <Input
                className={cn(
                  "h-6 text-[11px] border-zinc-200 dark:border-zinc-700",
                  errors.eventName && "border-red-400 dark:border-red-600",
                )}
                placeholder="category.action_name"
                value={editData.eventName}
                onChange={(e) => updateEditField("eventName", e.target.value)}
              />
              {errors.eventName && (
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                  {errors.eventName}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Category
              </Label>
              <Select
                value={editData.category}
                onValueChange={(value) => updateEditField("category", value)}
              >
                <SelectTrigger
                  className={cn(
                    "h-6 text-[11px] border-zinc-200 dark:border-zinc-700",
                    errors.category && "border-red-400 dark:border-red-600",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-[11px]">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
              Description
            </Label>
            <Input
              className={cn(
                "h-6 text-[11px] border-zinc-200 dark:border-zinc-700",
                errors.description && "border-red-400 dark:border-red-600",
              )}
              placeholder="Brief description of when this event fires"
              value={editData.description}
              onChange={(e) => updateEditField("description", e.target.value)}
            />
            {errors.description && (
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">
              Available Variables (JSON)
            </Label>
            <Textarea
              className={cn(
                "min-h-[60px] text-[11px] font-mono border-zinc-200 dark:border-zinc-700",
                errors.availableVariables &&
                  "border-red-400 dark:border-red-600",
              )}
              placeholder='{"userId": "UUID", "userName": "string"}'
              value={JSON.stringify(editData.availableVariables, null, 2)}
              onChange={(e) => {
                try {
                  updateEditField(
                    "availableVariables",
                    JSON.parse(e.target.value),
                  );
                } catch {
                  updateEditField("availableVariables", e.target.value);
                }
              }}
            />
            {errors.availableVariables && (
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                {errors.availableVariables}
              </p>
            )}
          </div>

          {errors.submit && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {errors.submit}
            </p>
          )}
        </div>
      )}

      {/* Event Categories */}
      {Object.entries(groupedEvents).map(([category, events]) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Badge
              className={cn("text-[10px] px-2 py-0", CATEGORY_COLORS[category])}
            >
              {category}
            </Badge>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="h-6 bg-zinc-50 dark:bg-zinc-800/50">
                  <TableHead className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Event Name
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Description
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Variables
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow
                    key={event.id}
                    className="h-8 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    {editingId === event.id && editData ? (
                      <>
                        <TableCell className="py-1">
                          <Input
                            className="h-5 text-[11px] border-zinc-200 dark:border-zinc-700"
                            value={editData.eventName}
                            onChange={(e) =>
                              updateEditField("eventName", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="py-1">
                          <Input
                            className="h-5 text-[11px] border-zinc-200 dark:border-zinc-700"
                            value={editData.description}
                            onChange={(e) =>
                              updateEditField("description", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="py-1">
                          <Textarea
                            className="h-5 text-[10px] font-mono p-1 border-zinc-200 dark:border-zinc-700"
                            value={JSON.stringify(
                              editData.availableVariables,
                              null,
                              0,
                            )}
                            onChange={(e) => {
                              try {
                                updateEditField(
                                  "availableVariables",
                                  JSON.parse(e.target.value),
                                );
                              } catch {
                                updateEditField(
                                  "availableVariables",
                                  e.target.value,
                                );
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center py-1">
                          <Switch
                            checked={editData.isActive ?? false}
                            onCheckedChange={(checked) =>
                              updateEditField("isActive", checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right py-1">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSave}
                              className="h-5 px-1"
                              disabled={updateEvent.isPending}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              className="h-5 px-1"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-[11px] font-mono">
                          <div className="flex items-center gap-1 text-zinc-900 dark:text-zinc-100">
                            <Zap className="h-3 w-3 text-amber-500" />
                            {event.eventName}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {event.description}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                          {event.availableVariables
                            ? Object.keys(event.availableVariables as object)
                                .length + " vars"
                            : "None"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(event)}
                            className={cn(
                              "h-5 px-1",
                              event.isActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-zinc-400 dark:text-zinc-500",
                            )}
                          >
                            {event.isActive ? (
                              <Power className="h-3 w-3" />
                            ) : (
                              <PowerOff className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(event)}
                              className="h-5 px-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(event.id)}
                              className="h-5 px-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
